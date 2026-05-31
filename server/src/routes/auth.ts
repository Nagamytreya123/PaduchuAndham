import { Router, type Request, type Response } from 'express';
import passport from 'passport';
import { env, getAdminEmailSet } from '../config/env.js';
import { ensureGoogleStrategy, issueAuthCookie } from '../auth/google.js';
import { UserModel } from '../models/User.js';
import { authCookieOptions, clearAuthCookieOptions } from '../utils/authCookie.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { loadUserById } from '../cache/userLoader.js';
import { invalidateCachedUser, setCachedUser } from '../cache/session.js';

const router = Router();

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
    res.cookie(env.JWT_COOKIE_NAME, token, authCookieOptions(maxAge));
    const dest = u.role === 'admin' ? '/admin' : '/account';
    const bridge =
      `${env.CLIENT_URL.replace(/\/$/, '')}/login?` +
      new URLSearchParams({ celebrate: '1', redirect: dest }).toString();
    res.redirect(bridge);
  },
);

router.post('/logout', async (req, res) => {
  if (req.user?.id) {
    await invalidateCachedUser(req.user.id);
  }
  res.clearCookie(env.JWT_COOKIE_NAME, clearAuthCookieOptions());
  res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  if (!req.user) {
    res.json({ user: null });
    return;
  }
  const full = await loadUserById(req.user.id);
  res.json({
    user: full
      ? {
          id: full.id,
          email: full.email,
          name: full.name,
          role: full.role,
          avatarUrl: full.avatarUrl,
        }
      : null,
  });
});

const maxAgeMs = 7 * 24 * 60 * 60 * 1000;

function setSessionCookie(res: import('express').Response, userId: string, role: 'admin' | 'customer') {
  const token = issueAuthCookie(userId, role);
  res.cookie(env.JWT_COOKIE_NAME, token, authCookieOptions(maxAgeMs));
}

/** Email sign-in for returning customers (account must already exist). */
async function emailLogin(req: Request, res: Response) {
  const { email } = req.body as { email?: string };
  if (!email?.trim()) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  const normalized = email.toLowerCase().trim();
  const user = await UserModel.findOne({ email: normalized }).lean();
  if (!user) {
    res.status(404).json({ error: 'No account found with this email. Sign up to create one.' });
    return;
  }
  const id = user._id.toString();
  const role = user.role as 'admin' | 'customer';
  setSessionCookie(res, id, role);
  await setCachedUser({
    id,
    email: user.email,
    name: user.name,
    role,
    ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
  });
  res.json({
    ok: true,
    user: {
      id,
      email: user.email,
      name: user.name,
      role,
    },
  });
}

/** Email sign-up with optional display name. */
async function emailSignup(req: Request, res: Response) {
  const { email, name } = req.body as { email?: string; name?: string };
  if (!email?.trim()) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  const normalized = email.toLowerCase().trim();
  const existing = await UserModel.findOne({ email: normalized });
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists. Try signing in.' });
    return;
  }
  const adminEmails = getAdminEmailSet();
  const role = adminEmails.has(normalized) ? 'admin' : 'customer';
  const displayName = name?.trim() || normalized.split('@')[0] || 'Customer';
  const created = await UserModel.create({
    email: normalized,
    name: displayName,
    role,
  });
  const id = created._id.toString();
  setSessionCookie(res, id, role);
  await setCachedUser({
    id,
    email: created.email,
    name: created.name,
    role,
  });
  res.json({
    ok: true,
    user: {
      id,
      email: created.email,
      name: created.name,
      role,
    },
  });
}

router.post('/login', emailLogin);
router.post('/signup', emailSignup);
router.post('/dev-login', emailLogin);
router.post('/dev-signup', emailSignup);

export default router;
