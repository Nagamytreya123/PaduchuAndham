import { useEffect, useState } from 'react';
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
import { apiCategoryForFilter, parseCollectionFilterParam, priceFiltersForSelection, resolvePriceFilterParam, resolveSubcategoryParam, subcategoriesForFilter } from '../utils/catalogCategory';
import {
  DEFAULT_SHOP_PAGE_SIZE,
  parseShopPage,
  parseShopPageSize,
  type ShopPageSize,
} from '../constants/shopPagination';
import { shopSurface } from '../constants/shopSurface';
import { ShopPagination, emptyShopPagination } from '../components/shop/ShopPagination';
import type { ProductListPagination } from '../types/pagination';
import { BrandFillLoader } from '../components/loading';
import { useMinimumLoading } from '../hooks/useMinimumLoading';
import { seedCatalog } from '../utils/catalogCache';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { StorefrontSearchBar } from '../components/StorefrontSearchBar';
import { BestSellersShowcase } from '../components/landing/BestSellersShowcase';
import { CategoryFilterGroup } from '../components/CategoryFilterGroup';
import { SubcategoryFilterGroup } from '../components/SubcategoryFilterGroup';
import { PriceFilterGroup } from '../components/PriceFilterGroup';
import { useCategories } from '../context/CategoriesContext';
import type { SxProps, Theme } from '@mui/material/styles';

