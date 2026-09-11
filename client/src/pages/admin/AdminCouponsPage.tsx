import { useEffect, useMemo, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { alpha, useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import Divider from '@mui/material/Divider';
import { IconAdd, IconCoupon, IconDelete } from '../../icons';
import { apiFetch } from '../../api/client';
import type { AdminCoupon } from '../../types/coupon';
import { formatInrFromPaise } from '../../utils/format';
import { AdminLoadingPlaceholder } from '../../components/admin/AdminLoadingPlaceholder';
import {
  AdminPageHeader,
  DashboardCard,
  MotionButton,
  PageTransitionWrapper,
  PremiumModal,
} from '../../components/admin/premium';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { adminCardGridSx } from '../../constants/adminLayout';
import { useCategories } from '../../context/CategoriesContext';
import type { CatalogCategory } from '../../utils/catalogCategory';

type CouponDraft = {
  code: string;
  label: string;
  discountType: 'percent' | 'fixed';
  percentOff: string;
  fixedRupees: string;
  minCartRupees: string;
  maxDiscountRupees: string;
  perUserLimit: string;
  expiresAt: string;
  isActive: boolean;
  categorySlugs: string[];
};

function paiseToRupeeField(paise: number | null | undefined): string {
  if (paise == null) return '';
  const rupees = paise / 100;
  return Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2);
}

function parseRupeesToPaise(raw: string, field: string): number {
  const t = raw.trim();
  if (!t) throw new Error(`${field} is required`);
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${field} must be a valid amount`);
  return Math.round(n * 100);
}

function emptyDraft(): CouponDraft {
  return {
    code: '',
    label: '',
    discountType: 'percent',
    percentOff: '10',
    fixedRupees: '500',
    minCartRupees: '2000',
    maxDiscountRupees: '',
    perUserLimit: '',
    expiresAt: '',
    isActive: true,
    categorySlugs: [],
  };
}

function draftFromCoupon(coupon: AdminCoupon): CouponDraft {
  return {
    code: coupon.code,
    label: coupon.label,
    discountType: coupon.discountType,
    percentOff: coupon.percentOff != null ? String(coupon.percentOff) : '10',
    fixedRupees: paiseToRupeeField(coupon.fixedOffPaise),
    minCartRupees: paiseToRupeeField(coupon.minSubtotalPaise),
    maxDiscountRupees: paiseToRupeeField(coupon.maxDiscountPaise),
    perUserLimit: coupon.perUserLimit != null ? String(coupon.perUserLimit) : '',
    expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : '',
    isActive: coupon.isActive,
    categorySlugs: coupon.categorySlugs ?? [],
  };
}

function buildPayload(draft: CouponDraft) {
  const payload: Record<string, unknown> = {
    code: draft.code.trim(),
    label: draft.label.trim() || draft.code.trim(),
    discountType: draft.discountType,
    minSubtotalPaise: parseRupeesToPaise(draft.minCartRupees, 'Minimum cart value'),
    isActive: draft.isActive,
    perUserLimit: draft.perUserLimit.trim() ? Number(draft.perUserLimit) : null,
    expiresAt: draft.expiresAt.trim() ? new Date(draft.expiresAt).toISOString() : null,
    categorySlugs: draft.categorySlugs,
  };
  if (draft.discountType === 'percent') {
    const pct = Number(draft.percentOff);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) throw new Error('Percent must be 1–100');
    payload.percentOff = pct;
    payload.maxDiscountPaise = draft.maxDiscountRupees.trim()
      ? parseRupeesToPaise(draft.maxDiscountRupees, 'Max discount')
      : null;
  } else {
    payload.fixedOffPaise = parseRupeesToPaise(draft.fixedRupees, 'Fixed discount');
  }
  return payload;
}

export function AdminCouponsPage() {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const { categories } = useCategories();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CouponDraft>(emptyDraft);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function load() {
    const data = await apiFetch<{ coupons: AdminCoupon[] }>('/api/admin/coupons');
    setCoupons(data.coupons ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load coupons');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const editing = useMemo(
    () => (editId ? coupons.find((c) => c.id === editId) : undefined),
    [coupons, editId],
  );

  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  const selectedCategoryOptions = useMemo(
    () => activeCategories.filter((c) => draft.categorySlugs.includes(c.slug)),
    [activeCategories, draft.categorySlugs],
  );

  function categoryLabelsForSlugs(slugs: string[]): string[] {
    return slugs
      .map((slug) => activeCategories.find((c) => c.slug === slug)?.label ?? slug)
      .filter(Boolean);
  }

  function openCreate() {
    setEditId(null);
    setDraft(emptyDraft());
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(coupon: AdminCoupon) {
    setEditId(coupon.id);
    setDraft(draftFromCoupon(coupon));
    setError(null);
    setDialogOpen(true);
  }

  async function saveCoupon() {
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload(draft);
      if (editId) {
        await apiFetch(`/api/admin/coupons/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/admin/coupons', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      await load();
      setDialogOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save coupon');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(coupon: AdminCoupon) {
    setTogglingId(coupon.id);
    setError(null);
    try {
      await apiFetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update coupon');
    } finally {
      setTogglingId(null);
    }
  }

  async function removeCoupon(id: string) {
    if (!window.confirm('Delete this coupon? This cannot be undone.')) return;
    setError(null);
    try {
      await apiFetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete coupon');
    }
  }

  if (loading) return <AdminLoadingPlaceholder variant="grid" />;

  return (
    <PageTransitionWrapper>
      <Stack spacing={2.5} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <AdminPageHeader
        title="Coupons"
        description="Create percentage or fixed discounts with minimum cart thresholds."
        actions={
          <MotionButton variant="contained" startIcon={<IconAdd />} onClick={openCreate}>
            New coupon
          </MotionButton>
        }
      />

      {error && !dialogOpen && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DashboardCard sx={{ mb: 3, p: 2.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: 'primary.main',
            }}
          >
            <IconCoupon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {coupons.filter((c) => c.isActive).length} active
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Customers see unlock hints on cart and checkout when they are close to a minimum.
            </Typography>
          </Box>
        </Stack>
      </DashboardCard>

      {coupons.length === 0 ? (
        <DashboardCard sx={{ p: 3 }}>
          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No coupons yet. Create your first offer to delight shoppers.
          </Typography>
        </DashboardCard>
      ) : (
        <Box
          sx={{
            ...adminCardGridSx,
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              md: 'repeat(2, minmax(0, 1fr))',
            },
          }}
        >
          {coupons.map((coupon, index) => (
            <motion.div
              key={coupon.id}
              style={{ minWidth: 0 }}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : index * 0.05 }}
            >
            <DashboardCard
              sx={{
                position: 'relative',
                overflow: 'hidden',
                opacity: coupon.isActive ? 1 : 0.72,
                height: '100%',
                p: 2.5,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 50%)`,
                  pointerEvents: 'none',
                }}
              />
              <Stack spacing={2} sx={{ position: 'relative', flex: 1 }}>
                <Stack
                  direction="row"
                  alignItems="flex-start"
                  justifyContent="space-between"
                  spacing={1.5}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="h6"
                      fontWeight={800}
                      sx={{ letterSpacing: '0.05em', lineHeight: 1.25, wordBreak: 'break-word' }}
                    >
                      {coupon.code}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                      {coupon.label}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.25} alignItems="center" sx={{ flexShrink: 0, mt: -0.5 }}>
                    <Button size="small" onClick={() => openEdit(coupon)} sx={{ minWidth: 0, px: 1 }}>
                      Edit
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label="Delete coupon"
                      onClick={() => void removeCoupon(coupon.id)}
                    >
                      <IconDelete fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>

                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flex: 1, minWidth: 0 }}>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Min cart ${formatInrFromPaise(coupon.minSubtotalPaise)}`}
                    />
                    {coupon.perUserLimit != null && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={
                          coupon.perUserLimit === 1
                            ? '1 use per customer'
                            : `${coupon.perUserLimit} uses per customer`
                        }
                      />
                    )}
                    {coupon.expiresAt && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Expires ${new Date(coupon.expiresAt).toLocaleDateString()}`}
                      />
                    )}
                    {coupon.categorySlugs.length > 0 ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={categoryLabelsForSlugs(coupon.categorySlugs).join(', ')}
                      />
                    ) : (
                      <Chip size="small" variant="outlined" label="All categories" />
                    )}
                  </Stack>
                  <Chip
                    size="small"
                    label={coupon.discountLabel}
                    color="primary"
                    sx={{ fontWeight: 700, flexShrink: 0 }}
                  />
                </Stack>

                <Divider sx={{ borderColor: alpha(theme.palette.primary.main, 0.1) }} />

                <FormControlLabel
                  sx={{ ml: 0, mr: 0, alignSelf: 'flex-start' }}
                  control={
                    <Switch
                      size="small"
                      checked={coupon.isActive}
                      disabled={togglingId === coupon.id}
                      onChange={() => void toggleActive(coupon)}
                    />
                  }
                  label={coupon.isActive ? 'Active' : 'Paused'}
                />
              </Stack>
            </DashboardCard>
            </motion.div>
          ))}
        </Box>
      )}

      <PremiumModal open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editing ? `Edit ${editing.code}` : 'Create coupon'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && dialogOpen && (
              <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
            )}
            <TextField
              label="Coupon code"
              value={draft.code}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
              inputProps={{ style: { letterSpacing: '0.08em', fontWeight: 700 } }}
              fullWidth
              required
            />
            <TextField
              label="Display label"
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              placeholder="e.g. Festive savings"
              fullWidth
            />
            <TextField
              select
              label="Discount type"
              value={draft.discountType}
              onChange={(e) =>
                setDraft((d) => ({ ...d, discountType: e.target.value as 'percent' | 'fixed' }))
              }
              fullWidth
            >
              <MenuItem value="percent">Percentage off</MenuItem>
              <MenuItem value="fixed">Fixed amount off</MenuItem>
            </TextField>
            {draft.discountType === 'percent' ? (
              <>
                <TextField
                  label="Percent off"
                  type="number"
                  value={draft.percentOff}
                  onChange={(e) => setDraft((d) => ({ ...d, percentOff: e.target.value }))}
                  inputProps={{ min: 1, max: 100 }}
                  fullWidth
                />
                <TextField
                  label="Max discount (₹, optional)"
                  value={draft.maxDiscountRupees}
                  onChange={(e) => setDraft((d) => ({ ...d, maxDiscountRupees: e.target.value }))}
                  fullWidth
                  helperText="Caps the discount for large carts"
                />
              </>
            ) : (
              <TextField
                label="Fixed discount (₹)"
                value={draft.fixedRupees}
                onChange={(e) => setDraft((d) => ({ ...d, fixedRupees: e.target.value }))}
                fullWidth
                required
              />
            )}
            <TextField
              label="Minimum cart value (₹)"
              value={draft.minCartRupees}
              onChange={(e) => setDraft((d) => ({ ...d, minCartRupees: e.target.value }))}
              fullWidth
              required
              helperText="Minimum eligible category subtotal. Customers see “shop more” until they reach this amount."
            />
            <Autocomplete
              multiple
              disableCloseOnSelect
              options={activeCategories}
              value={selectedCategoryOptions}
              onChange={(_e, value: CatalogCategory[]) =>
                setDraft((d) => ({ ...d, categorySlugs: value.map((c) => c.slug) }))
              }
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(a, b) => a.slug === b.slug}
              renderOption={(props, option, { selected }) => (
                <li {...props} key={option.slug}>
                  <Checkbox size="small" sx={{ mr: 1 }} checked={selected} />
                  {option.label}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Applies to categories"
                  helperText="Select one or more categories. Leave empty to allow all categories."
                />
              )}
            />
            <TextField
              label="Uses per customer (optional)"
              type="number"
              value={draft.perUserLimit}
              onChange={(e) => setDraft((d) => ({ ...d, perUserLimit: e.target.value }))}
              fullWidth
              helperText="How many times each customer can redeem this code. Leave blank for unlimited."
            />
            <TextField
              label="Expires at (optional)"
              type="datetime-local"
              value={draft.expiresAt}
              onChange={(e) => setDraft((d) => ({ ...d, expiresAt: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={draft.isActive}
                  onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                />
              }
              label="Active on storefront"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
          <MotionButton variant="contained" onClick={() => void saveCoupon()} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create coupon'}
          </MotionButton>
        </DialogActions>
      </PremiumModal>
      </Stack>
    </PageTransitionWrapper>
  );
}
