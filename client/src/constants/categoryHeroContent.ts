import type { CatalogCategory, CatalogCategoryKind } from '../utils/catalogCategory';
import { unsplashUrl } from './verifiedProductImages';

export type CategoryHeroContent = {
  title: string;
  titleLine2Prefix?: string;
  titleHighlight?: string;
  description: string;
  socialProof?: string;
  images: string[];
  imageAlts: string[];
};

const WATCH_IMAGE_IDS = [
  '1523275335684-37898b6baf30',
  '1524592094714-0f0654e20314',
  '1614164185128-e4ec99c436d7',
] as const;

const BRACELET_IMAGE_IDS = [
  '1547996160-81dfa63595aa',
  '1617038220319-276d3cfab638',
  '1587836374828-4dbafa94cf0e',
] as const;

const JEWELLERY_IMAGE_IDS = [
  '1599643478518-a784e5dc4c8f',
  '1558618666-fcd25c85cd64',
  '1585123334904-845d60e97b29',
  '1509042239860-f550ce710b93',
  '1573408301185-9146fe634ad0',
  '1526045431048-f857369baa09',
] as const;

const GENERIC_IMAGE_IDS = [
  '1594534475808-b18fc33b045e',
  '1434056886845-dac89ffe9b56',
  '1526045431048-f857369baa09',
] as const;

function imagesFromIds(ids: readonly string[], width = 900): string[] {
  return ids.map((id) => unsplashUrl(id, width));
}

function pickThree(ids: readonly string[], seed: string, width = 900): string[] {
  if (ids.length <= 3) return imagesFromIds(ids, width);

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const pool = [...ids];
  const picked: string[] = [];
  for (let i = 0; i < 3; i += 1) {
    const index = (hash + i * 7) % pool.length;
    picked.push(unsplashUrl(pool[index]!, width));
    pool.splice(index, 1);
  }
  return picked;
}

const KIND_DEFAULTS: Record<
  CatalogCategoryKind,
  Omit<CategoryHeroContent, 'images' | 'imageAlts'> & { imageIds: readonly string[]; alts: string[] }
> = {
  watch: {
    title: 'Precision crafted',
    titleLine2Prefix: 'for',
    titleHighlight: 'Every Moment',
    description:
      'Explore our curated watch collection — refined dials, premium finishes, and timeless silhouettes for everyday elegance.',
    socialProof: 'Handpicked timepieces for modern style',
    imageIds: WATCH_IMAGE_IDS,
    alts: ['Luxury watch on wrist', 'Classic watch dial close-up', 'Minimalist timepiece'],
  },
  bracelet: {
    title: 'Adorn your wrist',
    titleLine2Prefix: 'with',
    titleHighlight: 'Fine Bracelets',
    description:
      'From delicate chains to statement cuffs — discover bracelets designed to elevate every look with effortless charm.',
    socialProof: 'Crafted details, everyday luxury',
    imageIds: BRACELET_IMAGE_IDS,
    alts: ['Gold bracelet detail', 'Stacked bracelets', 'Elegant wrist jewellery'],
  },
  jewellery: {
    title: 'Discover timeless',
    titleLine2Prefix: '',
    titleHighlight: 'Jewellery',
    description:
      'Necklaces, earrings, rings, and more — explore pieces that celebrate tradition with a contemporary finish.',
    socialProof: 'Curated for celebrations and daily wear',
    imageIds: JEWELLERY_IMAGE_IDS,
    alts: ['Gold necklace', 'Statement earrings', 'Fine ring detail'],
  },
  generic: {
    title: 'Explore our',
    titleLine2Prefix: '',
    titleHighlight: 'Collection',
    description:
      'Browse thoughtfully curated accessories — designed to complement your style with quality you can feel.',
    socialProof: 'New arrivals and bestsellers',
    imageIds: GENERIC_IMAGE_IDS,
    alts: ['Editorial product shot', 'Luxury accessory detail', 'Curated collection'],
  },
};

function labelTitleCase(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function descriptionForKind(kind: CatalogCategoryKind, label: string): string {
  switch (kind) {
    case 'watch':
      return `Explore our ${label.toLowerCase()} — refined dials, premium finishes, and timeless silhouettes for everyday elegance.`;
    case 'bracelet':
      return `From delicate chains to statement cuffs — discover ${label.toLowerCase()} designed to elevate every look.`;
    case 'jewellery':
      return `Necklaces, earrings, rings, and more — explore ${label.toLowerCase()} that celebrate tradition with a contemporary finish.`;
    default:
      return `Browse thoughtfully curated ${label.toLowerCase()} — designed to complement your style with quality you can feel.`;
  }
}

export type CategoryExploreHeadline = {
  lead: string;
  highlight: string;
};

/** Home category sections — always "Explore our" + the live category label. */
export function getCategoryExploreHeadline(
  category: CatalogCategory | undefined,
): CategoryExploreHeadline {
  return {
    lead: 'Explore our',
    highlight: category ? labelTitleCase(category.label) : 'Collection',
  };
}

export function getCategoryHeroContent(category: CatalogCategory | undefined): CategoryHeroContent {
  if (!category) {
    const defaults = KIND_DEFAULTS.generic;
    return {
      title: defaults.title,
      titleLine2Prefix: defaults.titleLine2Prefix,
      titleHighlight: defaults.titleHighlight,
      description: defaults.description,
      socialProof: defaults.socialProof,
      images: pickThree(defaults.imageIds, 'generic'),
      imageAlts: defaults.alts,
    };
  }

  const defaults = KIND_DEFAULTS[category.kind] ?? KIND_DEFAULTS.generic;
  const label = labelTitleCase(category.label);

  return {
    title: defaults.title,
    titleLine2Prefix: defaults.titleLine2Prefix,
    titleHighlight: label,
    description: descriptionForKind(category.kind, label),
    socialProof: defaults.socialProof,
    images: pickThree(defaults.imageIds, category.slug),
    imageAlts: defaults.alts,
  };
}
