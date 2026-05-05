import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env, getAdminEmailSet } from '../config/env.js';
import { UserModel } from '../models/User.js';
import { signToken } from '../utils/jwt.js';

let googleConfigured = false;

/** Register Google strategy once. Callback URL must match Google Cloud console (CLIENT_URL for Vite proxy). */
export function ensureGoogleStrategy(): boolean {
  const id = env.GOOGLE_CLIENT_ID;
  const secret = env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) {
    return false;
  }
  if (googleConfigured) return true;

  const callbackURL = `${env.CLIENT_URL.replace(/\/$/, '')}/api/auth/google/callback`;

  passport.use(
    new GoogleStrategy(
      {
        clientID: id,
        clientSecret: secret,
        callbackURL,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            done(new Error('No email from Google'));
            return;
          }
          const name = profile.displayName || email;
          const googleId = profile.id;
          const adminEmails = getAdminEmailSet();

          let user = await UserModel.findOne({ $or: [{ googleId }, { email }] });
          if (!user) {
            const role = adminEmails.has(email) ? 'admin' : 'customer';
            user = await UserModel.create({
              email,
              name,
              googleId,
              role,
              avatarUrl: profile.photos?.[0]?.value,
            });
          } else {
            user.googleId = googleId;
            user.name = name;
            user.avatarUrl = profile.photos?.[0]?.value;
            if (adminEmails.has(email) && user.role !== 'admin') {
              user.role = 'admin';
            }
            await user.save();
          }
          done(null, {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role as 'admin' | 'customer',
          });
        } catch (err) {
          done(err as Error);
        }
      },
    ),
  );

  googleConfigured = true;
  return true;
}

export function issueAuthCookie(userId: string, role: 'admin' | 'customer'): string {
  return signToken({ sub: userId, role });
}
