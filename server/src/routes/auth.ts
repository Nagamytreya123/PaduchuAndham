import { Router } from 'express';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ensureGoogleStrategy, issueAuthCookie } from '../auth/google.js';
import { UserModel } from '../models/User.js';
const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authLimiter);

router.get('/google', (req, res, next) => {
  if (!ensureGoogleStrategy()) {
    res.status(503).json({ error: 'Google OAuth is not configured' });
    return;
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get(
  '/google/callback',
  (req, res, next) => {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      res.status(503).json({ error: 'Google OAuth is not configured' });
      return;
    }
    ensureGoogleStrategy();
    passport.authenticate('google', { session: false, failureRedirect: `${env.CLIENT_URL}/login?error=auth` })(
      req,
      res,
      next,
    );
  },
  (req, res) => {
    const u = req.user as { id: string; email: string; role: 'admin' | 'customer' } | undefined;
    if (!u) {
      res.redirect(`${env.CLIENT_URL}/login?error=user`);
      return;
    }
    const token = issueAuthCookie(u.id, u.role);
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    res.cookie(env.JWT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });
    const dest = u.role === 'admin' ? '/admin' : '/account';
    res.redirect(`${env.CLIENT_URL}${dest}`);
  },
);

router.post('/logout', (_req, res) => {
  res.clearCookie(env.JWT_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  if (!req.user) {
    res.json({ user: null });
    return;
  }
  const full = await UserModel.findById(req.user.id).lean();
  res.json({
    user: full
      ? {
          id: full._id.toString(),
          email: full.email,
          name: full.name,
          role: full.role,
          avatarUrl: full.avatarUrl,
        }
      : null,
  });
});

/** Dev-only: set cookie after seed without OAuth */
router.post('/dev-login', async (req, res) => {
  if (env.NODE_ENV === 'production') {
    res.status(404).end();
    return;
  }
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: 'email required' });
    return;
  }
  const user = await UserModel.findOne({ email: email.toLowerCase() }).lean();
  if (!user) {
    res.status(404).json({ error: 'User not found - run npm run seed' });
    return;
  }
  const token = issueAuthCookie(user._id.toString(), user.role as 'admin' | 'customer');
  res.cookie(env.JWT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
  res.json({
    ok: true,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

export default router;
