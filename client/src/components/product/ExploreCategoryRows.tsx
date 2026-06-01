import { useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { Link as RouterLink } from 'react-router-dom';
import type { ProductSummary } from '../../types/product';
import { ProductCard } from '../ProductCard';
import { editorialSurface } from '../../constants/editorialSurface';
import { IconChevronLeft, IconChevronRight } from '../../icons';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const CATEGORY_ROWS = [
  {
    category: 'Jewellery',
    label: 'Jewellery',
    subtitle: 'Curated pieces',
    shopTo: '/shop?category=Jewellery',
  },
  {
    category: 'Watches',
    label: 'Watches',
    subtitle: 'Precision time',
    shopTo: '/shop?category=Watches',
  },
  {
    category: 'Bracelets',
    label: 'Bracelets',
    subtitle: 'Fine details',
    shopTo: '/shop?category=Bracelets',
  },
] as const;

const PRODUCTS_PER_ROW = 5;

type ExploreCategoryRowsProps = {
  catalog: ProductSummary[];
  excludeProductId?: string;
};

function CategoryProductRow({
  label,
  subtitle,
  shopTo,
  products,
}: {
  label: string;
  subtitle: string;
  shopTo: string;
  products: ProductSummary[];
}) {
  const reduced = useReducedMotion();
  const rowRef = useRef<HTMLDivElement>(null);

  function scrollRow(delta: number) {
    rowRef.current?.scrollBy({ left: delta, behavior: reduced ? 'auto' : 'smooth' });
  }

  return (
    <Box sx={{ mb: { xs: 4, md: 5 } }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box>
          <Typography
            component={RouterLink}
            to={shopTo}
            sx={{
              fontFamily: editorialSurface.font.headline,
              fontWeight: 300,
              fontSize: { xs: '1.35rem', md: '1.5rem' },
              color: editorialSurface.onSurface,
              textDecoration: 'none',
              display: 'block',
              '&:hover': { color: editorialSurface.onSurfaceVariant },
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              ...editorialSurface.label,
              fontSize: '0.6875rem',
              color: editorialSurface.outline,
              letterSpacing: '0.18em',
              mt: 0.35,
            }}
          >
            {subtitle}
          </Typography>
        </Box>
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1 }}>
          <IconButton
            aria-label={`Scroll ${label} left`}
            onClick={() => scrollRow(-220)}
            sx={{
              width: 36,
              height: 36,
              borderRadius: 0,
              border: `1px solid ${editorialSurface.outlineVariant}`,
              color: editorialSurface.onSurface,
            }}
          >
            <IconChevronLeft />
          </IconButton>
          <IconButton
            aria-label={`Scroll ${label} right`}
            onClick={() => scrollRow(220)}
            sx={{
              width: 36,
              height: 36,
              borderRadius: 0,
              border: `1px solid ${editorialSurface.outlineVariant}`,
              color: editorialSurface.onSurface,
            }}
          >
            <IconChevronRight />
          </IconButton>
        </Box>
      </Box>

      <Box
        ref={rowRef}
        sx={{
          display: 'flex',
          gap: { xs: 1.5, sm: 2 },
          overflowX: 'auto',
          pb: 1,
          mx: { xs: -2, sm: 0 },
          px: { xs: 2, sm: 0 },
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {products.map((product) => (
          <Box
            key={product.id}
            sx={{
              flex: '0 0 auto',
              width: { xs: 152, sm: 176, md: 192 },
              scrollSnapAlign: 'start',
            }}
          >
            <ProductCard product={product} tone="light" imageFrame="editorial" />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function ExploreCategoryRows({ catalog, excludeProductId }: ExploreCategoryRowsProps) {
  const rows = CATEGORY_ROWS.map((row) => ({
    ...row,
    products: catalog
      .filter(
        (p) =>
          p.isActive !== false &&
          p.id !== excludeProductId &&
          p.category === row.category,
      )
      .slice(0, PRODUCTS_PER_ROW),
  })).filter((row) => row.products.length > 0);

  if (rows.length === 0) return null;

  return (
    <Box
      component="section"
      sx={{
        px: 2,
        py: { xs: 5, md: 7 },
        bgcolor: editorialSurface.background,
      }}
    >
      <Box sx={{ maxWidth: 960, mx: 'auto' }}>
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography
            sx={{
              ...editorialSurface.label,
              color: editorialSurface.outline,
              letterSpacing: '0.3em',
              mb: 0.75,
              display: 'block',
            }}
          >
            Curation
          </Typography>
          <Typography
            sx={{
              fontFamily: editorialSurface.font.headline,
              fontWeight: 300,
              fontSize: { xs: '1.75rem', md: '2rem' },
              color: editorialSurface.onSurface,
            }}
          >
            Explore categories
          </Typography>
        </Box>

        {rows.map((row) => (
          <CategoryProductRow
            key={row.category}
            label={row.label}
            subtitle={row.subtitle}
            shopTo={row.shopTo}
            products={row.products}
          />
        ))}
      </Box>
    </Box>
  );
}
