import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { UserModel, type UserDoc } from '../models/User.js';

const MAX_SAVED_ADDRESSES = 10;

const mobileSchema = z
  .string()
  .trim()
  .min(10, 'Enter a valid mobile number')
  .max(20)
  .regex(/^[\d+\s-]+$/, 'Mobile should contain digits (and optional + / spaces)');

const addressBodySchema = z.object({
  label: z.string().min(1).max(80),
  recipientName: z.string().min(1).max(120),
  recipientMobile: mobileSchema,
  line1: z.string().min(1).max(300),
  line2: z.string().max(300).optional(),
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(120),
  postalCode: z.string().min(1).max(20),
  country: z.string().max(4).optional(),
  isDefault: z.boolean().optional(),
});

const addressPatchSchema = addressBodySchema.partial();

type AddrSub = UserDoc['savedAddresses'] extends (infer U)[] | undefined ? U : never;

function serializeAddress(a: {
  _id: Types.ObjectId;
  label: string;
  recipientName?: string | null;
  recipientMobile?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string | null;
  isDefault?: boolean | null;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: a._id.toString(),
    label: a.label,
    recipientName: (a.recipientName ?? '').trim(),
    recipientMobile: (a.recipientMobile ?? '').trim(),
    line1: a.line1,
    line2: a.line2 ?? '',
    city: a.city,
    state: a.state,
    postalCode: a.postalCode,
    country: a.country ?? 'IN',
    isDefault: !!a.isDefault,
    createdAt: a.createdAt?.toISOString?.(),
    updatedAt: a.updatedAt?.toISOString?.(),
  };
}

function clearAllDefaults(user: HydratedDocument<UserDoc>) {
  for (const a of user.savedAddresses) {
    a.set('isDefault', false);
  }
}

const router = Router();
router.use(requireAuth);

router.get('/addresses', async (req, res) => {
  const user = await UserModel.findById(req.user!.id).lean();
  if (!user) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const raw = user.savedAddresses ?? [];
  const list = raw.map((a) => serializeAddress(a as AddrSub & { _id: Types.ObjectId }));
  list.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  res.json({ addresses: list });
});

router.post('/addresses', async (req, res) => {
  let body: z.infer<typeof addressBodySchema>;
  try {
    body = addressBodySchema.parse(req.body);
  } catch {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }
  const user = await UserModel.findById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const arr = user.savedAddresses;
  if (arr.length >= MAX_SAVED_ADDRESSES) {
    res.status(400).json({ error: `You can save at most ${MAX_SAVED_ADDRESSES} addresses` });
    return;
  }
  const makeDefault = body.isDefault === true || arr.length === 0;
  if (makeDefault) clearAllDefaults(user);
  user.savedAddresses.push({
    label: body.label.trim(),
    recipientName: body.recipientName.trim(),
    recipientMobile: body.recipientMobile.replace(/\s/g, ''),
    line1: body.line1.trim(),
    line2: body.line2?.trim() ?? '',
    city: body.city.trim(),
    state: body.state.trim(),
    postalCode: body.postalCode.trim(),
    country: body.country?.trim() || 'IN',
    isDefault: makeDefault,
  });
  await user.save();
  const created = user.savedAddresses[user.savedAddresses.length - 1]!;
  res.status(201).json({ address: serializeAddress(created) });
});

router.patch('/addresses/:addressId', async (req, res) => {
  const id = req.params.addressId;
  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'Invalid address id' });
    return;
  }
  let body: z.infer<typeof addressPatchSchema>;
  try {
    body = addressPatchSchema.parse(req.body);
  } catch {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }
  const user = await UserModel.findById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const sub = user.savedAddresses.id(new Types.ObjectId(id));
  if (!sub) {
    res.status(404).json({ error: 'Address not found' });
    return;
  }
  if (body.label != null) sub.set('label', body.label.trim());
  if (body.recipientName != null) sub.set('recipientName', body.recipientName.trim());
  if (body.recipientMobile != null) sub.set('recipientMobile', body.recipientMobile.replace(/\s/g, ''));
  if (body.line1 != null) sub.set('line1', body.line1.trim());
  if (body.line2 !== undefined) sub.set('line2', body.line2?.trim() ?? '');
  if (body.city != null) sub.set('city', body.city.trim());
  if (body.state != null) sub.set('state', body.state.trim());
  if (body.postalCode != null) sub.set('postalCode', body.postalCode.trim());
  if (body.country != null) sub.set('country', body.country.trim() || 'IN');
  if (body.isDefault === true) {
    clearAllDefaults(user);
    sub.set('isDefault', true);
  } else if (body.isDefault === false && sub.isDefault) {
    const others = user.savedAddresses.filter((x) => String(x._id) !== String(sub._id));
    if (others.length > 0) {
      clearAllDefaults(user);
      sub.set('isDefault', false);
      others[0]!.set('isDefault', true);
    }
  }
  await user.save();
  res.json({ address: serializeAddress(sub) });
});

router.delete('/addresses/:addressId', async (req, res) => {
  const id = req.params.addressId;
  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'Invalid address id' });
    return;
  }
  const oid = new Types.ObjectId(id);
  const user = await UserModel.findById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const sub = user.savedAddresses.id(oid);
  if (!sub) {
    res.status(404).json({ error: 'Address not found' });
    return;
  }
  const wasDefault = !!sub.isDefault;
  sub.deleteOne();
  await user.save();
  if (wasDefault && user.savedAddresses.length > 0) {
    clearAllDefaults(user);
    user.savedAddresses[0]!.set('isDefault', true);
    await user.save();
  }
  res.json({ ok: true });
});

router.post('/addresses/:addressId/set-default', async (req, res) => {
  const id = req.params.addressId;
  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'Invalid address id' });
    return;
  }
  const user = await UserModel.findById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const sub = user.savedAddresses.id(new Types.ObjectId(id));
  if (!sub) {
    res.status(404).json({ error: 'Address not found' });
    return;
  }
  clearAllDefaults(user);
  sub.set('isDefault', true);
  await user.save();
  res.json({ address: serializeAddress(sub) });
});

export default router;