function shopFilterToggleSx(options?: {
  fontWeight?: number;
  px?: number;
  py?: number;
  minHeight?: number;
  justifyContent?: string;
  flexWrap?: boolean;
  transparent?: boolean;
}): SxProps<Theme> {
  return {
    ...(options?.flexWrap ? { flexWrap: 'wrap' } : null),
    '& .MuiToggleButton-root': {
      textTransform: 'none',
      fontWeight: options?.fontWeight ?? 500,
      fontSize: '0.75rem',
      lineHeight: 1.2,
      minHeight: options?.minHeight ?? 30,
      px: options?.px ?? 1.1,
      py: options?.py ?? 0.45,
      ...(options?.justifyContent ? { justifyContent: options.justifyContent } : null),
      borderColor: shopSurface.filterToggle.border,
      color: shopSurface.ink,
      bgcolor: options?.transparent ? 'transparent' : shopSurface.white,
      '&:hover': {
        bgcolor: shopSurface.filterToggle.hoverBg,
      },
    },
    '& .MuiToggleButton-root.Mui-selected': {
      bgcolor: shopSurface.filterToggle.selectedBg,
      color: shopSurface.white,
      borderColor: shopSurface.filterToggle.selectedBorder,
      '&:hover': { bgcolor: shopSurface.filterToggle.selectedHoverBg },
    },
  };
}

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
  const page = parseShopPage(searchParams.get('page'));
  const pageSize = parseShopPageSize(searchParams.get('pageSize'));
  const activeFilterKey = parseCollectionFilterParam(categoryParam, categories);
  const apiCategory = apiCategoryForFilter(activeFilterKey);
  const subcategoryOptions = subcategoriesForFilter(categories, activeFilterKey);
  const apiSubcategory = resolveSubcategoryParam(subcategoryParam, subcategoryOptions);
  const priceFilterOptions = priceFiltersForSelection(categories, activeFilterKey, apiSubcategory);
  const activePriceFilter = resolvePriceFilterParam(priceFilterParam, priceFilterOptions);

  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [pagination, setPagination] = useState<ProductListPagination>(() => emptyShopPagination(pageSize));
  const [loading, setLoading] = useState(true);
  const showLoading = useMinimumLoading(loading);
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterScrollKey = `${apiCategory}|${apiSubcategory}|${searchQuery.trim()}|${activePriceFilter?.id ?? ''}|${page}|${pageSize}`;

  function setPageParam(nextPage: number) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (nextPage <= 1) params.delete('page');
        else params.set('page', String(nextPage));
        return params;
      },
      { replace: true },
    );
  }

  function setPageSizeParam(nextPageSize: ShopPageSize) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (nextPageSize === DEFAULT_SHOP_PAGE_SIZE) params.delete('pageSize');
        else params.set('pageSize', String(nextPageSize));
        params.delete('page');
        return params;
      },
      { replace: true },
    );
  }

  function updateCollectionParams(update: (params: URLSearchParams) => void) {
    setFilterOpen(false);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        update(next);
        return next;
      },
      { replace: true },
    );
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (apiCategory) params.set('category', apiCategory);
    if (apiSubcategory) params.set('subcategory', apiSubcategory);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (activePriceFilter?.id) params.set('priceFilter', activePriceFilter.id);
    params.set('page', String(page));
    params.set('limit', String(pageSize));
    const q = `?${params}`;
    void (async () => {
      try {
        const data = await apiFetch<{ products: ProductSummary[]; pagination?: ProductListPagination }>(
          `/api/products${q}`,
        );
        setProducts(data.products);
        setPagination(data.pagination ?? emptyShopPagination(pageSize));
        seedCatalog(data.products);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setProducts([]);
        setPagination(emptyShopPagination(pageSize));
      } finally {
        setLoading(false);
      }
    })();
  }, [apiCategory, apiSubcategory, searchQuery, activePriceFilter?.id, page, pageSize, catalogRevision]);

  function setSearchQuery(next: string) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        const trimmed = next.trim();
        if (!trimmed) params.delete('q');
        else params.set('q', trimmed);
        params.delete('page');
        return params;
      },
      { replace: true },
    );
  }

  const bannerProducts = undefined;

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

      <BestSellersShowcase products={bannerProducts} variant="shop" />

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

        <Stack spacing={1.25} sx={{ mb: 2.5 }}>
          <CategoryFilterGroup
            categories={categories}
            value={activeFilterKey}
            ariaLabel="Filter collections"
            onChange={(key) => {
              updateCollectionParams((next) => {
                if (key === 'all') next.delete('category');
                else next.set('category', key);
                next.delete('subcategory');
                next.delete('priceFilter');
                next.delete('page');
              });
            }}
            sx={shopFilterToggleSx({
              fontWeight: 600,
              px: 1.25,
              py: 0.65,
              minHeight: 36,
              flexWrap: true,
            })}
          />
          {subcategoryOptions.length > 0 ? (
            <SubcategoryFilterGroup
              subcategories={subcategoryOptions}
              value={apiSubcategory}
              onChange={(sub) => {
                updateCollectionParams((next) => {
                  if (!sub) next.delete('subcategory');
                  else next.set('subcategory', sub);
                  next.delete('priceFilter');
                  next.delete('page');
                });
              }}
              sx={shopFilterToggleSx({ flexWrap: true })}
            />
          ) : null}
          {priceFilterOptions.length > 0 ? (
            <PriceFilterGroup
              filters={priceFilterOptions}
              value={activePriceFilter?.id ?? ''}
              onChange={(id) => {
                setFilterOpen(false);
                setSearchParams(
                  (prev) => {
                    const next = new URLSearchParams(prev);
                    if (!id) next.delete('priceFilter');
                    else next.set('priceFilter', id);
                    next.delete('page');
                    return next;
                  },
                  { replace: true },
                );
              }}
              sx={shopFilterToggleSx({ flexWrap: true, px: 0.75, py: 0.4, minHeight: 28 })}
            />
          ) : null}
        </Stack>

        {showLoading ? (
          <BrandFillLoader
            id="shop-products-loader"
            variant="inline"
            scrollIntoView
            scrollToken={filterScrollKey}
            aria-label="Loading products"
          />
        ) : error ? (
          <Typography color="error" align="center">
            {error}
          </Typography>
        ) : products.length === 0 ? (
          <Typography sx={{ color: shopSurface.inkMuted }} align="center">
            {searchQuery.trim()
              ? `No products match “${searchQuery.trim()}”. Try another keyword or clear search.`
              : 'No products found.'}
          </Typography>
        ) : (
          <>
            <Grid container spacing={2}>
              {products.map((p) => (
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
                    <ProductCard product={p} tone="light" layout="shop" />
                  </Box>
                </Grid>
              ))}
            </Grid>
            <ShopPagination
              pagination={pagination}
              pageSize={pageSize}
              disabled={showLoading}
              onPageChange={setPageParam}
              onPageSizeChange={setPageSizeParam}
            />
          </>
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
            updateCollectionParams((next) => {
              if (key === 'all') next.delete('category');
              else next.set('category', key);
              next.delete('subcategory');
              next.delete('priceFilter');
              next.delete('page');
            });
          }}
          sx={shopFilterToggleSx({
            fontWeight: 600,
            py: 0.75,
            minHeight: 36,
            justifyContent: 'flex-start',
            transparent: true,
          })}
        />
        {subcategoryOptions.length > 0 && (
          <SubcategoryFilterGroup
            subcategories={subcategoryOptions}
            value={apiSubcategory}
            onChange={(sub) => {
              updateCollectionParams((next) => {
                if (!sub) next.delete('subcategory');
                else next.set('subcategory', sub);
                next.delete('priceFilter');
                next.delete('page');
              });
            }}
            sx={{
              mt: 2,
              ...shopFilterToggleSx({
                py: 0.55,
                justifyContent: 'flex-start',
                flexWrap: true,
              }),
            }}
          />
        )}
        {priceFilterOptions.length > 0 && (
          <PriceFilterGroup
            filters={priceFilterOptions}
            value={activePriceFilter?.id ?? ''}
            onChange={(id) => {
              setFilterOpen(false);
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev);
                  if (!id) next.delete('priceFilter');
                  else next.set('priceFilter', id);
                  next.delete('page');
                  return next;
                },
                { replace: true },
              );
            }}
            sx={{
              mt: 2,
              ...shopFilterToggleSx({
                px: 0.75,
                py: 0.4,
                minHeight: 28,
                justifyContent: 'flex-start',
                flexWrap: true,
              }),
            }}
          />
        )}
      </Drawer>
    </Box>
  );
}
