import { UserModel } from '../models/User.js';
import { getCachedUser, setCachedUser, type CachedUser } from './session.js';

export async function loadUserById(userId: string): Promise<CachedUser | null> {
  const cached = await getCachedUser(userId);
  if (cached) return cached;

  const user = await UserModel.findById(userId).lean();
  if (!user) return null;

  const row: CachedUser = {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role as 'admin' | 'customer',
    ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
  };
  await setCachedUser(row);
  return row;
}
