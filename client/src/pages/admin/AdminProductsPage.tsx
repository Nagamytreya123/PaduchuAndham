import { useEffect, useMemo, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import MenuItem from '@mui/material/MenuItem';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Link from '@mui/material/Link';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { Link as RouterLink } from 'react-router-dom';
import { IconDelete, IconAdd, IconRemove } from '../../icons';
import type { AdminProductRow, AdminSalesSummary } from '../../types/product';
import { formatInrFromPaise } from '../../utils/format';
import { resolveMediaUrl } from '../../utils/productImage';
import { AdminLoadingPlaceholder } from '../../components/admin/AdminLoadingPlaceholder';
import { AdminPageHeader, DashboardCard, MotionButton, PageTransitionWrapper, PremiumModal } from '../../components/admin/premium';
import { AdminMultiImageUpload, appendFilesToFormData } from '../../components/admin/AdminMultiImageUpload';
import { adminCatalogGridSx } from '../../constants/adminLayout';
import {
  COLLECTION_CATEGORY_FILTERS,
  filterKeyToApiCategory,
  type CollectionFilterKey,
} from '../../constants/collectionCategoryFilters';
import {
  JEWELLERY_SUB_PRESETS,
  orderedJewellerySubtypeOptions,
  type JewellerySubFilterKey,
} from '../../constants/jewellerySubcategories';

async function postMultipart(url: string, fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(url, { method: 'POST', body: fd, credentials: 'include' });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : res.statusText;
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return data as { ok?: boolean };
}

async function patchMultipart(url: string, fd: FormData): Promise<void> {
  const res = await fetch(url, { method: 'PATCH', body: fd, credentials: 'include' });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : res.statusText;
    throw new Error(msg || `HTTP ${res.status}`);
  }
}

async function patchJson(url: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : res.statusText;
    throw new Error(msg || `HTTP ${res.status}`);
  }
}

function splitList(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

function isBraceletCategory(category: string | undefined): boolean {
  return (category ?? '').trim().toLowerCase() === 'bracelets';
}

function isJewelleryCategory(category: string | undefined): boolean {
  return (category ?? '').trim().toLowerCase() === 'jewellery';
}

function jewellerySubPickFromStored(sub: string | undefined): { pick: string; custom: string } {
  const presets: readonly string[] = JEWELLERY_SUB_PRESETS;
  if (sub && presets.includes(sub)) return { pick: sub, custom: '' };
  return { pick: '__custom__', custom: sub ?? '' };
}

/** Options for matching-bracelet picker: all bracelets, plus any already-selected products not in that list (legacy links). */
function braceletPickerOptions(
  products: AdminProductRow[],
  selectedIds: string[],
  excludeProductId: string | null,
): AdminProductRow[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const bracelets = products.filter(
    (p) => isBraceletCategory(p.category) && (excludeProductId == null || p.id !== excludeProductId),
  );
  const map = new Map<string, AdminProductRow>();
  for (const b of bracelets) map.set(b.id, b);
  for (const id of selectedIds) {
    if (map.has(id)) continue;
    const p = byId.get(id);
    if (p && (excludeProductId == null || p.id !== excludeProductId)) map.set(id, p);
  }
  return [...map.values()];
}

function MatchingBraceletsPicker({
  products,
  selectedIds,
  onSelectedIdsChange,
  excludeProductId,
  disabled,
}: {
  products: AdminProductRow[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  excludeProductId: string | null;
  disabled?: boolean;
}) {
  const options = useMemo(
    () => braceletPickerOptions(products, selectedIds, excludeProductId),
    [products, selectedIds, excludeProductId],
  );

  const value = useMemo(() => {
    const optById = new Map(options.map((p) => [p.id, p]));
    return selectedIds.map((id) => optById.get(id)).filter((p): p is AdminProductRow => p != null);
  }, [selectedIds, options]);

  return (
    <Autocomplete
      multiple
      disabled={disabled}
      options={options}
      value={value}
      onChange={(_, next) => onSelectedIdsChange(next.map((p) => p.id))}
      getOptionLabel={(p) => p.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterOptions={(opts, state) => {
        const q = state.inputValue.trim().toLowerCase();
        if (!q) return opts;
        return opts.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.sku?.toLowerCase().includes(q) ?? false) ||
            p.id.toLowerCase().includes(q),
        );
      }}
      renderOption={(props, option) => {
        const thumb = option.images[0];
        return (
          <li {...props} key={option.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Box
              component={thumb ? 'img' : 'div'}
              src={thumb || undefined}
              alt=""
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: 1,
                objectFit: 'cover',
                bgcolor: 'grey.200',
              }}
            />
            <Stack sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {option.name}
              </Typography>
              {(option.sku || !isBraceletCategory(option.category)) && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {[option.sku, !isBraceletCategory(option.category) ? 'Not in Bracelets category' : '']
                    .filter(Boolean)
                    .join(' · ')}
                </Typography>
              )}
            </Stack>
          </li>
        );
      }}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => {
          const thumb = option.images[0];
          return (
            <Chip
              {...getTagProps({ index })}
              key={option.id}
              size="small"
              label={option.name}
              avatar={
                thumb ? (
                  <Avatar src={thumb} variant="rounded" sx={{ width: 28, height: 28, fontSize: 14 }} alt="" />
                ) : undefined
              }
            />
          );
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Matching bracelets"
          placeholder="Search by name, SKU, or ID…"
          helperText="Pick one or more bracelets; remove chips to unlink."
        />
      )}
    />
  );
}

const CATEGORY_PRESETS = ['Watches', 'Bracelets', 'Jewellery', 'General'] as const;

