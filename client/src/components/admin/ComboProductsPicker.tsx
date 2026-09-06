import { useMemo, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import type { AdminProductRow } from '../../types/product';
import type { CatalogCategory } from '../../utils/catalogCategory';
import { useCategories } from '../../context/CategoriesContext';
import { isComboCategory, productMatchesCategory } from '../../utils/catalogCategory';
import { handleProductImageError, PRODUCT_IMAGE_FALLBACK, resolveMediaUrl } from '../../utils/productImage';
import { IconChevronLeft } from '../../icons';
import { PremiumModal } from './premium';

type ComboProductsPickerProps = {
  products: AdminProductRow[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  excludeProductId: string | null;
  disabled?: boolean;
};

type PickerStep = 'categories' | 'products';

/** PremiumModal uses a dark paper — explicit contrast for labels inside the picker. */
const pickerColors = {
  title: '#f4f0e8',
  body: 'rgba(244, 240, 232, 0.92)',
  muted: 'rgba(244, 240, 232, 0.68)',
  surface: 'rgba(255, 255, 255, 0.06)',
  border: 'rgba(255, 255, 255, 0.14)',
  borderSelected: 'rgba(232, 216, 168, 0.95)',
};

function productMatchesSearch(product: AdminProductRow, query: string): boolean {
  if (!query) return true;
  const haystack = [product.name, product.sku, product.subcategory]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function CategoryTile({
  category,
  productCount,
  onSelect,
}: {
  category: CatalogCategory;
  productCount: number;
  onSelect: () => void;
}) {
  const image = resolveMediaUrl(category.tileImageUrl) || PRODUCT_IMAGE_FALLBACK;

  return (
    <Box
      component="button"
      type="button"
      onClick={onSelect}
      sx={{
        border: `1px solid ${pickerColors.border}`,
        p: 0,
        m: 0,
        cursor: 'pointer',
        textAlign: 'left',
        bgcolor: pickerColors.surface,
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 12px 28px rgba(0,0,0,0.28)',
          borderColor: 'rgba(255, 255, 255, 0.28)',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 3,
        },
      }}
    >
      <Box
        sx={{
          aspectRatio: '4 / 5',
          bgcolor: 'grey.900',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <Box
          component="img"
          src={image}
          alt={category.label}
          onError={handleProductImageError}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </Box>
      <Box sx={{ px: 1.5, py: 1.5, flex: 1 }}>
        <Typography
          variant="subtitle2"
          fontWeight={700}
          noWrap
          sx={{ color: pickerColors.title, letterSpacing: '0.02em', textTransform: 'none' }}
        >
          {category.label}
        </Typography>
        <Typography variant="caption" sx={{ color: pickerColors.muted, display: 'block', mt: 0.5 }}>
          {productCount} product{productCount === 1 ? '' : 's'}
        </Typography>
      </Box>
    </Box>
  );
}

function ProductImageTile({
  product,
  selected,
  disabled,
  onToggle,
}: {
  product: AdminProductRow;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const image = resolveMediaUrl(product.images[0]) || PRODUCT_IMAGE_FALLBACK;

  return (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={product.name}
      sx={{
        border: `1px solid ${selected ? pickerColors.borderSelected : pickerColors.border}`,
        p: 0,
        m: 0,
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
        bgcolor: pickerColors.surface,
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        opacity: disabled ? 0.6 : 1,
        boxShadow: selected ? '0 0 0 1px rgba(232, 216, 168, 0.35)' : 'none',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
        '&:hover:not(:disabled)': {
          transform: 'translateY(-1px)',
          borderColor: selected ? pickerColors.borderSelected : 'rgba(255, 255, 255, 0.28)',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 3,
        },
      }}
    >
      <Box sx={{ position: 'relative', aspectRatio: '4 / 5', bgcolor: 'grey.900', flexShrink: 0 }}>
        <Box
          component="img"
          src={image}
          alt=""
          onError={handleProductImageError}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {selected ? (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(0,0,0,0.32)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'grid',
                placeItems: 'center',
                fontSize: '1.35rem',
                fontWeight: 700,
              }}
            >
              ✓
            </Box>
          </Box>
        ) : null}
      </Box>
      <Box sx={{ px: 1.5, py: 1.25, minHeight: 56 }}>
        <Typography
          variant="body2"
          sx={{
            color: pickerColors.body,
            fontWeight: 600,
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {product.name}
        </Typography>
        {product.sku ? (
          <Typography variant="caption" noWrap sx={{ color: pickerColors.muted, display: 'block', mt: 0.5 }}>
            {product.sku}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

export function ComboProductsPicker({
  products,
  selectedIds,
  onSelectedIdsChange,
  excludeProductId,
  disabled,
}: ComboProductsPickerProps) {
  const { categories } = useCategories();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<PickerStep>('categories');
  const [activeCategory, setActiveCategory] = useState<CatalogCategory | null>(null);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const options = useMemo(
    () => products.filter((product) => excludeProductId == null || product.id !== excludeProductId),
    [products, excludeProductId],
  );

  const selectedProducts = useMemo(() => {
    const byId = new Map(options.map((product) => [product.id, product]));
    return selectedIds.map((id) => byId.get(id)).filter((product): product is AdminProductRow => product != null);
  }, [options, selectedIds]);

  const nonComboCategories = useMemo(() => {
    return [...categories]
      .filter((category) => category.isActive !== false && !isComboCategory(category))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  }, [categories]);

  const productCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const category of nonComboCategories) {
      const count = options.filter((product) => productMatchesCategory(product.category, category)).length;
      if (count > 0) counts.set(category.slug, count);
    }
    return counts;
  }, [nonComboCategories, options]);

  const browseableCategories = useMemo(
    () => nonComboCategories.filter((category) => (productCountByCategory.get(category.slug) ?? 0) > 0),
    [nonComboCategories, productCountByCategory],
  );

  const categoryProducts = useMemo(() => {
    if (!activeCategory) return [];
    const query = search.trim().toLowerCase();
    return options
      .filter(
        (product) =>
          productMatchesCategory(product.category, activeCategory) && productMatchesSearch(product, query),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeCategory, options, search]);

  function resetPickerState() {
    setStep('categories');
    setActiveCategory(null);
    setSearch('');
  }

  function openPicker() {
    setDraftIds(selectedIds);
    resetPickerState();
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);
    resetPickerState();
  }

  function selectCategory(category: CatalogCategory) {
    setActiveCategory(category);
    setSearch('');
    setStep('products');
  }

  function backToCategories() {
    setStep('categories');
    setActiveCategory(null);
    setSearch('');
  }

  function toggleDraft(productId: string) {
    setDraftIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );
  }

  function applySelection() {
    onSelectedIdsChange(draftIds);
    closePicker();
  }

  function removeSelected(productId: string) {
    onSelectedIdsChange(selectedIds.filter((id) => id !== productId));
  }

  const dialogTitle =
    step === 'categories'
      ? 'Choose a category'
      : activeCategory
        ? activeCategory.label
        : 'Choose products';

  return (
    <>
      <Stack spacing={1.25}>
        <Typography variant="body2" color="text.secondary">
          Pick at least two products. Customers get all of them when they add this combo to cart.
        </Typography>

        {selectedProducts.length > 0 ? (
          <Stack direction="row" flexWrap="wrap" gap={0.75}>
            {selectedProducts.map((product) => (
              <Chip
                key={product.id}
                size="small"
                label={product.name}
                onDelete={disabled ? undefined : () => removeSelected(product.id)}
              />
            ))}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">
            No linked products selected yet.
          </Typography>
        )}

        <Button variant="outlined" onClick={openPicker} disabled={disabled} sx={{ alignSelf: 'flex-start' }}>
          {selectedProducts.length > 0 ? 'Edit linked products' : 'Choose linked products'}
        </Button>
      </Stack>

      <PremiumModal
        open={open}
        onClose={closePicker}
        fullWidth
        maxWidth="xl"
        scroll="paper"
        aria-labelledby="combo-products-picker-title"
      >
        <DialogTitle
          id="combo-products-picker-title"
          sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 2, color: pickerColors.title }}
        >
          {step === 'products' ? (
            <IconButton
              aria-label="Back to categories"
              onClick={backToCategories}
              size="small"
              sx={{ mr: 0.5, color: pickerColors.body }}
            >
              <IconChevronLeft />
            </IconButton>
          ) : null}
          <Box component="span" sx={{ flex: 1 }}>{dialogTitle}</Box>
        </DialogTitle>

        <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2.5, minHeight: { sm: 420 } }}>
          {step === 'categories' ? (
            browseableCategories.length === 0 ? (
              <Typography variant="body2" sx={{ color: pickerColors.muted, py: 6, textAlign: 'center' }}>
                No products available in non-combo categories.
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, minmax(0, 1fr))',
                    sm: 'repeat(3, minmax(0, 1fr))',
                    md: 'repeat(4, minmax(0, 1fr))',
                  },
                  gap: { xs: 2, sm: 2.5 },
                }}
              >
                {browseableCategories.map((category) => (
                  <CategoryTile
                    key={category.slug}
                    category={category}
                    productCount={productCountByCategory.get(category.slug) ?? 0}
                    onSelect={() => selectCategory(category)}
                  />
                ))}
              </Box>
            )
          ) : (
            <Stack spacing={2}>
              <TextField
                fullWidth
                size="small"
                label="Search in this category"
                placeholder="Filter by name or SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />

              {categoryProducts.length === 0 ? (
                <Typography variant="body2" sx={{ color: pickerColors.muted, py: 6, textAlign: 'center' }}>
                  No products match your search in this category.
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(2, minmax(0, 1fr))',
                      sm: 'repeat(3, minmax(0, 1fr))',
                      md: 'repeat(4, minmax(0, 1fr))',
                      lg: 'repeat(5, minmax(0, 1fr))',
                    },
                    gap: { xs: 1.5, sm: 2 },
                  }}
                >
                  {categoryProducts.map((product) => (
                    <ProductImageTile
                      key={product.id}
                      product={product}
                      selected={draftIds.includes(product.id)}
                      disabled={disabled}
                      onToggle={() => toggleDraft(product.id)}
                    />
                  ))}
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ color: pickerColors.muted }}>
            {draftIds.length} selected {draftIds.length < 2 ? '· pick at least 2' : ''}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button onClick={closePicker}>Cancel</Button>
            <Button variant="contained" onClick={applySelection} disabled={disabled}>
              Done
            </Button>
          </Stack>
        </DialogActions>
      </PremiumModal>
    </>
  );
}
