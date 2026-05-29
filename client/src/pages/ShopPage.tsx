import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Skeleton,
  Button,
  Stack,
  IconButton,
  Drawer,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { apiFetch } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import type { ProductSummary } from '../types/product';
import type { JewelleryComboSummary } from '../types/jewelleryCombo';
import {
  STOREFRONT_COLLECTION_FILTERS,
  filterKeyToApiCategory,
  searchParamToFilterKey,
  type StorefrontCollectionFilterKey,
} from '../constants/collectionCategoryFilters';
import { shopSurface, SHOP_HERO_IMAGE } from '../constants/shopSurface';
import { JewelleryComboStorefrontCard } from '../components/JewelleryComboStorefrontCard';
import { StorefrontHeader } from '../components/StorefrontHeader';

function FilterIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden>
      <path d="M0 1h18M2 7h14M4 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') ?? '';
  const activeFilterKey = searchParamToFilterKey(categoryParam);
  const apiCategory = filterKeyToApiCategory(activeFilterKey);
  const showComboFilterView = activeFilterKey === 'Combos';

  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [combos, setCombos] = useState<JewelleryComboSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [combosLoading, setCombosLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ combos: JewelleryComboSummary[] }>('/api/jewellery-combos');
        setCombos(data.combos);
      } catch {
        setCombos([]);
      } finally {
        setCombosLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (showComboFilterView) {
      setProducts([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (apiCategory) params.set('category', apiCategory);
    const q = params.toString() ? `?${params}` : '';
    void (async () => {
      try {
        const data = await apiFetch<{ products: ProductSummary[] }>(`/api/products${q}`);
        setProducts(data.products);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [apiCategory, showComboFilterView]);

  function scrollToCollections() {
    document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' });
  }

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

      {/* Hero */}
      <Box component="section" sx={{ position: 'relative' }}>
        <Box sx={{ height: 10, bgcolor: shopSurface.bandTop }} />
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: { xs: '3/4', sm: '4/5' },
            maxHeight: { sm: 640 },
            overflow: 'hidden',
            bgcolor: '#e8e2d8',
          }}
        >
          <Box
            component="img"
            src={SHOP_HERO_IMAGE}
            alt="Winter collection editorial"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 20%',
              display: 'block',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 40%, transparent 70%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              pb: { xs: 5, sm: 6 },
              px: 2,
            }}
          >
            <Typography
              component="h1"
              sx={{
                fontFamily: shopSurface.font.display,
                fontWeight: 400,
                fontSize: { xs: '2.25rem', sm: '2.75rem' },
                color: shopSurface.white,
                textAlign: 'center',
                mb: 2.5,
                lineHeight: 1.15,
                textShadow: '0 2px 24px rgba(0,0,0,0.25)',
              }}
            >
              The Winter Anthology
            </Typography>
            <Button
              onClick={scrollToCollections}
              sx={{
                bgcolor: shopSurface.ink,
                color: shopSurface.white,
                fontFamily: shopSurface.font.body,
                fontSize: '0.68rem',
                fontWeight: 600,
                letterSpacing: '0.22em',
                px: 3.5,
                py: 1.35,
                borderRadius: 0,
                minWidth: 200,
                '&:hover': { bgcolor: '#333' },
              }}
            >
              SHOP THE LOOK
            </Button>
          </Box>
        </Box>
        <Box sx={{ height: 14, bgcolor: shopSurface.bandBottom }} />
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

        {showComboFilterView ? (
          combosLoading ? (
            <Grid container spacing={2}>
              {[1, 2, 3, 4].map((k) => (
                <Grid item xs={6} sm={4} md={3} key={k}>
                  <Skeleton variant="rectangular" height={280} />
                </Grid>
              ))}
            </Grid>
          ) : combos.length === 0 ? (
            <Typography sx={{ color: shopSurface.inkMuted }} align="center">
              No jewellery sets available yet.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {combos.map((c, index) => (
                <JewelleryComboStorefrontCard key={c.id} combo={c} index={index} variant="light" />
              ))}
            </Grid>
          )
        ) : loading ? (
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map((k) => (
              <Grid item xs={6} sm={4} md={3} key={k}>
                <Skeleton variant="rectangular" height={260} />
              </Grid>
            ))}
          </Grid>
        ) : error ? (
          <Typography color="error" align="center">
            {error}
          </Typography>
        ) : products.length === 0 ? (
          <Typography sx={{ color: shopSurface.inkMuted }} align="center">
            No products found.
          </Typography>
        ) : (
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
        <ToggleButtonGroup
          exclusive
          value={activeFilterKey}
          orientation="vertical"
          fullWidth
          onChange={(_e, key: StorefrontCollectionFilterKey | null) => {
            if (key == null) return;
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev);
                if (key === 'all') next.delete('category');
                else if (key === 'Combos') next.set('category', 'combos');
                else next.set('category', filterKeyToApiCategory(key));
                return next;
              },
              { replace: true },
            );
            setFilterOpen(false);
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
        >
          {STOREFRONT_COLLECTION_FILTERS.map((opt) => (
            <ToggleButton key={opt.key} value={opt.key}>
              {opt.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Drawer>
    </Box>
  );
}
