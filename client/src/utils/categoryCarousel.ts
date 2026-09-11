import type { CoverflowSlide } from '@/components/ui/coverflow-carousel';
import type { GalleryItem } from '@/components/ui/circular-gallery';
import type { ProductSummary } from '../types/product';
import { formatInrFromPaise } from './format';
import { productMatchesCategory, type CatalogCategory } from './catalogCategory';
import { getProductDisplayImage } from './productImage';
import { sortProductsByCreatedDesc } from './productSort';

export interface CarouselSlide {
  image: string;
  title: string;
  description?: string;
  badge?: string;
  pricePaise?: number;
  compareAtPaise?: number;
  discountPercent?: number;
  productId?: string;
}

const FALLBACK_GALLERY_ITEMS: GalleryItem[] = [
  {
    common: 'Gold Bangles',
    binomial: 'Traditional craftsmanship',
    photo: {
      url: 'https://images.unsplash.com/photo-1611591437288-460bfbe1220a?w=600&q=80',
      text: 'Stack of gold bangles',
      pos: '50% 40%',
      by: 'Unsplash',
    },
  },
  {
    common: 'Diamond Ring',
    binomial: 'Bridal collection',
    photo: {
      url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&q=80',
      text: 'Diamond engagement ring',
      pos: '50% 45%',
      by: 'Unsplash',
    },
  },
  {
    common: 'Pearl Necklace',
    binomial: 'Evening elegance',
    photo: {
      url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80',
      text: 'Pearl necklace on velvet',
      by: 'Unsplash',
    },
  },
  {
    common: 'Luxury Watch',
    binomial: 'Precision timepieces',
    photo: {
      url: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&q=80',
      text: 'Classic wristwatch',
      pos: '50% 35%',
      by: 'Unsplash',
    },
  },
  {
    common: 'Temple Jewellery',
    binomial: 'Heritage designs',
    photo: {
      url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80',
      text: 'Ornate gold earrings',
      by: 'Unsplash',
    },
  },
];

function discountPercentOff(pricePaise: number, compareAtPaise?: number): number | null {
  if (compareAtPaise == null || compareAtPaise <= pricePaise) return null;
  const pct = Math.round(((compareAtPaise - pricePaise) / compareAtPaise) * 100);
  return pct > 0 ? pct : null;
}

export function productToCarouselSlide(product: ProductSummary): CarouselSlide {
  return {
    image: getProductDisplayImage(product),
    title: product.name,
    badge: 'Best Seller',
    pricePaise: product.price,
    compareAtPaise: product.compareAtPrice,
    discountPercent: discountPercentOff(product.price, product.compareAtPrice) ?? undefined,
    productId: product.id,
  };
}

/** Newest active products for a storefront category, capped at `limit`. */
export function getLastCategoryProducts(
  products: ProductSummary[],
  category: CatalogCategory | undefined,
  limit: number,
): ProductSummary[] {
  if (!category || limit <= 0) return [];

  const inCategory = products.filter(
    (product) => product.isActive !== false && productMatchesCategory(product.category, category),
  );

  return sortProductsByCreatedDesc(inCategory).slice(0, limit);
}

/** @deprecated Use {@link getLastCategoryProducts} with an explicit limit. */
export function getLastFiveCategoryProducts(
  products: ProductSummary[],
  category: CatalogCategory | undefined,
): ProductSummary[] {
  return getLastCategoryProducts(products, category, 5);
}

export function getCategoryCarouselSlides(
  products: ProductSummary[],
  category: CatalogCategory | undefined,
  limit = 5,
): CarouselSlide[] {
  return getLastCategoryProducts(products, category, limit).map(productToCarouselSlide);
}

export function carouselSlideToCoverflowSlide(slide: CarouselSlide): CoverflowSlide {
  const subtitle =
    slide.pricePaise != null
      ? formatInrFromPaise(slide.pricePaise)
      : slide.description ?? undefined;

  return {
    src: slide.image,
    alt: slide.title,
    title: slide.title,
    subtitle,
    href: slide.productId ? `/products/${slide.productId}` : undefined,
  };
}

const FALLBACK_COVERFLOW_SLIDES: CoverflowSlide[] = FALLBACK_GALLERY_ITEMS.map((item) => ({
  src: item.photo.url,
  alt: item.photo.text,
  title: item.common,
  subtitle: item.binomial,
}));

export function getCategoryCoverflowSlides(
  products: ProductSummary[],
  category: CatalogCategory | undefined,
  limit: number,
): CoverflowSlide[] {
  const slides = getCategoryCarouselSlides(products, category, limit);
  if (slides.length === 0) return FALLBACK_COVERFLOW_SLIDES;
  return slides.map(carouselSlideToCoverflowSlide);
}

export function carouselSlideToGalleryItem(slide: CarouselSlide): GalleryItem {
  const subtitle =
    slide.pricePaise != null
      ? formatInrFromPaise(slide.pricePaise)
      : slide.description ?? 'Curated for you';

  return {
    common: slide.title,
    binomial: subtitle,
    photo: {
      url: slide.image,
      text: slide.title,
      by: slide.badge ?? 'Paduchu Andham',
    },
  };
}

export function getCategoryGalleryItems(
  products: ProductSummary[],
  category: CatalogCategory | undefined,
): GalleryItem[] {
  const slides = getCategoryCarouselSlides(products, category);
  if (slides.length === 0) return FALLBACK_GALLERY_ITEMS;
  return slides.map(carouselSlideToGalleryItem);
}
