import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export type AuthJwtClaims = {
  sub: string;
  role: 'customer' | 'admin';
};

export function signToken(payload: AuthJwtClaims): string {
  return jwt.sign({ sub: payload.sub, role: payload.role }, env.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthJwtClaims {
  const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload & { role?: string };
  const sub = decoded.sub;
  const role = decoded.role;
  if (!sub || (role !== 'customer' && role !== 'admin')) {
    throw new Error('Invalid token payload');
  }
  return { sub, role };
}
