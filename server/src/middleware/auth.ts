import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { verifyToken } from '../utils/jwt.js';
import { UserModel } from '../models/User.js';

function readToken(req: Request): string | undefined {
  const cookieName = env.JWT_COOKIE_NAME;
  const fromCookie = req.cookies?.[cookieName as keyof typeof req.cookies] as string | undefined;
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return fromCookie;
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    const user = await UserModel.findById(payload.sub).lean();
    if (!user) return next();
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role as 'admin' | 'customer',
    };
  } catch {
    /* ignore invalid token */
  }
  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const payload = verifyToken(token);
    const user = await UserModel.findById(payload.sub).lean();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role as 'admin' | 'customer',
    };
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requireRole(role: 'admin' | 'customer') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (req.user.role !== role && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}

/** Admin-only routes */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}
