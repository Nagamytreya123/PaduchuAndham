import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Stack,
  Container,
} from '@mui/material';
import { apiFetch } from '../api/client';
import { shopSurface } from '../constants/shopSurface';
import { homeSurface } from '../constants/homeSurface';
import { useCategories } from '../context/CategoriesContext';
import {
  HomeCategoryHero,
  HomeCategorySection,
  HomeHeroHeader,
} from '../components/home';
import { useCategorySlideDirection } from '../hooks/useCategorySlideDirection';
import StackSpread from '@/components/ui/stack-spread';
import { getCategoryExploreHeadline } from '../constants/categoryHeroContent';
import { useStorefrontProducts } from '../hooks/useStorefrontProducts';
import {
  buildStackSpreadCards,
  getCategoryStackSpreadItems,
} from '../utils/categoryStackSpread';
import {
  findCatalogCategory,
  parseCollectionFilterParam,
  shopPathForCategorySlug,
  type CollectionFilterKey,
} from '../utils/catalogCategory';

const EMPTY_SOCIAL_LINKS = {
  instagram: null as string | null,
  youtube: null as string | null,
  facebook: null as string | null,
};

const DEFAULT_INSTAGRAM_URL = 'https://www.instagram.com/paduchu_andham_jewellery/';

export function HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useCategories();
  const categoryParam = searchParams.get('category') ?? '';
  const activeFilterKey = parseCollectionFilterParam(categoryParam, categories);
  const [searchQuery, setSearchQuery] = useState('');
  const [socialLinks, setSocialLinks] = useState(EMPTY_SOCIAL_LINKS);
  const defaultedCategory = useRef(false);
  const { products } = useStorefrontProducts();

  const shopCategories = useMemo(
    () => categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  const categorySlideKeys = useMemo(
    () => shopCategories.map((category) => category.slug),
    [shopCategories],
  );

  const slideDirection = useCategorySlideDirection(activeFilterKey, categorySlideKeys);

  const activeCategory = useMemo(
    () => findCatalogCategory(activeFilterKey, shopCategories),
    [activeFilterKey, shopCategories],
  );

  const stackSpreadCards = useMemo(
    () =>
      buildStackSpreadCards(
        getCategoryStackSpreadItems(activeCategory, shopCategories, products),
      ),
    [activeCategory, shopCategories, products],
  );

  const exploreHeadline = useMemo(
    () => getCategoryExploreHeadline(activeCategory),
    [activeCategory],
  );

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{
          settings: {
            socialLinks?: { instagram: string | null; youtube: string | null; facebook: string | null };
          };
        }>('/api/site-settings');
        const links = data.settings.socialLinks;
        setSocialLinks({
          instagram: links?.instagram ?? DEFAULT_INSTAGRAM_URL,
          youtube: links?.youtube ?? null,
          facebook: links?.facebook ?? null,
        });
      } catch {
        setSocialLinks({
          ...EMPTY_SOCIAL_LINKS,
          instagram: DEFAULT_INSTAGRAM_URL,
        });
      }
    })();
  }, []);

  function handleSearchSubmit(next: string) {
    const trimmed = next.trim();
    if (!trimmed) {
      navigate('/shop');
      return;
    }
    navigate(`/shop?q=${encodeURIComponent(trimmed)}`);
  }

  function handleCategoryChange(key: CollectionFilterKey) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (key === 'all') next.delete('category');
        else next.set('category', key);
        return next;
      },
      { replace: true },
    );
  }

  useLayoutEffect(() => {
    if (defaultedCategory.current || shopCategories.length === 0) return;
    if (activeFilterKey !== 'all') {
      defaultedCategory.current = true;
      return;
    }
    defaultedCategory.current = true;
    handleCategoryChange(shopCategories[0]!.slug);
  }, [activeFilterKey, shopCategories]);

  return (
    <Box
      sx={{
        background: homeSurface.pageGradient,
        minHeight: '100vh',
        color: homeSurface.ink,
      }}
    >
      <HomeHeroHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
      />

      <Box
        sx={{
          maxWidth: 920,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 3 },
        }}
      >
        <HomeCategorySection value={activeFilterKey} onChange={handleCategoryChange} />
      </Box>

      <HomeCategoryHero
        activeCategory={activeFilterKey}
        products={products}
        slideDirection={slideDirection}
      />

      <div className="relative" style={{ background: homeSurface.carouselBg }}>
        <header
          className="relative z-30 w-full px-4 pb-2 pt-4 text-center sm:px-8 sm:pb-3 sm:pt-6"
          style={{ background: homeSurface.carouselBg }}
        >
          <h2
            className="mx-auto inline-flex max-w-5xl flex-wrap items-baseline justify-center gap-x-1.5 text-2xl font-normal text-brand-ink sm:text-3xl md:text-4xl"
            style={{ fontFamily: homeSurface.font.display }}
          >
            <span>Discover pieces made to make every moment</span>
            <span style={{ color: homeSurface.accent }}>shine</span>
          </h2>
        </header>

        <div className="relative z-0 -mt-[16rem]">
          <StackSpread
            key={activeFilterKey}
            cards={stackSpreadCards}
            scrollLength={220}
            bgColor={homeSurface.carouselBg}
            textColor={homeSurface.ink}
            cardRadius={12}
            headlineLead={exploreHeadline.lead}
            headlineHighlight={exploreHeadline.highlight}
            shopTo={
              activeFilterKey === 'all' ? '/shop' : shopPathForCategorySlug(activeFilterKey)
            }
            accentColor={homeSurface.accent}
          />
        </div>
      </div>

      <Box
        sx={{
          py: 8,
          px: { xs: 2, md: 8 },
          background: shopSurface.ink,
          borderTop: `1px solid ${homeSurface.border}`,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} justifyContent="space-between">
            <Grid item xs={12} md={4}>
              <Typography
                sx={{
                  ...shopSurface.logo,
                  fontSize: { xs: '0.75rem', md: '0.85rem' },
                  color: shopSurface.cream,
                  mb: 2,
                }}
              >
                Paduchuandham
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(242, 238, 230, 0.65)' }}>
                Crafting timeless elegance for the modern woman. Discover our exclusive collection of luxury accessories.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="subtitle2" sx={{ color: shopSurface.cream, mb: 2 }}>
                Collections
              </Typography>
              <Stack spacing={1}>
                {categories.map((c) => (
                  <Typography
                    key={c.slug}
                    component={RouterLink}
                    to={`/shop?category=${encodeURIComponent(c.slug)}`}
                    variant="body2"
                    sx={{
                      color: 'rgba(242, 238, 230, 0.65)',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      '&:hover': { color: homeSurface.accent },
                    }}
                  >
                    {c.label}
                  </Typography>
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="subtitle2" sx={{ color: shopSurface.cream, mb: 2 }}>
                Support
              </Typography>
              <Stack spacing={1}>
                <Typography
                  component={RouterLink}
                  to="/contact"
                  variant="body2"
                  sx={{
                    color: 'rgba(242, 238, 230, 0.65)',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    '&:hover': { color: homeSurface.accent },
                  }}
                >
                  Contact Us
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(242, 238, 230, 0.65)', cursor: 'pointer', '&:hover': { color: homeSurface.accent } }}
                >
                  Shipping & Returns
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(242, 238, 230, 0.65)', cursor: 'pointer', '&:hover': { color: homeSurface.accent } }}
                >
                  Care Guide
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" sx={{ color: shopSurface.cream, mb: 2 }}>
                Newsletter
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(242, 238, 230, 0.65)', mb: 2 }}>
                Subscribe to receive updates, access to exclusive deals, and more.
              </Typography>
              <Box sx={{ display: 'flex', borderBottom: '1px solid rgba(242, 238, 230, 0.35)', pb: 1 }}>
                <Box
                  component="input"
                  placeholder="Enter your email"
                  sx={{
                    background: 'transparent',
                    border: 'none',
                    color: shopSurface.cream,
                    outline: 'none',
                    flexGrow: 1,
                    fontFamily: shopSurface.font.body,
                    '&::placeholder': { color: 'rgba(242, 238, 230, 0.45)' },
                  }}
                />
                <Typography
                  sx={{
                    color: homeSurface.accent,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Subscribe
                </Typography>
              </Box>
            </Grid>
          </Grid>
          <Box
            sx={{
              mt: 8,
              pt: 4,
              borderTop: '1px solid rgba(242, 238, 230, 0.12)',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Typography variant="body2" sx={{ color: 'rgba(242, 238, 230, 0.55)' }}>
              © 2026 Paduchuandham. All rights reserved.
            </Typography>
            <Stack direction="row" spacing={3}>
              {[
                { label: 'Instagram', url: socialLinks?.instagram ?? null },
                { label: 'YouTube', url: socialLinks?.youtube ?? null },
                { label: 'Facebook', url: socialLinks?.facebook ?? null },
              ]
                .filter((item) => item.url)
                .map((item) => (
                  <Typography
                    key={item.label}
                    component="a"
                    href={item.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                    sx={{
                      color: 'rgba(242, 238, 230, 0.55)',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      '&:hover': { color: homeSurface.accent },
                    }}
                  >
                    {item.label}
                  </Typography>
                ))}
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