function categoryPresetFromProduct(category: string): { preset: string; custom: string } {
  const presets: readonly string[] = CATEGORY_PRESETS;
  if (presets.includes(category)) return { preset: category, custom: '' };
  return { preset: '__custom__', custom: category };
}

function AdminProductCatalogCard({
  product,
  onDelete,
  onAdjustStock,
  onEdit,
  stockSaving,
}: {
  product: AdminProductRow;
  onDelete: (id: string) => void;
  onAdjustStock: (id: string, nextStock: number) => void;
  onEdit: (p: AdminProductRow) => void;
  stockSaving: boolean;
}) {
  const img = resolveMediaUrl(product.images[0]);
  const showCompare = product.compareAtPrice != null && product.compareAtPrice > product.price;
  const inactive = product.isActive === false;

  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        opacity: inactive ? 0.85 : 1,
        border: (t) => (inactive ? `1px dashed ${t.palette.divider}` : undefined),
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component={img ? 'img' : 'div'}
          image={img || undefined}
          sx={{
            aspectRatio: '4/3',
            objectFit: 'cover',
            bgcolor: 'grey.100',
            minHeight: 160,
          }}
          loading="lazy"
        />
        {inactive && (
          <Chip
            label="Hidden from shop"
            size="small"
            color="warning"
            sx={{ position: 'absolute', top: 8, left: 8, fontWeight: 700 }}
          />
        )}
      </Box>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Stack direction="row" gap={0.5} flexWrap="wrap" alignItems="center">
          <Typography variant="subtitle1" sx={{ fontWeight: 800, flex: 1, minWidth: 0 }} noWrap>
            {product.name}
          </Typography>
          <IconButton size="small" color="error" aria-label="delete" onClick={() => onDelete(product.id)}>
            <IconDelete />
          </IconButton>
        </Stack>
        <Stack direction="row" gap={0.5} flexWrap="wrap">
          <Chip label={product.category} size="small" sx={{ fontWeight: 600 }} />
          {product.subcategory && <Chip label={product.subcategory} size="small" variant="outlined" />}
        </Stack>
        <Typography variant="body2" color="text.secondary" noWrap>
          {[product.watchDetails?.caseShape, product.watchDetails?.color].filter(Boolean).join(' · ') ||
            '—'}
        </Typography>
        <Stack direction="row" alignItems="baseline" gap={1} flexWrap="wrap">
          <Typography variant="subtitle2" color="primary.main" fontWeight={700}>
            {formatInrFromPaise(product.price)}
          </Typography>
          {showCompare && (
            <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
              {formatInrFromPaise(product.compareAtPrice!)}
            </Typography>
          )}
        </Stack>
        <Typography variant="body2">
          <strong>Sold:</strong> {product.unitsSold} units
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
          ID {product.id}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Typography variant="body2" sx={{ minWidth: 42 }}>
            Stock
          </Typography>
          <IconButton
            size="small"
            disabled={stockSaving || product.stock <= 0}
            aria-label="decrease stock"
            onClick={() => onAdjustStock(product.id, product.stock - 1)}
          >
            <IconRemove />
          </IconButton>
          <Typography sx={{ minWidth: 28, textAlign: 'center', fontWeight: 700 }}>{product.stock}</Typography>
          <IconButton
            size="small"
            disabled={stockSaving}
            aria-label="increase stock"
            onClick={() => onAdjustStock(product.id, product.stock + 1)}
          >
            <IconAdd />
          </IconButton>
        </Stack>
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 'auto', pt: 1 }}>
          <Button size="small" variant="contained" onClick={() => onEdit(product)}>
            Edit
          </Button>
          <Link component={RouterLink} to={`/products/${product.id}`} variant="body2" sx={{ alignSelf: 'center' }}>
            View as customer
          </Link>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [catalogFilterKey, setCatalogFilterKey] = useState<CollectionFilterKey>('all');
  const [jewellerySubFilter, setJewellerySubFilter] = useState<JewellerySubFilterKey>('all');
  const [salesSummary, setSalesSummary] = useState<AdminSalesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockSavingId, setStockSavingId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Watches');
  const [categoryCustom, setCategoryCustom] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [jewellerySubPick, setJewellerySubPick] = useState<string>('Bangles');
  const [jewellerySubCustom, setJewellerySubCustom] = useState('');
  const [sku, setSku] = useState('');
  const [slug, setSlug] = useState('');
  const [caseShape, setCaseShape] = useState('');
  const [dial, setDial] = useState('');
  const [strapType, setStrapType] = useState('');
  const [watchColor, setWatchColor] = useState('');
  const [matchingBraceletIdsSelected, setMatchingBraceletIdsSelected] = useState<string[]>([]);
  const [bundlePriceRupee, setBundlePriceRupee] = useState('');
  const [materials, setMaterials] = useState('');
  const [tags, setTags] = useState('');
  const [jewelryMaterialType, setJewelryMaterialType] = useState('');
  const [jewelryFinish, setJewelryFinish] = useState('');
  const [jewelryStoneOrMotif, setJewelryStoneOrMotif] = useState('');
  const [jewelryCustomization, setJewelryCustomization] = useState('');
  const [dimensionsNote, setDimensionsNote] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [careInstructions, setCareInstructions] = useState('');
  const [priceRupee, setPriceRupee] = useState('');
  const [compareAtRupee, setCompareAtRupee] = useState('');
  const [stock, setStock] = useState('');
  const [imageUrls, setImageUrls] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<string>('Watches');
  const [editCategoryCustom, setEditCategoryCustom] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editJewellerySubPick, setEditJewellerySubPick] = useState('Bangles');
  const [editJewellerySubCustom, setEditJewellerySubCustom] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editCaseShape, setEditCaseShape] = useState('');
  const [editDial, setEditDial] = useState('');
  const [editStrapType, setEditStrapType] = useState('');
  const [editWatchColor, setEditWatchColor] = useState('');
  const [editMatchingBraceletIdsSelected, setEditMatchingBraceletIdsSelected] = useState<string[]>([]);
  const [editBundlePriceRupee, setEditBundlePriceRupee] = useState('');
  const [editMaterials, setEditMaterials] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editJewelryMaterialType, setEditJewelryMaterialType] = useState('');
  const [editJewelryFinish, setEditJewelryFinish] = useState('');
  const [editJewelryStoneOrMotif, setEditJewelryStoneOrMotif] = useState('');
  const [editJewelryCustomization, setEditJewelryCustomization] = useState('');
  const [editDimensionsNote, setEditDimensionsNote] = useState('');
  const [editWeightGrams, setEditWeightGrams] = useState('');
  const [editCareInstructions, setEditCareInstructions] = useState('');
  const [editPriceRupee, setEditPriceRupee] = useState('');
  const [editCompareAtRupee, setEditCompareAtRupee] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editImageUrls, setEditImageUrls] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);

  async function reload() {
    const res = await fetch('/api/admin/products', { credentials: 'include' });
    const data = (await res.json()) as {
      products: AdminProductRow[];
      salesSummary: AdminSalesSummary;
    };
    if (!res.ok) throw new Error('Failed to load products');
    setProducts(data.products);
    setSalesSummary(data.salesSummary);
  }

  useEffect(() => {
    void (async () => {
      try {
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (catalogFilterKey !== 'Jewellery') {
      setJewellerySubFilter('all');
    }
  }, [catalogFilterKey]);

  function resolvedCategory(): string {
    if (category === '__custom__') return categoryCustom.trim() || 'Watches';
    return category;
  }

  function resolvedEditCategory(): string {
    if (editCategory === '__custom__') return editCategoryCustom.trim() || 'Watches';
    return editCategory;
  }

  function resolvedAddSubcategory(): string | undefined {
    if (!isJewelleryCategory(resolvedCategory())) return subcategory.trim() || undefined;
    if (jewellerySubPick === '__custom__') return jewellerySubCustom.trim() || undefined;
    return jewellerySubPick;
  }

  function resolvedEditSubcategoryField(): string | undefined {
    if (!isJewelleryCategory(resolvedEditCategory())) return editSubcategory.trim() || undefined;
    if (editJewellerySubPick === '__custom__') return editJewellerySubCustom.trim() || undefined;
    return editJewellerySubPick;
  }

  function jewelryPayloadFromStrings(mat: string, finish: string, stone: string, custom: string) {
    const materialType = mat.trim() || undefined;
    const finishOrPlating = finish.trim() || undefined;
    const stoneOrMotif = stone.trim() || undefined;
    const customizationNote = custom.trim() || undefined;
    if (!materialType && !finishOrPlating && !stoneOrMotif && !customizationNote) return undefined;
    return { materialType, finishOrPlating, stoneOrMotif, customizationNote };
  }

  useEffect(() => {
    if (category !== 'Watches') {
      setCaseShape('');
      setDial('');
      setStrapType('');
      setWatchColor('');
      setMatchingBraceletIdsSelected([]);
      setBundlePriceRupee('');
    }
    if (!isJewelleryCategory(category)) {
      setTags('');
      setJewelryMaterialType('');
      setJewelryFinish('');
      setJewelryStoneOrMotif('');
      setJewelryCustomization('');
      setJewellerySubCustom('');
    } else {
      setJewellerySubPick((prev) =>
        [...JEWELLERY_SUB_PRESETS, '__custom__'].includes(prev) ? prev : 'Bangles',
      );
    }
  }, [category]);

  useEffect(() => {
    if (!editOpen) return;
    const cat = resolvedEditCategory();
    if (cat !== 'Watches') {
      setEditCaseShape('');
      setEditDial('');
      setEditStrapType('');
      setEditWatchColor('');
      setEditMatchingBraceletIdsSelected([]);
      setEditBundlePriceRupee('');
    }
    if (!isJewelleryCategory(cat)) {
      setEditJewelryMaterialType('');
      setEditJewelryFinish('');
      setEditJewelryStoneOrMotif('');
      setEditJewelryCustomization('');
      setEditJewellerySubCustom('');
    } else {
      setEditJewellerySubPick((prev) =>
        [...JEWELLERY_SUB_PRESETS, '__custom__'].includes(prev) ? prev : 'Bangles',
      );
    }
  }, [editOpen, editCategory, editCategoryCustom]);

  function openEdit(p: AdminProductRow) {
    const cat = categoryPresetFromProduct(p.category);
    setEditId(p.id);
    setEditName(p.name);
    setEditDescription(p.description);
    setEditCategory(cat.preset);
    setEditCategoryCustom(cat.custom);
    if (isJewelleryCategory(p.category)) {
      const s = jewellerySubPickFromStored(p.subcategory);
      setEditJewellerySubPick(s.pick);
      setEditJewellerySubCustom(s.custom);
      setEditSubcategory('');
    } else {
      setEditSubcategory(p.subcategory ?? '');
      setEditJewellerySubPick('Bangles');
      setEditJewellerySubCustom('');
    }
    setEditSku(p.sku ?? '');
    setEditSlug(p.slug ?? '');
    setEditCaseShape(p.watchDetails?.caseShape ?? '');
    setEditDial(p.watchDetails?.dial ?? '');
    setEditStrapType(p.watchDetails?.strapType ?? '');
    setEditWatchColor(p.watchDetails?.color ?? '');
    setEditMatchingBraceletIdsSelected(p.matchingBraceletIds ?? []);
    setEditBundlePriceRupee(
      p.watchBraceletBundlePrice != null ? (p.watchBraceletBundlePrice / 100).toFixed(2) : '',
    );
    setEditMaterials(p.materials?.join(', ') ?? '');
    setEditTags(p.tags?.join(', ') ?? '');
    setEditJewelryMaterialType(p.jewelryDetails?.materialType ?? '');
    setEditJewelryFinish(p.jewelryDetails?.finishOrPlating ?? '');
    setEditJewelryStoneOrMotif(p.jewelryDetails?.stoneOrMotif ?? '');
    setEditJewelryCustomization(p.jewelryDetails?.customizationNote ?? '');
    setEditDimensionsNote(p.dimensions?.displayNote ?? '');
    setEditWeightGrams(p.weightGrams != null ? String(p.weightGrams) : '');
    setEditCareInstructions(p.careInstructions ?? '');
    setEditPriceRupee((p.price / 100).toFixed(2));
    setEditCompareAtRupee(p.compareAtPrice != null ? (p.compareAtPrice / 100).toFixed(2) : '');
    setEditStock(String(p.stock));
    setEditImageUrls(p.images.join(', '));
    setEditImageFiles([]);
    setEditIsActive(p.isActive !== false);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editId) return;
    setError(null);
    setEditSaving(true);
    try {
      const rupees = Number(editPriceRupee);
      if (!Number.isFinite(rupees) || rupees < 0) throw new Error('Invalid price');
      const paise = Math.round(rupees * 100);
      const stockNum = Number(editStock);
      if (!Number.isFinite(stockNum) || stockNum < 0) throw new Error('Invalid stock');

      let comparePaise: number | undefined;
      if (editCompareAtRupee.trim()) {
        const c = Number(editCompareAtRupee);
        if (!Number.isFinite(c) || c < 0) throw new Error('Invalid compare-at price');
        comparePaise = Math.round(c * 100);
      }

      let wG: number | undefined;
      if (editWeightGrams.trim()) {
        const w = Number(editWeightGrams);
        if (!Number.isFinite(w) || w < 0) throw new Error('Invalid weight');
        wG = w;
      }

      const slugTrim = editSlug.trim().toLowerCase();
      const slugOk = slugTrim.length === 0 || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugTrim);
      if (slugTrim.length > 0 && !slugOk) {
        throw new Error('Slug must be lowercase letters, numbers, and hyphens only');
      }

      const urls = splitList(editImageUrls);

      const editCat = resolvedEditCategory();

      const watchDetails =
        editCat === 'Watches' &&
        (editCaseShape.trim() || editDial.trim() || editStrapType.trim() || editWatchColor.trim())
          ? {
              caseShape: editCaseShape.trim() || undefined,
              dial: editDial.trim() || undefined,
              strapType: editStrapType.trim() || undefined,
              color: editWatchColor.trim() || undefined,
            }
          : undefined;

      let braceletIds: string[] = [];
      if (editCat === 'Watches') {
        braceletIds = editMatchingBraceletIdsSelected.filter((id) => OBJECT_ID_RE.test(id));
        if (editMatchingBraceletIdsSelected.some((id) => !OBJECT_ID_RE.test(id))) {
          throw new Error('Invalid matching bracelet selection');
        }
      }

      let watchBraceletBundlePricePayload: number | null = null;
      if (editCat === 'Watches' && braceletIds.length > 0 && editBundlePriceRupee.trim()) {
        const br = Number(editBundlePriceRupee);
        if (!Number.isFinite(br) || br < 0) throw new Error('Invalid watch + bracelet bundle price');
        watchBraceletBundlePricePayload = Math.round(br * 100);
      }

      const payload: Record<string, unknown> = {
        name: editName,
        description: editDescription,
        price: paise,
        stock: stockNum,
        category: editCat,
        subcategory: resolvedEditSubcategoryField(),
        sku: editSku.trim().toUpperCase() || undefined,
        materials: splitList(editMaterials),
        tags: splitList(editTags),
        weightGrams: wG,
        careInstructions: editCareInstructions.trim() || undefined,
        compareAtPrice: comparePaise,
        isActive: editIsActive,
      };

      if (urls.length > 0) {
        payload.images = urls;
      } else if (editImageFiles.length > 0) {
        payload.images = [];
      }

      if (editCat === 'Watches') {
        payload.watchDetails = watchDetails ?? null;
        payload.matchingBraceletIds = braceletIds.length ? braceletIds : [];
        payload.watchBraceletBundlePrice = watchBraceletBundlePricePayload;
      } else {
        payload.watchDetails = null;
        payload.matchingBraceletIds = [];
        payload.watchBraceletBundlePrice = null;
      }

      if (isJewelleryCategory(editCat)) {
        payload.jewelryDetails =
          jewelryPayloadFromStrings(
            editJewelryMaterialType,
            editJewelryFinish,
            editJewelryStoneOrMotif,
            editJewelryCustomization,
          ) ?? null;
      } else {
        payload.jewelryDetails = null;
      }

      if (editDimensionsNote.trim()) {
        payload.dimensions = { displayNote: editDimensionsNote.trim() };
      } else {
        payload.dimensions = undefined;
      }
      if (slugTrim.length > 0) payload.slug = slugTrim;

      if (editImageFiles.length > 0) {
        const fd = new FormData();
        fd.append('data', JSON.stringify(payload));
        appendFilesToFormData(fd, editImageFiles);
        await patchMultipart(`/api/admin/products/${editId}`, fd);
      } else {
        await patchJson(`/api/admin/products/${editId}`, payload);
      }
      setEditOpen(false);
      setEditId(null);
      setEditImageFiles([]);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setEditSaving(false);
    }
  }

  async function adjustStock(id: string, nextStock: number) {
    const n = Math.floor(nextStock);
    if (!Number.isFinite(n) || n < 0) return;
    setError(null);
    setStockSavingId(id);
    try {
      await patchJson(`/api/admin/products/${id}`, { stock: n });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Stock update failed');
    } finally {
      setStockSavingId(null);
    }
  }

  async function createProduct() {
    setError(null);
    setAddSaving(true);
    try {
      const rupees = Number(priceRupee);
      if (!Number.isFinite(rupees) || rupees < 0) throw new Error('Invalid price');
      const paise = Math.round(rupees * 100);
      const stockNum = Number(stock);
      if (!Number.isFinite(stockNum) || stockNum < 0) throw new Error('Invalid stock');

      const cat = resolvedCategory();
      if (!cat) throw new Error('Category is required');

      let comparePaise: number | undefined;
      if (compareAtRupee.trim()) {
        const c = Number(compareAtRupee);
        if (!Number.isFinite(c) || c < 0) throw new Error('Invalid compare-at price');
        comparePaise = Math.round(c * 100);
      }

      let wG: number | undefined;
      if (weightGrams.trim()) {
        const w = Number(weightGrams);
        if (!Number.isFinite(w) || w < 0) throw new Error('Invalid weight');
        wG = w;
      }

      const slugTrim = slug.trim().toLowerCase();
      const slugOk = slugTrim.length === 0 || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugTrim);
      if (slugTrim.length > 0 && !slugOk) {
        throw new Error('Slug must be lowercase letters, numbers, and hyphens only (e.g. my-product-name)');
      }

      const urls = splitList(imageUrls);
      if (urls.length === 0 && imageFiles.length === 0) {
        throw new Error('Add at least one product image (upload a file or paste an image URL)');
      }

      const watchDetails =
        cat === 'Watches' && (caseShape.trim() || dial.trim() || strapType.trim() || watchColor.trim())
          ? {
              caseShape: caseShape.trim() || undefined,
              dial: dial.trim() || undefined,
              strapType: strapType.trim() || undefined,
              color: watchColor.trim() || undefined,
            }
          : undefined;

      let braceletIds: string[] = [];
      if (cat === 'Watches') {
        braceletIds = matchingBraceletIdsSelected.filter((id) => OBJECT_ID_RE.test(id));
        if (matchingBraceletIdsSelected.some((id) => !OBJECT_ID_RE.test(id))) {
          throw new Error('Invalid matching bracelet selection');
        }
      }

      let bundlePaise: number | undefined;
      if (cat === 'Watches' && bundlePriceRupee.trim()) {
        const br = Number(bundlePriceRupee);
        if (!Number.isFinite(br) || br < 0) throw new Error('Invalid watch + bracelet bundle price');
        bundlePaise = Math.round(br * 100);
        if (braceletIds.length === 0) throw new Error('Pick matching bracelets before setting a bundle price');
      }

      const jewelryDetails =
        isJewelleryCategory(cat) ? jewelryPayloadFromStrings(
          jewelryMaterialType,
          jewelryFinish,
          jewelryStoneOrMotif,
          jewelryCustomization,
        ) : undefined;

      const payload: Record<string, unknown> = {
        name,
        description,
        price: paise,
        stock: stockNum,
        category: cat,
        subcategory: resolvedAddSubcategory(),
        sku: sku.trim().toUpperCase() || undefined,
        materials: splitList(materials),
        tags: splitList(tags),
        weightGrams: wG,
        careInstructions: careInstructions.trim() || undefined,
        compareAtPrice: comparePaise,
        images: urls.length ? urls : undefined,
      };

      if (cat === 'Watches') {
        payload.watchDetails = watchDetails;
        payload.matchingBraceletIds = braceletIds.length ? braceletIds : undefined;
        payload.watchBraceletBundlePrice = bundlePaise;
      }

      if (jewelryDetails) payload.jewelryDetails = jewelryDetails;

      if (dimensionsNote.trim()) {
        payload.dimensions = { displayNote: dimensionsNote.trim() };
      }
      if (slugTrim.length > 0) payload.slug = slugTrim;

      const fd = new FormData();
      fd.append('data', JSON.stringify(payload));
      appendFilesToFormData(fd, imageFiles);

      await postMultipart('/api/admin/products', fd);
      setName('');
      setDescription('');
      setCategory('Watches');
      setCategoryCustom('');
      setSubcategory('');
      setJewellerySubPick('Bangles');
      setJewellerySubCustom('');
      setSku('');
      setSlug('');
      setCaseShape('');
      setDial('');
      setStrapType('');
      setWatchColor('');
      setMatchingBraceletIdsSelected([]);
      setBundlePriceRupee('');
      setMaterials('');
      setTags('');
      setJewelryMaterialType('');
      setJewelryFinish('');
      setJewelryStoneOrMotif('');
      setJewelryCustomization('');
      setDimensionsNote('');
      setWeightGrams('');
      setCareInstructions('');
      setPriceRupee('');
      setCompareAtRupee('');
      setStock('');
      setImageUrls('');
      setImageFiles([]);
      await reload();
      setAddDialogOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setAddSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Delete failed');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const adminJewellerySubtypeOptions = useMemo(() => {
    const subs: string[] = [];
    for (const p of products) {
      if (!isJewelleryCategory(p.category)) continue;
      const s = (p.subcategory ?? '').trim();
      if (s) subs.push(s);
    }
    if (jewellerySubFilter !== 'all') subs.push(jewellerySubFilter);
    return orderedJewellerySubtypeOptions(subs);
  }, [products, jewellerySubFilter]);

  const filteredCatalog = useMemo(() => {
    let list: AdminProductRow[];
    if (catalogFilterKey === 'all') {
      list = products;
    } else {
      const want = filterKeyToApiCategory(catalogFilterKey);
      list = products.filter((p) => p.category.trim().toLowerCase() === want.toLowerCase());
    }
    if (catalogFilterKey === 'Jewellery' && jewellerySubFilter !== 'all') {
      const wantSub = jewellerySubFilter.toLowerCase();
      list = list.filter((p) => (p.subcategory ?? '').trim().toLowerCase() === wantSub);
    }
    return list;
  }, [products, catalogFilterKey, jewellerySubFilter]);

  const missingImageCount = useMemo(
    () => products.filter((p) => !(p.images?.length ?? 0)).length,
    [products],
  );

  if (loading) return <AdminLoadingPlaceholder variant="products" />;

  const subcategoryEntries = salesSummary
    ? Object.entries(salesSummary.bySubcategory).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <PageTransitionWrapper>
    <Stack spacing={2.5} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <AdminPageHeader
        title="Products"
        description="Same layout customers see, plus units sold and stock controls. Sales totals include orders that are paid, processing, shipped, or delivered."
        actions={
          <MotionButton variant="contained" onClick={() => setAddDialogOpen(true)} sx={{ flexShrink: 0 }}>
            Add product
          </MotionButton>
        }
      />

      {missingImageCount > 0 ? (
        <Alert severity="warning">
          {missingImageCount} product{missingImageCount === 1 ? '' : 's'} ha{missingImageCount === 1 ? 's' : 've'} no
          image saved. Edit each product, use <strong>Upload image files</strong>, then Save. The storefront shows a
          placeholder until a photo is uploaded.
        </Alert>
      ) : null}

      <ToggleButtonGroup
        exclusive
        value={catalogFilterKey}
        onChange={(_e, key: CollectionFilterKey | null) => {
          if (key == null) return;
          setCatalogFilterKey(key);
        }}
        aria-label="Filter catalog by category"
        sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { textTransform: 'none' } }}
      >
        {COLLECTION_CATEGORY_FILTERS.map((opt) => (
          <ToggleButton key={opt.key} value={opt.key}>
            {opt.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {catalogFilterKey === 'Jewellery' && (
        <ToggleButtonGroup
          exclusive
          value={jewellerySubFilter}
          onChange={(_e, key: JewellerySubFilterKey | null) => {
            if (key == null) return;
            setJewellerySubFilter(key);
          }}
          aria-label="Filter jewellery catalog by type"
          sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { textTransform: 'none' } }}
        >
          <ToggleButton value="all">All types</ToggleButton>
          {adminJewellerySubtypeOptions.map((opt) => (
            <ToggleButton key={opt} value={opt}>
              {opt}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {salesSummary && (
        <DashboardCard sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Sales overview
          </Typography>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            <strong>Total units sold (all products):</strong> {salesSummary.totalUnitsSold}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Units sold by type (subcategory)
          </Typography>
          {subcategoryEntries.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No recorded sales yet.
            </Typography>
          ) : (
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {subcategoryEntries.map(([label, count]) => (
                <Chip key={label} label={`${label}: ${count} sold`} size="small" variant="outlined" />
              ))}
            </Stack>
          )}
        </DashboardCard>
      )}

      <Typography variant="subtitle1" fontWeight={700}>
        Catalog ({filteredCatalog.length}
        {catalogFilterKey !== 'all' ? ` of ${products.length}` : ''})
      </Typography>
      <Box sx={adminCatalogGridSx}>
        {filteredCatalog.map((p) => (
          <AdminProductCatalogCard
            key={p.id}
            product={p}
            onDelete={deleteProduct}
            onAdjustStock={(id, n) => void adjustStock(id, n)}
            onEdit={openEdit}
            stockSaving={stockSavingId === p.id}
          />
        ))}
      </Box>
      {filteredCatalog.length === 0 && (
        <Typography color="text.secondary">
          {products.length === 0 ? 'No products yet — use Add product above.' : 'No products in this category.'}
        </Typography>
      )}

      <PremiumModal
        open={addDialogOpen}
        onClose={() => !addSaving && setAddDialogOpen(false)}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle>Add product</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Price is in INR (rupees); stored in paise. For watches, pick matching bracelets from the searchable list
            (products in the Bracelets category). For jewellery, use subcategories (bangles, chains, etc.), tags, and the
            material / customization fields.
          </Typography>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
              <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth required />
              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                minRows={2}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  fullWidth
                >
                  {CATEGORY_PRESETS.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                  <MenuItem value="__custom__">Custom…</MenuItem>
                </TextField>
                {category === '__custom__' && (
                  <TextField
                    label="Custom category"
                    value={categoryCustom}
                    onChange={(e) => setCategoryCustom(e.target.value)}
                    fullWidth
                    required
                  />
                )}
                {isJewelleryCategory(resolvedCategory()) ? (
                  <>
                    <TextField
                      select
                      label="Jewellery subcategory"
                      value={jewellerySubPick}
                      onChange={(e) => setJewellerySubPick(e.target.value)}
                      fullWidth
                    >
                      {JEWELLERY_SUB_PRESETS.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                      <MenuItem value="__custom__">Custom…</MenuItem>
                    </TextField>
                    {jewellerySubPick === '__custom__' && (
                      <TextField
                        label="Custom subcategory"
                        value={jewellerySubCustom}
                        onChange={(e) => setJewellerySubCustom(e.target.value)}
                        fullWidth
                        required
                      />
                    )}
                  </>
                ) : (
                  <TextField
                    label="Subcategory"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    fullWidth
                    placeholder="e.g. Dress, Diver, Chain"
                  />
                )}
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} fullWidth placeholder="SKU" />
                <TextField
                  label="Slug (optional)"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  fullWidth
                  placeholder="my-product-name"
                  helperText="Lowercase, hyphens only"
                />
              </Stack>
              {resolvedCategory() === 'Watches' && (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField label="Case shape" value={caseShape} onChange={(e) => setCaseShape(e.target.value)} fullWidth />
                    <TextField label="Dial" value={dial} onChange={(e) => setDial(e.target.value)} fullWidth />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Strap / attachment"
                      value={strapType}
                      onChange={(e) => setStrapType(e.target.value)}
                      fullWidth
                    />
                    <TextField label="Colour" value={watchColor} onChange={(e) => setWatchColor(e.target.value)} fullWidth />
                  </Stack>
                  <MatchingBraceletsPicker
                    products={products}
                    selectedIds={matchingBraceletIdsSelected}
                    onSelectedIdsChange={setMatchingBraceletIdsSelected}
                    excludeProductId={null}
                  />
                  <TextField
                    label="Watch + bracelet bundle price (INR)"
                    value={bundlePriceRupee}
                    onChange={(e) => setBundlePriceRupee(e.target.value)}
                    fullWidth
                    type="number"
                    inputProps={{ min: 0, step: '0.01' }}
                    helperText={
                      matchingBraceletIdsSelected.length === 0
                        ? 'Link at least one matching bracelet to offer a combined price on the product page.'
                        : 'Customers see this total when they add the watch and a chosen bracelet together (two cart lines).'
                    }
                    disabled={matchingBraceletIdsSelected.length === 0}
                  />
                </>
              )}
              {isJewelleryCategory(resolvedCategory()) && (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Primary material type"
                      value={jewelryMaterialType}
                      onChange={(e) => setJewelryMaterialType(e.target.value)}
                      fullWidth
                      placeholder="e.g. 925 silver, brass core"
                    />
                    <TextField
                      label="Finish / plating"
                      value={jewelryFinish}
                      onChange={(e) => setJewelryFinish(e.target.value)}
                      fullWidth
                      placeholder="e.g. rhodium, 22K gold tone"
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Stone or motif"
                      value={jewelryStoneOrMotif}
                      onChange={(e) => setJewelryStoneOrMotif(e.target.value)}
                      fullWidth
                      placeholder="e.g. CZ accents, temple engraving"
                    />
                    <TextField
                      label="Customization notes"
                      value={jewelryCustomization}
                      onChange={(e) => setJewelryCustomization(e.target.value)}
                      fullWidth
                      placeholder="e.g. engraving, sizing, made-to-order"
                    />
                  </Stack>
                </>
              )}
              <TextField
                label="Materials (comma-separated)"
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                fullWidth
                helperText="Composition shown as chips on the product page."
              />
              <TextField
                label="Tags (comma-separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                fullWidth
                helperText="Short labels (e.g. Handcrafted, Wedding, Adjustable) — especially useful for jewellery."
              />
              <TextField
                label="Size / dimensions (customer-facing)"
                value={dimensionsNote}
                onChange={(e) => setDimensionsNote(e.target.value)}
                fullWidth
              />
              <TextField
                label="Weight (g)"
                value={weightGrams}
                onChange={(e) => setWeightGrams(e.target.value)}
                fullWidth
                type="number"
                inputProps={{ min: 0, step: 1 }}
              />
              <TextField
                label="Care instructions"
                value={careInstructions}
                onChange={(e) => setCareInstructions(e.target.value)}
                fullWidth
                multiline
                minRows={2}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Price (INR)"
                  value={priceRupee}
                  onChange={(e) => setPriceRupee(e.target.value)}
                  fullWidth
                  type="number"
                  inputProps={{ min: 0, step: '0.01' }}
                />
                <TextField
                  label="Compare-at (INR)"
                  value={compareAtRupee}
                  onChange={(e) => setCompareAtRupee(e.target.value)}
                  fullWidth
                  type="number"
                  inputProps={{ min: 0, step: '0.01' }}
                />
                <TextField
                  label="Stock"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  fullWidth
                  type="number"
                  inputProps={{ min: 0, step: 1 }}
                />
              </Stack>
              <TextField
                label="Image URLs (comma-separated)"
                value={imageUrls}
                onChange={(e) => setImageUrls(e.target.value)}
                fullWidth
                helperText="External image links, separated by commas"
              />
              <AdminMultiImageUpload
                files={imageFiles}
                onChange={setImageFiles}
                disabled={addSaving}
              />
            </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => !addSaving && setAddDialogOpen(false)} disabled={addSaving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void createProduct()} disabled={addSaving}>
            {addSaving ? 'Saving…' : 'Save product'}
          </Button>
        </DialogActions>
      </PremiumModal>

      <PremiumModal open={editOpen} onClose={() => !editSaving && setEditOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Edit product</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControlLabel
              control={<Switch checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />}
              label="Visible in shop"
            />
            <TextField label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} fullWidth required />
            <TextField
              label="Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select label="Category" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} fullWidth>
                {CATEGORY_PRESETS.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
                <MenuItem value="__custom__">Custom…</MenuItem>
              </TextField>
              {editCategory === '__custom__' && (
                <TextField
                  label="Custom category"
                  value={editCategoryCustom}
                  onChange={(e) => setEditCategoryCustom(e.target.value)}
                  fullWidth
                  required
                />
              )}
              {isJewelleryCategory(resolvedEditCategory()) ? (
                <>
                  <TextField
                    select
                    label="Jewellery subcategory"
                    value={editJewellerySubPick}
                    onChange={(e) => setEditJewellerySubPick(e.target.value)}
                    fullWidth
                    disabled={editSaving}
                  >
                    {JEWELLERY_SUB_PRESETS.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                    <MenuItem value="__custom__">Custom…</MenuItem>
                  </TextField>
                  {editJewellerySubPick === '__custom__' && (
                    <TextField
                      label="Custom subcategory"
                      value={editJewellerySubCustom}
                      onChange={(e) => setEditJewellerySubCustom(e.target.value)}
                      fullWidth
                      required
                      disabled={editSaving}
                    />
                  )}
                </>
              ) : (
                <TextField
                  label="Subcategory"
                  value={editSubcategory}
                  onChange={(e) => setEditSubcategory(e.target.value)}
                  fullWidth
                  disabled={editSaving}
                />
              )}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="SKU" value={editSku} onChange={(e) => setEditSku(e.target.value)} fullWidth />
              <TextField label="Slug" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} fullWidth />
            </Stack>
            {resolvedEditCategory() === 'Watches' && (
              <>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField label="Case shape" value={editCaseShape} onChange={(e) => setEditCaseShape(e.target.value)} fullWidth />
                  <TextField label="Dial" value={editDial} onChange={(e) => setEditDial(e.target.value)} fullWidth />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField label="Strap / attachment" value={editStrapType} onChange={(e) => setEditStrapType(e.target.value)} fullWidth />
                  <TextField label="Colour" value={editWatchColor} onChange={(e) => setEditWatchColor(e.target.value)} fullWidth />
                </Stack>
                <MatchingBraceletsPicker
                  products={products}
                  selectedIds={editMatchingBraceletIdsSelected}
                  onSelectedIdsChange={setEditMatchingBraceletIdsSelected}
                  excludeProductId={editId}
                  disabled={editSaving}
                />
                <TextField
                  label="Watch + bracelet bundle price (INR)"
                  value={editBundlePriceRupee}
                  onChange={(e) => setEditBundlePriceRupee(e.target.value)}
                  fullWidth
                  type="number"
                  inputProps={{ min: 0, step: '0.01' }}
                  helperText={
                    editMatchingBraceletIdsSelected.length === 0
                      ? 'Link bracelets first to offer a bundle price. Clear this field to remove the bundle.'
                      : 'Leave empty to remove the bundle offer on the storefront.'
                  }
                  disabled={editSaving || editMatchingBraceletIdsSelected.length === 0}
                />
              </>
            )}
            {isJewelleryCategory(resolvedEditCategory()) && (
              <>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Primary material type"
                    value={editJewelryMaterialType}
                    onChange={(e) => setEditJewelryMaterialType(e.target.value)}
                    fullWidth
                    disabled={editSaving}
                  />
                  <TextField
                    label="Finish / plating"
                    value={editJewelryFinish}
                    onChange={(e) => setEditJewelryFinish(e.target.value)}
                    fullWidth
                    disabled={editSaving}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Stone or motif"
                    value={editJewelryStoneOrMotif}
                    onChange={(e) => setEditJewelryStoneOrMotif(e.target.value)}
                    fullWidth
                    disabled={editSaving}
                  />
                  <TextField
                    label="Customization notes"
                    value={editJewelryCustomization}
                    onChange={(e) => setEditJewelryCustomization(e.target.value)}
                    fullWidth
                    disabled={editSaving}
                  />
                </Stack>
              </>
            )}
            <TextField label="Materials" value={editMaterials} onChange={(e) => setEditMaterials(e.target.value)} fullWidth />
            <TextField
              label="Tags (comma-separated)"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              fullWidth
              disabled={editSaving}
            />
            <TextField label="Dimensions note" value={editDimensionsNote} onChange={(e) => setEditDimensionsNote(e.target.value)} fullWidth />
            <TextField label="Weight (g)" value={editWeightGrams} onChange={(e) => setEditWeightGrams(e.target.value)} type="number" fullWidth />
            <TextField
              label="Care instructions"
              value={editCareInstructions}
              onChange={(e) => setEditCareInstructions(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Price (INR)" value={editPriceRupee} onChange={(e) => setEditPriceRupee(e.target.value)} type="number" fullWidth />
              <TextField label="Compare-at (INR)" value={editCompareAtRupee} onChange={(e) => setEditCompareAtRupee(e.target.value)} type="number" fullWidth />
              <TextField label="Stock" value={editStock} onChange={(e) => setEditStock(e.target.value)} type="number" fullWidth />
            </Stack>
            <TextField
              label="Image URLs (comma-separated)"
              value={editImageUrls}
              onChange={(e) => setEditImageUrls(e.target.value)}
              fullWidth
              helperText="Replaces saved URL images; uploads below are added after these"
            />
            <AdminMultiImageUpload
              files={editImageFiles}
              onChange={setEditImageFiles}
              disabled={editSaving}
              label="Upload additional image files"
              helperText="New uploads are appended to the images above (max 15 total)"
              existingUrls={splitList(editImageUrls)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={editSaving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void saveEdit()} disabled={editSaving}>
            {editSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </PremiumModal>
    </Stack>
    </PageTransitionWrapper>
  );
}
