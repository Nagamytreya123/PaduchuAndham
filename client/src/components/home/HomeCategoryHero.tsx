import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePageRestoreEffect } from '../../hooks/usePageRestoreEffect';

import { CoverflowCarousel } from '@/components/ui/coverflow-carousel';
import { CategorySlideTransition } from './CategorySlideTransition';
import { apiFetch } from '../../api/client';
import { getCategoryExploreHeadline } from '../../constants/categoryHeroContent';
import { homeSurface } from '../../constants/homeSurface';
import { useCategories } from '../../context/CategoriesContext';
import { useResponsiveCarouselLimit } from '../../hooks/useResponsiveCarouselLimit';
import type { ProductSummary } from '../../types/product';
import type { CollectionFilterKey } from '../../utils/catalogCategory';
import { getCategoryCoverflowSlides } from '../../utils/categoryCarousel';

type HomeCategoryHeroProps = {
  activeCategory: CollectionFilterKey;
  products?: ProductSummary[];
  slideDirection?: number;
};

export function HomeCategoryHero({
  activeCategory,
  products: productsProp,
  slideDirection = 0,
}: HomeCategoryHeroProps) {
  const { categories } = useCategories();
  const [localProducts, setLocalProducts] = useState<ProductSummary[]>([]);
  const productLimit = useResponsiveCarouselLimit();
  const products = productsProp ?? localProducts;

  const category = useMemo(
    () => categories.find((c) => c.slug === activeCategory),
    [categories, activeCategory],
  );

  const headline = useMemo(() => getCategoryExploreHeadline(category), [category]);

  useEffect(() => {
    if (productsProp) return;

    void (async () => {
      try {
        const data = await apiFetch<{ products: ProductSummary[] }>('/api/products');
        setLocalProducts(data.products.filter((product) => product.isActive !== false));
      } catch {
        setLocalProducts([]);
      }
    })();
  }, [productsProp]);

  const coverflowSlides = useMemo(
    () => getCategoryCoverflowSlides(products, category, productLimit),
    [products, category, productLimit],
  );

  const carouselLabel = category ? `${category.label} highlights` : 'Featured products';
  const [restoreKey, setRestoreKey] = useState(0);

  usePageRestoreEffect(useCallback(() => {
    setRestoreKey((key) => key + 1);
  }, []));

  return (
    <section
      className="relative z-[1] border-t border-[rgba(5,11,24,0.1)] px-4 pt-2 pb-0 sm:px-8 sm:pt-2 sm:pb-0"
      style={{ background: homeSurface.pageBg }}
      aria-label="Category showcase"
    >
      <div className="mx-auto flex max-w-[1456px] flex-col items-center gap-3 sm:gap-4">
        <CategorySlideTransition
          key={restoreKey}
          panelKey={activeCategory}
          direction={slideDirection}
          className="flex w-full flex-col items-center gap-3 sm:gap-4"
        >
          <header className="w-full max-w-5xl px-4 py-2 text-center sm:py-3">
            <h2
              className="inline-flex flex-wrap items-baseline justify-center gap-x-1.5 text-2xl font-normal text-brand-ink sm:text-3xl md:text-4xl"
              style={{ fontFamily: homeSurface.font.display }}
            >
              <span>{headline.lead}</span>
              <span style={{ color: homeSurface.accent }}>{headline.highlight}</span>
            </h2>
          </header>

          <div className="flex w-full justify-center">
            <div className="coverflow-carousel-scope mx-auto w-full max-w-3xl">
              <CoverflowCarousel
                slides={coverflowSlides}
                label={carouselLabel}
                showCaption
                loop
                autoPlayInterval={2500}
                cardWidth="clamp(140px, 20vw, 240px)"
                className="w-full"
              />
            </div>
          </div>
        </CategorySlideTransition>
      </div>
    </section>
  );
}
