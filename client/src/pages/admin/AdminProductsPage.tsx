import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
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
import { Link as RouterLink } from 'react-router-dom';
import { IconDelete, IconAdd, IconRemove } from '../../icons';
import type { AdminProductRow, AdminSalesSummary } from '../../types/product';
import { formatInrFromPaise } from '../../utils/format';
import { handleProductImageError, resolveMediaUrl } from '../../utils/productImage';
import { AdminLoadingPlaceholder } from '../../components/admin/AdminLoadingPlaceholder';
import { AdminPageHeader, DashboardCard, MotionButton, PageTransitionWrapper, PremiumModal } from '../../components/admin/premium';
import { AdminMultiImageUpload, appendFilesToFormData } from '../../components/admin/AdminMultiImageUpload';
import { adminCatalogGridSx } from '../../constants/adminLayout';
import { useCategories } from '../../context/CategoriesContext';
import {
  categoryKindOf,
  categoryUsesSizeOptions,
  findCatalogCategory,
  isComboCategory,
  normalizeCatalogCategory,
  productMatchesCategory,
  type CatalogCategory,
} from '../../utils/catalogCategory';
import { sumComboLinkedListPricesPaise } from '../../utils/bundlePricing';
import { CategoryFilterGroup } from '../../components/CategoryFilterGroup';
import { CategorySelectField } from '../../components/admin/CategorySelectField';
import { SubcategorySelectField } from '../../components/admin/SubcategorySelectField';
import { ComboProductsPicker } from '../../components/admin/ComboProductsPicker';
import { apiFetch, apiUrl } from '../../api/client';

const formGrid2Sx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 2,
  alignItems: 'start',
} as const;

const formGrid3Sx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
  gap: 2,
  alignItems: 'start',
} as const;

