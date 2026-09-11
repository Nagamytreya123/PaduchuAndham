import { useMemo, useState, type MouseEvent } from 'react';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import type { SxProps, Theme } from '@mui/material/styles';
import { IconAdd } from '../icons';
import { useCart } from '../context/CartContext';
import { useCategories } from '../context/CategoriesContext';
import { useToast } from '../context/ToastContext';
import type { ProductSummary } from '../types/product';
import { quickAddProductSummary } from '../utils/quickAddToCart';

type ProductCardAddButtonProps = {
  product: ProductSummary;
  tone?: 'light' | 'dark';
  sx?: SxProps<Theme>;
};

export function ProductCardAddButton({ product, tone = 'light', sx }: ProductCardAddButtonProps) {
  const { add, addBundle } = useCart();
  const { categories } = useCategories();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const outOfStock = product.stock < 1 || product.isActive === false;

  const comboCategoryKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const c of categories) {
      if (c.isCombo !== true || c.isActive === false) continue;
      keys.add(c.slug.trim().toLowerCase());
      keys.add(c.label.trim().toLowerCase());
    }
    return keys;
  }, [categories]);

  async function handleClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock || busy) return;
    setBusy(true);
    try {
      const result = await quickAddProductSummary(product, add, addBundle, comboCategoryKeys, categories);
      if (result === 'added') {
        showToast('Item added to cart');
      } else if (result === 'needs_size') {
        showToast('Select a size on the product page');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <IconButton
      size="small"
      disabled={outOfStock || busy}
      aria-label={outOfStock ? 'Out of stock' : 'Add to cart'}
      onClick={(e) => void handleClick(e)}
      sx={[
        {
          flexShrink: 0,
          width: 32,
          height: 32,
          border: '1px solid',
          ...(tone === 'light'
            ? {
                bgcolor: 'rgba(26, 26, 26, 0.06)',
                borderColor: 'rgba(26, 26, 26, 0.14)',
                color: '#1a1a1a',
                '&:hover': { bgcolor: 'rgba(26, 26, 26, 0.1)' },
              }
            : {
                bgcolor: 'rgba(255, 255, 255, 0.08)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: '#f5f5f5',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.14)' },
              }),
          '&.Mui-disabled': {
            opacity: 0.45,
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {busy ? (
        <CircularProgress size={18} color="inherit" />
      ) : (
        <IconAdd fontSize="small" />
      )}
    </IconButton>
  );
}
