import { useEffect, useMemo, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Chip from '@mui/material/Chip';
import { IconAdd, IconDelete } from '../../icons';
import { apiFetch } from '../../api/client';
import { useCategories } from '../../context/CategoriesContext';
import type { CatalogCategory, CatalogPriceFilter } from '../../utils/catalogCategory';
import { formatInrFromPaise } from '../../utils/format';
import { PRODUCT_IMAGE_FALLBACK, resolveMediaUrl } from '../../utils/productImage';
import { AdminLoadingPlaceholder } from '../../components/admin/AdminLoadingPlaceholder';
import {
  AdminPageHeader,
  DashboardCard,
  MotionButton,
  PageTransitionWrapper,
  PremiumModal,
} from '../../components/admin/premium';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { adminCardGridSx } from '../../constants/adminLayout';

type FilterDraft = {
  key: string;
  id?: string;
  label: string;
  minRupee: string;
  maxRupee: string;
  appliesTo: string;
};

type SubcategoryDraft = {
  key: string;
  name: string;
  editing: boolean;
  originalName?: string;
};

function paiseToRupeeField(paise: number | null): string {
  if (paise == null) return '';
  const rupees = paise / 100;
  return Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2);
}

function parseRupeesToPaise(raw: string, field: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${field} must be a valid amount in rupees`);
  }
  return Math.round(n * 100);
}

function draftsFromFilters(filters: CatalogPriceFilter[]): FilterDraft[] {
  return filters.map((f, i) => ({
    key: f.id || `row-${i}`,
    id: f.id,
    label: f.label,
    minRupee: paiseToRupeeField(f.minPaise),
    maxRupee: paiseToRupeeField(f.maxPaise),
    appliesTo: f.subcategory ?? '',
  }));
}

function emptyDraft(): FilterDraft {
  return {
    key: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: '',
    minRupee: '',
    maxRupee: '',
    appliesTo: '',
  };
}

function normalizeAdminCategory(c: CatalogCategory): CatalogCategory {
  return {
    ...c,
    priceFilters: c.priceFilters ?? [],
    priceFiltersEnabled: c.priceFiltersEnabled !== false,
    isCombo: c.isCombo === true,
    isActive: c.isActive !== false,
    subcategories: c.subcategories ?? [],
    tileImageUrl: c.tileImageUrl ?? '',
  };
}

async function postImage(slug: string, file: File): Promise<void> {
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch(`/api/admin/categories/${encodeURIComponent(slug)}/image`, {
    method: 'POST',
    body: fd,
    credentials: 'include',
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error || 'Image upload failed');
}

export function AdminCategoriesPage() {
  const reduced = useReducedMotion();
  const { refresh } = useCategories();
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [filters, setFilters] = useState<FilterDraft[]>([]);
  const [priceFiltersEnabled, setPriceFiltersEnabled] = useState(true);
  const [isCombo, setIsCombo] = useState(false);
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);

  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [subCategorySlug, setSubCategorySlug] = useState<string | null>(null);
  const [subDrafts, setSubDrafts] = useState<SubcategoryDraft[]>([]);
  const [newSubName, setNewSubName] = useState('');
  const [subSaving, setSubSaving] = useState(false);

  async function loadAdmin() {
    const data = await apiFetch<{ categories: CatalogCategory[] }>('/api/admin/categories');
    setCategories((data.categories ?? []).map(normalizeAdminCategory));
  }

  async function reloadStorefront(removedProductIds?: string[]) {
    await refresh(removedProductIds ? { removedProductIds } : undefined);
    await loadAdmin();
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await loadAdmin();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load categories');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const editing = useMemo(
    () => (editSlug ? categories.find((c) => c.slug === editSlug) : undefined),
    [categories, editSlug],
  );

  const subManaging = useMemo(
    () => (subCategorySlug ? categories.find((c) => c.slug === subCategorySlug) : undefined),
    [categories, subCategorySlug],
  );

  function openSubcategories(cat: CatalogCategory) {
    setSubCategorySlug(cat.slug);
    setSubDrafts(
      (cat.subcategories ?? []).map((name, i) => ({
        key: `sub-${i}-${name}`,
        name,
        editing: false,
      })),
    );
    setNewSubName('');
    setError(null);
    setSubDialogOpen(true);
  }

  function openCreate() {
    setEditSlug(null);
    setLabel('');
    setImageFile(null);
    setImagePreview('');
    setFilters([]);
    setPriceFiltersEnabled(true);
    setIsCombo(false);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(cat: CatalogCategory) {
    setEditSlug(cat.slug);
    setLabel(cat.label);
    setImageFile(null);
    setImagePreview(cat.tileImageUrl);
    setFilters(draftsFromFilters(cat.priceFilters ?? []));
    setPriceFiltersEnabled(cat.priceFiltersEnabled !== false);
    setIsCombo(cat.isCombo === true);
    setError(null);
    setDialogOpen(true);
  }

  async function save() {
    setError(null);
    const name = label.trim();
    if (name.length < 2) {
      setError('Enter a category name');
      return;
    }
    setSaving(true);
    try {
      const priceFilters = filters.map((row, i) => {
        const minPaise = parseRupeesToPaise(row.minRupee, `Price filter ${i + 1} min`);
        const maxPaise = parseRupeesToPaise(row.maxRupee, `Price filter ${i + 1} max`);
        const rowLabel = row.label.trim() || defaultPriceLabel(minPaise, maxPaise);
        return {
          id: row.id,
          label: rowLabel,
          minPaise,
          maxPaise,
          subcategory: row.appliesTo.trim() || null,
        };
      });

      let slug = editSlug;
      if (!slug) {
        const data = await apiFetch<{ category: CatalogCategory }>('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: name }),
        });
        slug = data.category.slug;
      } else {
        await apiFetch(`/api/admin/categories/${encodeURIComponent(slug)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: name, priceFilters, priceFiltersEnabled, isCombo }),
        });
      }

      if (imageFile && slug) {
        await postImage(slug, imageFile);
      }

      if (!editSlug && slug) {
        await apiFetch(`/api/admin/categories/${encodeURIComponent(slug)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceFilters, priceFiltersEnabled, isCombo }),
        });
      }

      await reloadStorefront();
      setDialogOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save category');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStorefront(cat: CatalogCategory, visible: boolean) {
    setError(null);
    setTogglingSlug(cat.slug);
    try {
      await apiFetch(`/api/admin/categories/${encodeURIComponent(cat.slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: visible }),
      });
      await reloadStorefront();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update category visibility');
    } finally {
      setTogglingSlug(null);
    }
  }

  async function toggleComboCategory(cat: CatalogCategory, enabled: boolean) {
    setError(null);
    setTogglingSlug(cat.slug);
    try {
      await apiFetch(`/api/admin/categories/${encodeURIComponent(cat.slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCombo: enabled }),
      });
      await reloadStorefront();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update combo setting');
    } finally {
      setTogglingSlug(null);
    }
  }

  async function togglePriceFilters(cat: CatalogCategory, enabled: boolean) {
    setError(null);
    setTogglingSlug(cat.slug);
    try {
      await apiFetch(`/api/admin/categories/${encodeURIComponent(cat.slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceFiltersEnabled: enabled }),
      });
      await reloadStorefront();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update price filter visibility');
    } finally {
      setTogglingSlug(null);
    }
  }

  async function addSubcategory() {
    if (!subCategorySlug) return;
    const label = newSubName.trim();
    if (label.length < 2) {
      setError('Enter a subcategory name (at least 2 characters)');
      return;
    }
    setError(null);
    setSubSaving(true);
    try {
      const data = await apiFetch<{ category: CatalogCategory }>(
        `/api/admin/categories/${encodeURIComponent(subCategorySlug)}/subcategories`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label }),
        },
      );
      setCategories((rows) =>
        rows.map((c) => (c.slug === subCategorySlug ? normalizeAdminCategory(data.category) : c)),
      );
      setSubDrafts(
        (data.category.subcategories ?? []).map((name, i) => ({
          key: `sub-${i}-${name}`,
          name,
          editing: false,
        })),
      );
      setNewSubName('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add subcategory');
    } finally {
      setSubSaving(false);
    }
  }

  async function saveSubcategoryEdit(draft: SubcategoryDraft) {
    if (!subCategorySlug || !draft.originalName) return;
    const label = draft.name.trim();
    if (label.length < 2) {
      setError('Enter a subcategory name (at least 2 characters)');
      return;
    }
    if (label.toLowerCase() === draft.originalName.toLowerCase()) {
      setSubDrafts((rows) =>
        rows.map((r) =>
          r.key === draft.key ? { ...r, name: draft.originalName!, editing: false, originalName: undefined } : r,
        ),
      );
      return;
    }
    setError(null);
    setSubSaving(true);
    try {
      const data = await apiFetch<{ category: CatalogCategory }>(
        `/api/admin/categories/${encodeURIComponent(subCategorySlug)}/subcategories/${encodeURIComponent(draft.originalName)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label }),
        },
      );
      setCategories((rows) =>
        rows.map((c) => (c.slug === subCategorySlug ? normalizeAdminCategory(data.category) : c)),
      );
      setSubDrafts(
        (data.category.subcategories ?? []).map((name, i) => ({
          key: `sub-${i}-${name}`,
          name,
          editing: false,
        })),
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not rename subcategory');
    } finally {
      setSubSaving(false);
    }
  }

  async function removeSubcategory(name: string) {
    if (!subCategorySlug) return;
    if (!window.confirm(`Remove subcategory “${name}”? Products using it will have their subcategory cleared.`)) {
      return;
    }
    setError(null);
    setSubSaving(true);
    try {
      const data = await apiFetch<{ category: CatalogCategory }>(
        `/api/admin/categories/${encodeURIComponent(subCategorySlug)}/subcategories/${encodeURIComponent(name)}`,
        { method: 'DELETE' },
      );
      setCategories((rows) =>
        rows.map((c) => (c.slug === subCategorySlug ? normalizeAdminCategory(data.category) : c)),
      );
      setSubDrafts(
        (data.category.subcategories ?? []).map((subName, i) => ({
          key: `sub-${i}-${subName}`,
          name: subName,
          editing: false,
        })),
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete subcategory');
    } finally {
      setSubSaving(false);
    }
  }

  async function removeCategory(cat: CatalogCategory) {
    const count = cat.productCount;
    const productNote =
      count > 0
        ? ` This also permanently deletes ${count} product${count === 1 ? '' : 's'} in this category.`
        : '';
    if (
      !window.confirm(
        `Permanently delete “${cat.label}” from the database?${productNote} This cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      const data = await apiFetch<{ deletedProductIds?: string[] }>(
        `/api/admin/categories/${encodeURIComponent(cat.slug)}`,
        { method: 'DELETE' },
      );
      await reloadStorefront(data.deletedProductIds ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  if (loading) return <AdminLoadingPlaceholder variant="grid" />;

  return (
    <PageTransitionWrapper>
      <Stack spacing={2.5} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <AdminPageHeader
          title="Categories"
          description="Hide a category from customers without deleting it, or delete it (and its products) permanently. Hidden categories stay here so you can switch them back on."
          actions={
            <MotionButton variant="contained" onClick={openCreate}>
              New category
            </MotionButton>
          }
        />

        {error && !dialogOpen ? (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        <Box sx={adminCardGridSx}>
          {categories.map((c) => {
            const thumb = resolveMediaUrl(c.tileImageUrl) || PRODUCT_IMAGE_FALLBACK;
            return (
              <motion.div
                key={c.slug}
                style={{ minWidth: 0 }}
                initial={reduced ? false : { opacity: 0, y: 16, filter: 'blur(6px)' }}
                whileInView={reduced ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '-10%' }}
                transition={{ duration: reduced ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <DashboardCard sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 0, overflow: 'hidden' }}>
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      image={thumb}
                      alt=""
                      sx={{
                        aspectRatio: '4/3',
                        objectFit: 'cover',
                        bgcolor: 'grey.900',
                        minHeight: 140,
                        opacity: c.isActive === false ? 0.45 : 1,
                      }}
                    />
                    {c.isActive === false ? (
                      <Chip
                        label="Hidden from shop"
                        size="small"
                        sx={{ position: 'absolute', top: 8, left: 8, fontWeight: 700 }}
                      />
                    ) : null}
                  </Box>
                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, p: 2.5 }}>
                    <Typography variant="subtitle1" fontWeight={800}>
                      {c.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.productCount} product{c.productCount === 1 ? '' : 's'}
                      {(c.subcategories ?? []).length > 0
                        ? ` · ${c.subcategories.length} subcategor${c.subcategories.length === 1 ? 'y' : 'ies'}`
                        : ''}
                      {c.priceFilters.length > 0
                        ? ` · ${c.priceFilters.length} price filter${c.priceFilters.length === 1 ? '' : 's'}`
                        : ''}
                      {c.isCombo ? ' · combo category' : ''}
                      {c.priceFiltersEnabled === false ? ' · price filters off' : ''}
                    </Typography>
                    <FormControlLabel
                      sx={{ ml: 0, mt: 0.5 }}
                      control={
                        <Switch
                          size="small"
                          checked={c.isActive !== false}
                          disabled={togglingSlug === c.slug || saving}
                          onChange={(_e, checked) => void toggleStorefront(c, checked)}
                        />
                      }
                      label="Show to customers"
                    />
                    <FormControlLabel
                      sx={{ ml: 0 }}
                      control={
                        <Switch
                          size="small"
                          checked={c.isCombo === true}
                          disabled={togglingSlug === c.slug || saving}
                          onChange={(_e, checked) => void toggleComboCategory(c, checked)}
                        />
                      }
                      label="Combo category"
                    />
                    <FormControlLabel
                      sx={{ ml: 0 }}
                      control={
                        <Switch
                          size="small"
                          checked={c.priceFiltersEnabled !== false}
                          disabled={togglingSlug === c.slug || saving || c.isActive === false}
                          onChange={(_e, checked) => void togglePriceFilters(c, checked)}
                        />
                      }
                      label="Show price filters"
                    />
                    <Stack direction="row" gap={1} sx={{ mt: 'auto' }} flexWrap="wrap">
                      <Button size="small" variant="outlined" onClick={() => openEdit(c)} sx={{ cursor: 'pointer' }}>
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openSubcategories(c)}
                        sx={{ cursor: 'pointer' }}
                      >
                        Subcategories
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => void removeCategory(c)}
                        sx={{ cursor: 'pointer' }}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </CardContent>
                </DashboardCard>
              </motion.div>
            );
          })}
        </Box>
      </Stack>

      <PremiumModal open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>{editSlug ? 'Edit category' : 'New category'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField
              label="Category name"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              fullWidth
              required
              disabled={saving}
            />
            <Button variant="outlined" component="label" disabled={saving} sx={{ cursor: 'pointer', justifyContent: 'flex-start' }}>
              {imageFile ? 'Replace category image' : 'Upload category image'}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setImageFile(file);
                  if (file) setImagePreview(URL.createObjectURL(file));
                  e.target.value = '';
                }}
              />
            </Button>
            {imagePreview ? (
              <Box
                component="img"
                src={imageFile ? imagePreview : resolveMediaUrl(imagePreview) || PRODUCT_IMAGE_FALLBACK}
                alt=""
                sx={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 1 }}
              />
            ) : (
              <Typography variant="caption" color="text.secondary">
                This image is shown on Shop by categories. Without one, customers see a plain placeholder.
              </Typography>
            )}

            <FormControlLabel
              control={
                <Switch checked={isCombo} disabled={saving} onChange={(_e, checked) => setIsCombo(checked)} />
              }
              label="Combo category"
            />
            <Typography variant="caption" color="text.secondary">
              Combo categories let you create product sets that add all linked items to the cart at one price.
            </Typography>
            <Divider />
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
              <Typography variant="subtitle2" fontWeight={700}>
                Price filters
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={priceFiltersEnabled}
                    disabled={saving}
                    onChange={(_e, checked) => setPriceFiltersEnabled(checked)}
                  />
                }
                label="Show on shop"
              />
            </Stack>
            <Stack direction="row" alignItems="center" justifyContent="flex-end">
              <Button
                size="small"
                startIcon={<IconAdd />}
                onClick={() => setFilters((rows) => [...rows, emptyDraft()])}
                disabled={saving}
                sx={{ cursor: 'pointer' }}
              >
                Add filter
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Shown under category chips for customers. Apply a band to the whole category or to one subcategory.
              Amounts are in rupees; leave min or max blank for open-ended ranges.
            </Typography>
            {filters.map((row, index) => (
              <Stack
                key={row.key}
                spacing={1.25}
                sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="caption" fontWeight={700}>
                    Filter {index + 1}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label="Remove price filter"
                    onClick={() => setFilters((rows) => rows.filter((r) => r.key !== row.key))}
                    disabled={saving}
                    sx={{ cursor: 'pointer' }}
                  >
                    <IconDelete fontSize="small" />
                  </IconButton>
                </Stack>
                <TextField
                  label="Applies to"
                  value={row.appliesTo}
                  onChange={(e) =>
                    setFilters((rows) =>
                      rows.map((r) => (r.key === row.key ? { ...r, appliesTo: e.target.value } : r)),
                    )
                  }
                  fullWidth
                  disabled={saving}
                  placeholder="Whole category"
                  helperText={
                    (editing?.subcategories ?? []).length > 0
                      ? `Leave blank for the whole category, or match a type such as: ${editing!.subcategories.join(', ')}`
                      : 'Leave blank for the whole category, or type a subcategory name.'
                  }
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    label="Min (INR)"
                    value={row.minRupee}
                    onChange={(e) =>
                      setFilters((rows) =>
                        rows.map((r) => (r.key === row.key ? { ...r, minRupee: e.target.value } : r)),
                      )
                    }
                    fullWidth
                    disabled={saving}
                    placeholder="No minimum"
                  />
                  <TextField
                    label="Max (INR)"
                    value={row.maxRupee}
                    onChange={(e) =>
                      setFilters((rows) =>
                        rows.map((r) => (r.key === row.key ? { ...r, maxRupee: e.target.value } : r)),
                      )
                    }
                    fullWidth
                    disabled={saving}
                    placeholder="No maximum"
                  />
                </Stack>
                <TextField
                  label="Chip label"
                  value={row.label}
                  onChange={(e) =>
                    setFilters((rows) =>
                      rows.map((r) => (r.key === row.key ? { ...r, label: e.target.value } : r)),
                    )
                  }
                  fullWidth
                  disabled={saving}
                  helperText="Leave blank to auto-name from the range"
                />
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ cursor: 'pointer' }}>
            Cancel
          </Button>
          <MotionButton variant="contained" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </MotionButton>
        </DialogActions>
      </PremiumModal>

      <PremiumModal
        open={subDialogOpen}
        onClose={() => !subSaving && setSubDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Subcategories{subManaging ? ` — ${subManaging.label}` : ''}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && subDialogOpen ? <Alert severity="error">{error}</Alert> : null}
            <Typography variant="caption" color="text.secondary">
              Subcategories appear as filter chips on the shop. Renaming updates products; deleting clears the
              subcategory from products in this category.
            </Typography>
            {subDrafts.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No subcategories yet. Add one below or they will appear automatically when products use them.
              </Typography>
            ) : (
              subDrafts.map((draft) => (
                <Stack
                  key={draft.key}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                >
                  {draft.editing ? (
                    <TextField
                      value={draft.name}
                      onChange={(e) =>
                        setSubDrafts((rows) =>
                          rows.map((r) => (r.key === draft.key ? { ...r, name: e.target.value } : r)),
                        )
                      }
                      size="small"
                      fullWidth
                      disabled={subSaving}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void saveSubcategoryEdit(draft);
                        if (e.key === 'Escape') {
                          setSubDrafts((rows) =>
                            rows.map((r) =>
                              r.key === draft.key
                                ? { ...r, name: r.originalName ?? r.name, editing: false, originalName: undefined }
                                : r,
                            ),
                          );
                        }
                      }}
                    />
                  ) : (
                    <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 600 }}>
                      {draft.name}
                    </Typography>
                  )}
                  {draft.editing ? (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={subSaving}
                        onClick={() => void saveSubcategoryEdit(draft)}
                        sx={{ cursor: 'pointer' }}
                      >
                        Save
                      </Button>
                      <Button
                        size="small"
                        disabled={subSaving}
                        onClick={() =>
                          setSubDrafts((rows) =>
                            rows.map((r) =>
                              r.key === draft.key
                                ? { ...r, name: r.originalName ?? r.name, editing: false, originalName: undefined }
                                : r,
                            ),
                          )
                        }
                        sx={{ cursor: 'pointer' }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={subSaving}
                        onClick={() =>
                          setSubDrafts((rows) =>
                            rows.map((r) =>
                              r.key === draft.key ? { ...r, editing: true, originalName: r.name } : r,
                            ),
                          )
                        }
                        sx={{ cursor: 'pointer' }}
                      >
                        Edit
                      </Button>
                      <IconButton
                        size="small"
                        aria-label="Delete subcategory"
                        disabled={subSaving}
                        onClick={() => void removeSubcategory(draft.name)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <IconDelete fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Stack>
              ))
            )}
            <Divider />
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                label="New subcategory"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                fullWidth
                disabled={subSaving}
                placeholder="e.g. Dress, Chain, Diver"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void addSubcategory();
                }}
              />
              <Button
                variant="outlined"
                startIcon={<IconAdd />}
                onClick={() => void addSubcategory()}
                disabled={subSaving || newSubName.trim().length < 2}
                sx={{ cursor: 'pointer', flexShrink: 0, mt: 0.5 }}
              >
                Add
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSubDialogOpen(false)} disabled={subSaving} sx={{ cursor: 'pointer' }}>
            Close
          </Button>
        </DialogActions>
      </PremiumModal>
    </PageTransitionWrapper>
  );
}

function defaultPriceLabel(minPaise: number | null, maxPaise: number | null): string {
  if (minPaise != null && maxPaise != null) {
    return `${formatInrFromPaise(minPaise)} – ${formatInrFromPaise(maxPaise)}`;
  }
  if (maxPaise != null) return `Under ${formatInrFromPaise(maxPaise)}`;
  if (minPaise != null) return `${formatInrFromPaise(minPaise)}+`;
  return 'Price';
}