async function postMultipart(url: string, fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(apiUrl(url), { method: 'POST', body: fd, credentials: 'include' });
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
  const res = await fetch(apiUrl(url), { method: 'PATCH', body: fd, credentials: 'include' });
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

async function postJson(url: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(apiUrl(url), {
    method: 'POST',
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

async function patchJson(url: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(apiUrl(url), {
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
    .split(/[,\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function isEmbeddedProductImage(url: string): boolean {
  return url.startsWith('data:image/');
}

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

/** Options for matching-bracelet picker: all bracelets, plus any already-selected products not in that list (legacy links). */
function braceletPickerOptions(
  products: AdminProductRow[],
  selectedIds: string[],
  excludeProductId: string | null,
  isBracelet: (category: string | undefined) => boolean,
): AdminProductRow[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const bracelets = products.filter(
    (p) => isBracelet(p.category) && (excludeProductId == null || p.id !== excludeProductId),
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
  const { kindFor } = useCategories();
  const isBracelet = (category: string | undefined) => kindFor(category ?? '') === 'bracelet';
  const options = useMemo(
    () => braceletPickerOptions(products, selectedIds, excludeProductId, isBracelet),
    [products, selectedIds, excludeProductId, kindFor],
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
              {(option.sku || !isBracelet(option.category)) && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {[option.sku, !isBracelet(option.category) ? 'Not in Bracelets category' : '']
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
          onError={img ? handleProductImageError : undefined}
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

function rupeeStringFromPaise(paise: number): string {
  return (paise / 100).toFixed(2);
}

function comboCompareAtHelperText(sumPaise: number, linkedCount: number): string | undefined {
  if (linkedCount < 2 || sumPaise <= 0) return undefined;
  return `Linked items total ${formatInrFromPaise(sumPaise)} — compare-at updates when you change linked products.`;
}

export function AdminProductsPage() {
  const { catalogRevision } = useCategories();
  const [adminCategories, setAdminCategories] = useState<CatalogCategory[]>([]);
  const kindFor = (productCategory: string) => categoryKindOf(productCategory, adminCategories);
  const isWatch = (c: string) => kindFor(c) === 'watch';
  const isJewelleryCat = (c: string) => kindFor(c) === 'jewellery';

  const loadAdminCategories = useCallback(async () => {
    const data = await apiFetch<{ categories: CatalogCategory[] }>('/api/admin/categories');
    setAdminCategories((data.categories ?? []).map(normalizeCatalogCategory));
  }, []);

  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [catalogFilterKey, setCatalogFilterKey] = useState<string>('all');
  const [salesSummary, setSalesSummary] = useState<AdminSalesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockSavingId, setStockSavingId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('');
  const [subcategory, setSubcategory] = useState('');
  const [sku, setSku] = useState('');
  const [slug, setSlug] = useState('');
  const [caseShape, setCaseShape] = useState('');
  const [dial, setDial] = useState('');
  const [strapType, setStrapType] = useState('');
  const [watchColor, setWatchColor] = useState('');
  const [matchingBraceletIdsSelected, setMatchingBraceletIdsSelected] = useState<string[]>([]);
  const [comboProductIdsSelected, setComboProductIdsSelected] = useState<string[]>([]);
  const [bundlePriceRupee, setBundlePriceRupee] = useState('');
  const [materials, setMaterials] = useState('');
  const [tags, setTags] = useState('');
  const [jewelryMaterialType, setJewelryMaterialType] = useState('');
  const [jewelryFinish, setJewelryFinish] = useState('');
  const [jewelryStoneOrMotif, setJewelryStoneOrMotif] = useState('');
  const [jewelryCustomization, setJewelryCustomization] = useState('');
  const [dimensionsNote, setDimensionsNote] = useState('');
  const [sizeOptionsInput, setSizeOptionsInput] = useState('');
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
  const [editCategory, setEditCategory] = useState<string>('');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editCaseShape, setEditCaseShape] = useState('');
  const [editDial, setEditDial] = useState('');
  const [editStrapType, setEditStrapType] = useState('');
  const [editWatchColor, setEditWatchColor] = useState('');
  const [editMatchingBraceletIdsSelected, setEditMatchingBraceletIdsSelected] = useState<string[]>([]);
  const [editComboProductIdsSelected, setEditComboProductIdsSelected] = useState<string[]>([]);
  const [editBundlePriceRupee, setEditBundlePriceRupee] = useState('');
  const [editMaterials, setEditMaterials] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editJewelryMaterialType, setEditJewelryMaterialType] = useState('');
  const [editJewelryFinish, setEditJewelryFinish] = useState('');
  const [editJewelryStoneOrMotif, setEditJewelryStoneOrMotif] = useState('');
  const [editJewelryCustomization, setEditJewelryCustomization] = useState('');
  const [editDimensionsNote, setEditDimensionsNote] = useState('');
  const [editSizeOptionsInput, setEditSizeOptionsInput] = useState('');
  const [editWeightGrams, setEditWeightGrams] = useState('');
  const [editCareInstructions, setEditCareInstructions] = useState('');
  const [editPriceRupee, setEditPriceRupee] = useState('');
  const [editCompareAtRupee, setEditCompareAtRupee] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editImageUrls, setEditImageUrls] = useState('');
  const [editEmbeddedImages, setEditEmbeddedImages] = useState<string[]>([]);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);

  async function reload() {
    const res = await fetch(apiUrl('/api/admin/products'), { credentials: 'include' });
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
  }, [catalogRevision]);

  useEffect(() => {
    void loadAdminCategories().catch(() => setAdminCategories([]));
  }, [catalogRevision, loadAdminCategories]);

  useEffect(() => {
    if (!addDialogOpen && !editOpen) return;
    void loadAdminCategories().catch(() => setAdminCategories([]));
  }, [addDialogOpen, editOpen, loadAdminCategories]);

  useEffect(() => {
    if (adminCategories.length === 0) return;
    setCategory((prev) =>
      prev && adminCategories.some((c) => c.slug === prev) ? prev : adminCategories[0]!.slug,
    );
  }, [adminCategories]);

  const prevCategoryRef = useRef(category);
  useEffect(() => {
    if (prevCategoryRef.current === category) return;
    prevCategoryRef.current = category;
    setSubcategory('');
  }, [category]);

  function categoryIsCombo(slug: string): boolean {
    return isComboCategory(findCatalogCategory(slug, adminCategories));
  }

  function selectedCategoryUsesSizeOptions(slug: string): boolean {
    return categoryUsesSizeOptions(slug, adminCategories);
  }

  const productPriceById = useMemo(
    () => new Map(products.map((p) => [p.id, p.price])),
    [products],
  );

  function applyComboCompareAtFromLinkedIds(ids: string[], setCompareAt: (value: string) => void) {
    if (ids.length < 2) return;
    const sumPaise = sumComboLinkedListPricesPaise(ids, productPriceById);
    if (sumPaise > 0) setCompareAt(rupeeStringFromPaise(sumPaise));
  }

  function handleComboProductIdsChange(ids: string[]) {
    setComboProductIdsSelected(ids);
    applyComboCompareAtFromLinkedIds(ids, setCompareAtRupee);
  }

  function handleEditComboProductIdsChange(ids: string[]) {
    setEditComboProductIdsSelected(ids);
    applyComboCompareAtFromLinkedIds(ids, setEditCompareAtRupee);
  }

  function removeEditExistingImage(url: string) {
    if (isEmbeddedProductImage(url)) {
      setEditEmbeddedImages((prev) => prev.filter((img) => img !== url));
      return;
    }
    setEditImageUrls((prev) => splitList(prev).filter((img) => img !== url).join(', '));
  }

  const addComboCompareSumPaise = useMemo(
    () => sumComboLinkedListPricesPaise(comboProductIdsSelected, productPriceById),
    [comboProductIdsSelected, productPriceById],
  );

  const editComboCompareSumPaise = useMemo(
    () => sumComboLinkedListPricesPaise(editComboProductIdsSelected, productPriceById),
    [editComboProductIdsSelected, productPriceById],
  );

  function resolvedCategory(): string {
    return category;
  }

  function resolvedEditCategory(): string {
    return editCategory;
  }

  function resolvedAddSubcategory(): string | undefined {
    return subcategory.trim() || undefined;
  }

  function resolvedEditSubcategoryField(): string | undefined {
    return editSubcategory.trim() || undefined;
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
    if (!isWatch(category)) {
      setCaseShape((prev) => (prev === '' ? prev : ''));
      setDial((prev) => (prev === '' ? prev : ''));
      setStrapType((prev) => (prev === '' ? prev : ''));
      setWatchColor((prev) => (prev === '' ? prev : ''));
      setMatchingBraceletIdsSelected((prev) => (prev.length === 0 ? prev : []));
      setBundlePriceRupee((prev) => (prev === '' ? prev : ''));
    }
    if (!isJewelleryCat(category)) {
      setTags((prev) => (prev === '' ? prev : ''));
      setJewelryMaterialType((prev) => (prev === '' ? prev : ''));
      setJewelryFinish((prev) => (prev === '' ? prev : ''));
      setJewelryStoneOrMotif((prev) => (prev === '' ? prev : ''));
      setJewelryCustomization((prev) => (prev === '' ? prev : ''));
    }
    if (!categoryIsCombo(category)) {
      setComboProductIdsSelected((prev) => (prev.length === 0 ? prev : []));
    }
    if (selectedCategoryUsesSizeOptions(category)) {
      setDimensionsNote((prev) => (prev === '' ? prev : ''));
    } else {
      setSizeOptionsInput((prev) => (prev === '' ? prev : ''));
    }
  }, [category, adminCategories]);

  useEffect(() => {
    if (!editOpen) return;
    const cat = resolvedEditCategory();
    if (!isWatch(cat)) {
      setEditCaseShape((prev) => (prev === '' ? prev : ''));
      setEditDial((prev) => (prev === '' ? prev : ''));
      setEditStrapType((prev) => (prev === '' ? prev : ''));
      setEditWatchColor((prev) => (prev === '' ? prev : ''));
      setEditMatchingBraceletIdsSelected((prev) => (prev.length === 0 ? prev : []));
      setEditBundlePriceRupee((prev) => (prev === '' ? prev : ''));
    }
    if (!isJewelleryCat(cat)) {
      setEditJewelryMaterialType((prev) => (prev === '' ? prev : ''));
      setEditJewelryFinish((prev) => (prev === '' ? prev : ''));
      setEditJewelryStoneOrMotif((prev) => (prev === '' ? prev : ''));
      setEditJewelryCustomization((prev) => (prev === '' ? prev : ''));
    }
    if (!categoryIsCombo(cat)) {
      setEditComboProductIdsSelected((prev) => (prev.length === 0 ? prev : []));
    }
    if (selectedCategoryUsesSizeOptions(cat)) {
      setEditDimensionsNote((prev) => (prev === '' ? prev : ''));
    } else {
      setEditSizeOptionsInput((prev) => (prev === '' ? prev : ''));
    }
  }, [editOpen, editCategory, adminCategories]);

  function openEdit(p: AdminProductRow) {
    const matched = findCatalogCategory(p.category, adminCategories);
    setEditId(p.id);
    setEditName(p.name);
    setEditDescription(p.description);
    setEditCategory(matched?.slug ?? adminCategories[0]?.slug ?? p.category);
    setEditSubcategory(p.subcategory ?? '');
    setEditSku(p.sku ?? '');
    setEditSlug(p.slug ?? '');
    setEditCaseShape(p.watchDetails?.caseShape ?? '');
    setEditDial(p.watchDetails?.dial ?? '');
    setEditStrapType(p.watchDetails?.strapType ?? '');
    setEditWatchColor(p.watchDetails?.color ?? '');
    setEditMatchingBraceletIdsSelected(p.matchingBraceletIds ?? []);
    setEditComboProductIdsSelected(p.comboProductIds ?? []);
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
    setEditSizeOptionsInput((p.sizeOptions ?? []).join(', '));
    setEditWeightGrams(p.weightGrams != null ? String(p.weightGrams) : '');
    setEditCareInstructions(p.careInstructions ?? '');
    setEditPriceRupee((p.price / 100).toFixed(2));
    setEditCompareAtRupee(p.compareAtPrice != null ? (p.compareAtPrice / 100).toFixed(2) : '');
    setEditStock(String(p.stock));
    setEditImageUrls(p.images.filter((img) => !isEmbeddedProductImage(img)).join(', '));
    setEditEmbeddedImages(p.images.filter(isEmbeddedProductImage));
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
      const combinedImages = [...urls, ...editEmbeddedImages];
      if (combinedImages.length === 0 && editImageFiles.length === 0) {
        throw new Error('Add at least one product image (upload a file or paste an image URL)');
      }

      const editCat = resolvedEditCategory();

      const watchDetails =
        isWatch(editCat) &&
        (editCaseShape.trim() || editDial.trim() || editStrapType.trim() || editWatchColor.trim())
          ? {
              caseShape: editCaseShape.trim() || undefined,
              dial: editDial.trim() || undefined,
              strapType: editStrapType.trim() || undefined,
              color: editWatchColor.trim() || undefined,
            }
          : undefined;

      let braceletIds: string[] = [];
      if (isWatch(editCat)) {
        braceletIds = editMatchingBraceletIdsSelected.filter((id) => OBJECT_ID_RE.test(id));
        if (editMatchingBraceletIdsSelected.some((id) => !OBJECT_ID_RE.test(id))) {
          throw new Error('Invalid matching bracelet selection');
        }
      }

      let watchBraceletBundlePricePayload: number | null = null;
      if (isWatch(editCat) && braceletIds.length > 0 && editBundlePriceRupee.trim()) {
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

      payload.images = combinedImages;

      if (isWatch(editCat)) {
        payload.watchDetails = watchDetails ?? null;
        payload.matchingBraceletIds = braceletIds.length ? braceletIds : [];
        payload.watchBraceletBundlePrice = watchBraceletBundlePricePayload;
      } else {
        payload.watchDetails = null;
        payload.matchingBraceletIds = [];
        payload.watchBraceletBundlePrice = null;
      }

      if (isJewelleryCat(editCat)) {
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

      if (categoryIsCombo(editCat)) {
        const comboIds = editComboProductIdsSelected.filter((id) => OBJECT_ID_RE.test(id));
        if (comboIds.length < 2) throw new Error('Combo products must link at least two other products');
        payload.comboProductIds = comboIds;
      } else {
        payload.comboProductIds = [];
      }

      if (selectedCategoryUsesSizeOptions(editCat)) {
        const sizeOptions = splitList(editSizeOptionsInput);
        if (sizeOptions.length === 0) throw new Error('Add at least one size option');
        payload.sizeOptions = sizeOptions;
      } else if (editDimensionsNote.trim()) {
        payload.dimensions = { displayNote: editDimensionsNote.trim() };
        payload.sizeOptions = [];
      } else {
        payload.sizeOptions = [];
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
      setEditEmbeddedImages([]);
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
        isWatch(cat) && (caseShape.trim() || dial.trim() || strapType.trim() || watchColor.trim())
          ? {
              caseShape: caseShape.trim() || undefined,
              dial: dial.trim() || undefined,
              strapType: strapType.trim() || undefined,
              color: watchColor.trim() || undefined,
            }
          : undefined;

      let braceletIds: string[] = [];
      if (isWatch(cat)) {
        braceletIds = matchingBraceletIdsSelected.filter((id) => OBJECT_ID_RE.test(id));
        if (matchingBraceletIdsSelected.some((id) => !OBJECT_ID_RE.test(id))) {
          throw new Error('Invalid matching bracelet selection');
        }
      }

      let bundlePaise: number | undefined;
      if (isWatch(cat) && bundlePriceRupee.trim()) {
        const br = Number(bundlePriceRupee);
        if (!Number.isFinite(br) || br < 0) throw new Error('Invalid watch + bracelet bundle price');
        bundlePaise = Math.round(br * 100);
        if (braceletIds.length === 0) throw new Error('Pick matching bracelets before setting a bundle price');
      }

      const jewelryDetails =
        isJewelleryCat(cat) ? jewelryPayloadFromStrings(
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
        images: urls,
      };

      if (isWatch(cat)) {
        payload.watchDetails = watchDetails;
        payload.matchingBraceletIds = braceletIds.length ? braceletIds : undefined;
        payload.watchBraceletBundlePrice = bundlePaise;
      }

      if (jewelryDetails) payload.jewelryDetails = jewelryDetails;

      if (categoryIsCombo(cat)) {
        const comboIds = comboProductIdsSelected.filter((id) => OBJECT_ID_RE.test(id));
        if (comboIds.length < 2) throw new Error('Combo products must link at least two other products');
        payload.comboProductIds = comboIds;
      }

      if (selectedCategoryUsesSizeOptions(cat)) {
        const sizeOptions = splitList(sizeOptionsInput);
        if (sizeOptions.length === 0) throw new Error('Add at least one size option');
        payload.sizeOptions = sizeOptions;
      } else if (dimensionsNote.trim()) {
        payload.dimensions = { displayNote: dimensionsNote.trim() };
      }
      if (slugTrim.length > 0) payload.slug = slugTrim;

      if (imageFiles.length > 0) {
        const fd = new FormData();
        fd.append('data', JSON.stringify(payload));
        appendFilesToFormData(fd, imageFiles);
        await postMultipart('/api/admin/products', fd);
      } else {
        await postJson('/api/admin/products', payload);
      }
      setName('');
      setDescription('');
      setCategory(adminCategories[0]?.slug ?? '');
      setSubcategory('');
      setSku('');
      setSlug('');
      setCaseShape('');
      setDial('');
      setStrapType('');
      setWatchColor('');
      setMatchingBraceletIdsSelected([]);
      setComboProductIdsSelected([]);
      setBundlePriceRupee('');
      setMaterials('');
      setTags('');
      setJewelryMaterialType('');
      setJewelryFinish('');
      setJewelryStoneOrMotif('');
      setJewelryCustomization('');
      setDimensionsNote('');
      setSizeOptionsInput('');
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
      const res = await fetch(apiUrl(`/api/admin/products/${id}`), { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Delete failed');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const filteredCatalog = useMemo(() => {
    if (catalogFilterKey === 'all') return products;
    const cat = adminCategories.find((c) => c.slug === catalogFilterKey);
    if (!cat) return products;
    return products.filter((p) => productMatchesCategory(p.category, cat));
  }, [products, catalogFilterKey, adminCategories]);

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

      <CategoryFilterGroup
        categories={adminCategories}
        value={catalogFilterKey}
        ariaLabel="Filter catalog by category"
        onChange={setCatalogFilterKey}
        sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { textTransform: 'none' } }}
      />

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
        <DialogContent dividers sx={{ px: { xs: 2, sm: 3 } }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Price is in INR (rupees); stored in paise. For watches, pick matching bracelets from the searchable list
            (products in the Bracelets category).
          </Typography>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
              <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth required />
              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                minRows={2}
              />
              <Box sx={formGrid2Sx}>
                <CategorySelectField value={category} onChange={setCategory} />
                <SubcategorySelectField
                  categorySlug={category}
                  value={subcategory}
                  onChange={setSubcategory}
                  disabled={addSaving}
                />
              </Box>
              <Box sx={formGrid2Sx}>
                <TextField label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} fullWidth placeholder="SKU" />
                <TextField
                  label="Slug (optional)"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  fullWidth
                  placeholder="my-product-name"
                  helperText="Lowercase, hyphens only"
                />
              </Box>
              {categoryIsCombo(resolvedCategory()) && (
                <ComboProductsPicker
                  products={products}
                  selectedIds={comboProductIdsSelected}
                  onSelectedIdsChange={handleComboProductIdsChange}
                  excludeProductId={null}
                  disabled={addSaving}
                />
              )}
              {isWatch(resolvedCategory()) && (
                <>
                  <Box sx={formGrid2Sx}>
                    <TextField label="Case shape" value={caseShape} onChange={(e) => setCaseShape(e.target.value)} fullWidth />
                    <TextField label="Dial" value={dial} onChange={(e) => setDial(e.target.value)} fullWidth />
                  </Box>
                  <Box sx={formGrid2Sx}>
                    <TextField
                      label="Strap / attachment"
                      value={strapType}
                      onChange={(e) => setStrapType(e.target.value)}
                      fullWidth
                    />
                    <TextField label="Colour" value={watchColor} onChange={(e) => setWatchColor(e.target.value)} fullWidth />
                  </Box>
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
              {isJewelleryCat(resolvedCategory()) && (
                <>
                  <Box sx={formGrid2Sx}>
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
                  </Box>
                  <Box sx={formGrid2Sx}>
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
                  </Box>
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
              {selectedCategoryUsesSizeOptions(category) ? (
                <TextField
                  label="Size options"
                  value={sizeOptionsInput}
                  onChange={(e) => setSizeOptionsInput(e.target.value)}
                  fullWidth
                  required
                  helperText="Comma-separated sizes customers can choose (e.g. S, M, L or 17 cm, 19 cm)."
                />
              ) : (
                <TextField
                  label="Size / dimensions (customer-facing)"
                  value={dimensionsNote}
                  onChange={(e) => setDimensionsNote(e.target.value)}
                  fullWidth
                  helperText="Shown as read-only size text on the product page."
                />
              )}
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
              <Box sx={formGrid3Sx}>
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
                  helperText={comboCompareAtHelperText(
                    addComboCompareSumPaise,
                    comboProductIdsSelected.length,
                  )}
                />
                <TextField
                  label="Stock"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  fullWidth
                  type="number"
                  inputProps={{ min: 0, step: 1 }}
                />
              </Box>
              <TextField
                label="Image URLs (comma-separated)"
                value={imageUrls}
                onChange={(e) => setImageUrls(e.target.value)}
                fullWidth
              helperText="Direct https:// links or Google Drive share links (file must be shared as Anyone with the link). Uploads are stored as compressed base64."
            />
            <AdminMultiImageUpload
              files={imageFiles}
              onChange={setImageFiles}
              disabled={addSaving}
              helperText="Or upload image files — large photos are compressed automatically (up to 10 MB each)."
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

      <PremiumModal open={editOpen} onClose={() => !editSaving && setEditOpen(false)} fullWidth maxWidth="md" scroll="paper">
        <DialogTitle>Edit product</DialogTitle>
        <DialogContent dividers sx={{ px: { xs: 2, sm: 3 } }}>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
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
            <Box sx={formGrid2Sx}>
              <CategorySelectField value={editCategory} onChange={setEditCategory} disabled={editSaving} />
              <SubcategorySelectField
                categorySlug={editCategory}
                value={editSubcategory}
                onChange={setEditSubcategory}
                disabled={editSaving}
              />
            </Box>
            <Box sx={formGrid2Sx}>
              <TextField label="SKU" value={editSku} onChange={(e) => setEditSku(e.target.value)} fullWidth />
              <TextField label="Slug" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} fullWidth />
            </Box>
            {categoryIsCombo(resolvedEditCategory()) && (
              <ComboProductsPicker
                products={products}
                selectedIds={editComboProductIdsSelected}
                onSelectedIdsChange={handleEditComboProductIdsChange}
                excludeProductId={editId}
                disabled={editSaving}
              />
            )}
            {isWatch(resolvedEditCategory()) && (
              <>
                <Box sx={formGrid2Sx}>
                  <TextField label="Case shape" value={editCaseShape} onChange={(e) => setEditCaseShape(e.target.value)} fullWidth />
                  <TextField label="Dial" value={editDial} onChange={(e) => setEditDial(e.target.value)} fullWidth />
                </Box>
                <Box sx={formGrid2Sx}>
                  <TextField label="Strap / attachment" value={editStrapType} onChange={(e) => setEditStrapType(e.target.value)} fullWidth />
                  <TextField label="Colour" value={editWatchColor} onChange={(e) => setEditWatchColor(e.target.value)} fullWidth />
                </Box>
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
            {isJewelleryCat(resolvedEditCategory()) && (
              <>
                <Box sx={formGrid2Sx}>
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
                </Box>
                <Box sx={formGrid2Sx}>
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
                </Box>
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
            {selectedCategoryUsesSizeOptions(editCategory) ? (
              <TextField
                label="Size options"
                value={editSizeOptionsInput}
                onChange={(e) => setEditSizeOptionsInput(e.target.value)}
                fullWidth
                required
                disabled={editSaving}
                helperText="Comma-separated sizes customers can choose."
              />
            ) : (
              <TextField
                label="Size / dimensions (customer-facing)"
                value={editDimensionsNote}
                onChange={(e) => setEditDimensionsNote(e.target.value)}
                fullWidth
                disabled={editSaving}
              />
            )}
            <TextField label="Weight (g)" value={editWeightGrams} onChange={(e) => setEditWeightGrams(e.target.value)} type="number" fullWidth />
            <TextField
              label="Care instructions"
              value={editCareInstructions}
              onChange={(e) => setEditCareInstructions(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <Box sx={formGrid3Sx}>
              <TextField label="Price (INR)" value={editPriceRupee} onChange={(e) => setEditPriceRupee(e.target.value)} type="number" fullWidth />
              <TextField label="Compare-at (INR)" value={editCompareAtRupee} onChange={(e) => setEditCompareAtRupee(e.target.value)} type="number" fullWidth helperText={comboCompareAtHelperText(editComboCompareSumPaise, editComboProductIdsSelected.length)} />
              <TextField label="Stock" value={editStock} onChange={(e) => setEditStock(e.target.value)} type="number" fullWidth />
            </Box>
            <TextField
              label="Image URLs (comma-separated)"
              value={editImageUrls}
              onChange={(e) => setEditImageUrls(e.target.value)}
              fullWidth
              helperText="https:// or Google Drive share links (Anyone with the link). Uploads stored as base64."
            />
            <AdminMultiImageUpload
              files={editImageFiles}
              onChange={setEditImageFiles}
              disabled={editSaving}
              label="Upload additional image files"
              helperText="New uploads are appended (max 15 total)"
              existingUrls={[...splitList(editImageUrls), ...editEmbeddedImages]}
              onRemoveExistingUrl={removeEditExistingImage}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
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
