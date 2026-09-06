import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Stack,
  IconButton,
  Drawer,
} from '@mui/material';
import { apiFetch } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import type { ProductSummary } from '../types/product';
import { apiCategoryForFilter, parseCollectionFilterParam, priceFiltersForSelection, productMatchesPriceFilter, resolvePriceFilterParam, resolveSubcategoryParam, subcategoriesForFilter } from '../utils/catalogCategory';
import { shopSurface } from '../constants/shopSurface';
import { LuxuryShowcaseLoader } from '../components/loading';
import { seedCatalog } from '../utils/catalogCache';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { StorefrontSearchBar } from '../components/StorefrontSearchBar';
import { ShopFeaturedCarousel } from '../components/ShopFeaturedCarousel';
import { CategoryFilterGroup } from '../components/CategoryFilterGroup';
import { SubcategoryFilterGroup } from '../components/SubcategoryFilterGroup';
import { PriceFilterGroup } from '../components/PriceFilterGroup';
import { useCategories } from '../context/CategoriesContext';

function FilterIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden>
      <path d="M0 1h18M2 7h14M4 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, catalogRevision } = useCategories();
  const categoryParam = searchParams.get('category') ?? '';
  const subcategoryParam = searchParams.get('subcategory') ?? '';
  const priceFilterParam = searchParams.get('priceFilter') ?? '';
  const searchQuery = searchParams.get('q') ?? '';
  const activeFilterKey = parseCollectionFilterParam(categoryParam, categories);
  const apiCategory = apiCategoryForFilter(activeFilterKey);
  const subcategoryOptions = subcategoriesForFilter(categories, activeFilterKey);
  const apiSubcategory = resolveSubcategoryParam(subcategoryParam, subcategoryOptions);
  const priceFilterOptions = priceFiltersForSelection(categories, activeFilterKey, apiSubcategory);
  const activePriceFilter = resolvePriceFilterParam(priceFilterParam, priceFilterOptions);

  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (apiCategory) params.set('category', apiCategory);
    if (apiSubcategory) params.set('subcategory', apiSubcategory);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    const q = params.toString() ? `?${params}` : '';
    void (async () => {
      try {
        const data = await apiFetch<{ products: ProductSummary[] }>(`/api/products${q}`);
        setProducts(data.products);
        seedCatalog(data.products);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [apiCategory, apiSubcategory, searchQuery, catalogRevision]);

  function setSearchQuery(next: string) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        const trimmed = next.trim();
        if (!trimmed) params.delete('q');
        else params.set('q', trimmed);
        return params;
      },
      { replace: true },
    );
  }

  const visibleProducts = useMemo(
    () => products.filter((p) => productMatchesPriceFilter(p.price, activePriceFilter)),
    [products, activePriceFilter],
  );

  const bannerProducts =
    !apiCategory && !apiSubcategory && !searchQuery.trim() && !loading ? products : undefined;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: shopSurface.cream,
        color: shopSurface.ink,
        pb: { xs: 10, sm: 4 },
      }}
    >
      <StorefrontHeader />

      {/* Featured product carousel */}
      <ShopFeaturedCarousel products={bannerProducts} />

      <Box
        component="section"
        aria-label="Search products"
        sx={{
          px: { xs: 2, sm: 3 },
          pt: 2.5,
          pb: 1,
          bgcolor: shopSurface.creamDeep,
        }}
      >
        <Box sx={{ maxWidth: 760, mx: 'auto' }}>
          <Typography
            sx={{
              fontFamily: shopSurface.font.display,
              fontSize: { xs: '1.35rem', sm: '1.55rem' },
              color: shopSurface.ink,
              textAlign: 'center',
              mb: 2,
            }}
          >
            What are you looking for today?
          </Typography>
          <StorefrontSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={setSearchQuery}
            scrollTargetId="collections"
          />
        </Box>
      </Box>

      {/* Collections */}
      <Box
        id="collections"
        component="section"
        sx={{
          px: { xs: 2, sm: 3 },
          pt: 3.5,
          pb: 4,
          bgcolor: shopSurface.creamDeep,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Typography
            component="h2"
            sx={{
              fontFamily: shopSurface.font.display,
              fontWeight: 500,
              fontSize: '1.65rem',
              color: shopSurface.ink,
            }}
          >
            Collections
          </Typography>
          <IconButton
            aria-label="Filter collections"
            onClick={() => setFilterOpen(true)}
            sx={{
              width: 40,
              height: 40,
              borderRadius: 0,
              bgcolor: shopSurface.ink,
              color: shopSurface.white,
              '&:hover': { bgcolor: '#333' },
            }}
          >
            <FilterIcon />
          </IconButton>
        </Stack>

        <Stack spacing={2} sx={{ mb: 3 }}>
          <CategoryFilterGroup
            categories={categories}
            value={activeFilterKey}
            ariaLabel="Filter collections"
            onChange={(key) => {
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev);
                  if (key === 'all') next.delete('category');
                  else next.set('category', key);
                  next.delete('subcategory');
                  next.delete('priceFilter');
                  return next;
                },
                { replace: true },
              );
            }}
            sx={{
              flexWrap: 'wrap',
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontWeight: 600,
                px: 1.75,
                borderColor: 'rgba(26, 26, 26, 0.12)',
                color: shopSurface.ink,
              },
              '& .MuiToggleButton-root.Mui-selected': {
                bgcolor: shopSurface.ink,
                color: shopSurface.white,
                borderColor: shopSurface.ink,
                '&:hover': { bgcolor: '#333' },
              },
            }}
          />
          {subcategoryOptions.length > 0 ? (
            <SubcategoryFilterGroup
              subcategories={subcategoryOptions}
              value={apiSubcategory}
              onChange={(sub) => {
                setSearchParams(
                  (prev) => {
                    const next = new URLSearchParams(prev);
                    if (!sub) next.delete('subcategory');
                    else next.set('subcategory', sub);
                    next.delete('priceFilter');
                    return next;
                  },
                  { replace: true },
                );
              }}
              sx={{
                flexWrap: 'wrap',
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 1.5,
                  borderColor: 'rgba(26, 26, 26, 0.12)',
                  color: shopSurface.ink,
                },
                '& .MuiToggleButton-root.Mui-selected': {
                  bgcolor: shopSurface.ink,
                  color: shopSurface.white,
                  borderColor: shopSurface.ink,
                },
              }}
            />
          ) : null}
          {priceFilterOptions.length > 0 ? (
            <PriceFilterGroup
              filters={priceFilterOptions}
              value={activePriceFilter?.id ?? ''}
              onChange={(id) => {
                setSearchParams(
                  (prev) => {
                    const next = new URLSearchParams(prev);
                    if (!id) next.delete('priceFilter');
                    else next.set('priceFilter', id);
                    return next;
                  },
                  { replace: true },
                );
              }}
              sx={{
                flexWrap: 'wrap',
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 1.5,
                  borderColor: 'rgba(26, 26, 26, 0.12)',
                  color: shopSurface.ink,
                },
                '& .MuiToggleButton-root.Mui-selected': {
                  bgcolor: shopSurface.ink,
                  color: shopSurface.white,
                  borderColor: shopSurface.ink,
                },
              }}
            />
          ) : null}
        </Stack>

        {loading ? (
          <LuxuryShowcaseLoader variant="inline" tone="light" aria-label="Loading products" />
        ) : error ? (
          <Typography color="error" align="center">
            {error}
          </Typography>
        ) : visibleProducts.length === 0 ? (
          <Typography sx={{ color: shopSurface.inkMuted }} align="center">
            {searchQuery.trim()
              ? `No products match “${searchQuery.trim()}”. Try another keyword or clear search.`
              : 'No products found.'}
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {visibleProducts.map((p) => (
              <Grid item xs={6} sm={4} md={3} key={p.id}>
                <Box
                  sx={{
                    '& .MuiCard-root': {
                      bgcolor: 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(26, 26, 26, 0.08)',
                      borderRadius: 1,
                    },
                  }}
                >
                  <ProductCard product={p} tone="light" />
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <Drawer
        anchor="bottom"
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            px: 2,
            py: 3,
            bgcolor: shopSurface.cream,
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: shopSurface.font.display,
            fontSize: '1.25rem',
            mb: 2,
            color: shopSurface.ink,
          }}
        >
          Filter collections
        </Typography>
        <CategoryFilterGroup
          categories={categories}
          value={activeFilterKey}
          orientation="vertical"
          fullWidth
          ariaLabel="Filter collections"
          onChange={(key) => {
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev);
                if (key === 'all') next.delete('category');
                else next.set('category', key);
                next.delete('subcategory');
                next.delete('priceFilter');
                return next;
              },
              { replace: true },
            );
          }}
          sx={{
            '& .MuiToggleButton-root': {
              justifyContent: 'flex-start',
              textTransform: 'none',
              fontWeight: 600,
              py: 1.25,
              borderColor: 'rgba(26, 26, 26, 0.12)',
              color: shopSurface.ink,
              bgcolor: 'transparent',
              '&:hover': {
                bgcolor: 'rgba(26, 26, 26, 0.06)',
              },
            },
            '& .MuiToggleButton-root.Mui-selected': {
              bgcolor: shopSurface.ink,
              color: shopSurface.white,
              borderColor: shopSurface.ink,
              '&:hover': { bgcolor: '#333' },
            },
          }}
        />
        {subcategoryOptions.length > 0 && (
          <SubcategoryFilterGroup
            subcategories={subcategoryOptions}
            value={apiSubcategory}
            onChange={(sub) => {
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev);
                  if (!sub) next.delete('subcategory');
                  else next.set('subcategory', sub);
                  next.delete('priceFilter');
                  return next;
                },
                { replace: true },
              );
            }}
            sx={{
              mt: 2,
              flexWrap: 'wrap',
              '& .MuiToggleButton-root': {
                justifyContent: 'flex-start',
                textTransform: 'none',
                fontWeight: 500,
                py: 1,
                borderColor: 'rgba(26, 26, 26, 0.12)',
                color: shopSurface.ink,
              },
              '& .MuiToggleButton-root.Mui-selected': {
                bgcolor: shopSurface.ink,
                color: shopSurface.white,
                borderColor: shopSurface.ink,
              },
            }}
          />
        )}
        {priceFilterOptions.length > 0 && (
          <PriceFilterGroup
            filters={priceFilterOptions}
            value={activePriceFilter?.id ?? ''}
            onChange={(id) => {
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev);
                  if (!id) next.delete('priceFilter');
                  else next.set('priceFilter', id);
                  return next;
                },
                { replace: true },
              );
            }}
            sx={{
              mt: 2,
              flexWrap: 'wrap',
              '& .MuiToggleButton-root': {
                justifyContent: 'flex-start',
                textTransform: 'none',
                fontWeight: 500,
                py: 1,
                borderColor: 'rgba(26, 26, 26, 0.12)',
                color: shopSurface.ink,
              },
              '& .MuiToggleButton-root.Mui-selected': {
                bgcolor: shopSurface.ink,
                color: shopSurface.white,
                borderColor: shopSurface.ink,
              },
            }}
          />
        )}
      </Drawer>
    </Box>
  );
}
