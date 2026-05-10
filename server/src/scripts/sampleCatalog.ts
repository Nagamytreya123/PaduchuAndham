/**
 * Seed catalog: watches + bracelets + jewellery. Prices in paise (INR × 100).
 */
export type WatchDetailsInput = {
  caseShape?: string;
  dial?: string;
  strapType?: string;
  color?: string;
};

export type JewelryDetailsInput = {
  materialType?: string;
  finishOrPlating?: string;
  stoneOrMotif?: string;
  customizationNote?: string;
};

export type SampleProductInput = {
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  images: string[];
  category: string;
  subcategory?: string;
  sku: string;
  slug: string;
  materials?: string[];
  tags?: string[];
  dimensions?: {
    displayNote?: string;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
  };
  weightGrams?: number;
  careInstructions?: string;
  watchDetails?: WatchDetailsInput;
  jewelryDetails?: JewelryDetailsInput;
  matchingBraceletIds?: string[];
};

const WATCH_BRACELET_CATALOG: SampleProductInput[] = [
  {
    sku: 'WD-CLS-RND-001',
    slug: 'classic-round-steel-white-dial',
    name: 'Classic round — steel case, white dial',
    description:
      'Minimal dress watch with applied indices and sapphire crystal. Suitable for office and evening wear.',
    category: 'Watches',
    subcategory: 'Dress',
    price: 12_499_00,
    compareAtPrice: 14_999_00,
    stock: 12,
    images: ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80'],
    materials: ['Stainless steel', 'Sapphire crystal'],
    dimensions: { displayNote: '40 mm case · 20 mm lug width' },
    weightGrams: 125,
    careInstructions: 'Wipe with soft cloth. Avoid chemicals on leather. Service every 3–5 years.',
    watchDetails: {
      caseShape: 'Round',
      dial: 'White sunburst, baton indices',
      strapType: 'Brown genuine leather',
      color: 'Silver / white',
    },
  },
  {
    sku: 'WD-DVR-RND-002',
    slug: 'diver-automatic-black-dial',
    name: 'Diver automatic — black dial, rubber strap',
    description:
      '200 m water resistance, unidirectional bezel, luminous hands. Reliable companion for pool and travel.',
    category: 'Watches',
    subcategory: 'Diver',
    price: 28_990_00,
    stock: 8,
    images: ['https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=800&q=80'],
    materials: ['Stainless steel', 'Ceramic bezel insert', 'Sapphire crystal'],
    dimensions: { displayNote: '42 mm case · 22 mm lug width' },
    weightGrams: 168,
    careInstructions: 'Rinse after saltwater. Screw crown fully before swimming.',
    watchDetails: {
      caseShape: 'Round',
      dial: 'Black matte, luminous markers',
      strapType: 'Black rubber',
      color: 'Black / steel',
    },
  },
  {
    sku: 'WD-CHR-TNL-003',
    slug: 'chronograph-tonneau-blue',
    name: 'Chronograph — tonneau case, blue dial',
    description:
      'Quartz chronograph with date. Tonneau silhouette with sporty polish for weekends and events.',
    category: 'Watches',
    subcategory: 'Chronograph',
    price: 9_799_00,
    stock: 15,
    images: ['https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=800&q=80'],
    materials: ['Stainless steel', 'Mineral crystal'],
    dimensions: { displayNote: '44 × 38 mm tonneau case' },
    weightGrams: 142,
    careInstructions: 'Avoid pressing pushers underwater.',
    watchDetails: {
      caseShape: 'Tonneau',
      dial: 'Blue with three sub-dials',
      strapType: 'Steel bracelet',
      color: 'Blue / silver',
    },
  },
  {
    sku: 'WD-DRS-SQR-004',
    slug: 'dress-square-silver-mesh',
    name: 'Dress — square case, silver mesh bracelet',
    description:
      'Art deco inspired square case with mesh bracelet. Slim profile under cuffs.',
    category: 'Watches',
    subcategory: 'Dress',
    price: 15_250_00,
    stock: 10,
    images: ['https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=800&q=80'],
    materials: ['Stainless steel', 'Sapphire crystal'],
    dimensions: { displayNote: '34 mm square case' },
    weightGrams: 98,
    careInstructions: 'Adjust mesh gently; store flat.',
    watchDetails: {
      caseShape: 'Square',
      dial: 'Silver with Roman numerals',
      strapType: 'Milanese mesh bracelet',
      color: 'Silver',
    },
  },
  {
    sku: 'WD-FLD-RND-005',
    slug: 'field-watch-green-nato',
    name: 'Field watch — green dial, NATO strap',
    description:
      'High-contrast dial for quick reading outdoors. Military-inspired with durable nylon strap.',
    category: 'Watches',
    subcategory: 'Field',
    price: 6_450_00,
    compareAtPrice: 7_990_00,
    stock: 20,
    images: ['https://images.unsplash.com/photo-1517463700638-70143c3b87fc?w=800&q=80'],
    materials: ['Stainless steel', 'Mineral crystal'],
    dimensions: { displayNote: '38 mm case · 18 mm lug width' },
    weightGrams: 72,
    careInstructions: 'NATO straps can be rinsed; dry fully.',
    watchDetails: {
      caseShape: 'Round',
      dial: 'Matte green with Arabic numerals',
      strapType: 'Khaki nylon NATO',
      color: 'Green / khaki',
    },
  },
  {
    sku: 'WD-GMT-RND-006',
    slug: 'gmt-traveler-black-red-bezel',
    name: 'GMT traveller — black dial, two-tone bezel',
    description:
      'Fourth hand tracks a second time zone. Bidirectional 24-hour bezel for flyers.',
    category: 'Watches',
    subcategory: 'GMT',
    price: 45_900_00,
    stock: 5,
    images: ['https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=80'],
    materials: ['Stainless steel', 'Sapphire crystal', 'Ceramic bezel'],
    dimensions: { displayNote: '41 mm case' },
    weightGrams: 155,
    careInstructions: 'Keep crown screwed down when not adjusting.',
    watchDetails: {
      caseShape: 'Round',
      dial: 'Black with GMT hand',
      strapType: 'Steel Oyster-style bracelet',
      color: 'Black / steel',
    },
  },
  {
    sku: 'WD-DGT-SQR-007',
    slug: 'digital-chrono-square-black',
    name: 'Digital chronograph — square resin case',
    description:
      'Multi-function digital module with alarm and backlight. Lightweight everyday sports watch.',
    category: 'Watches',
    subcategory: 'Digital',
    price: 3_299_00,
    stock: 30,
    images: ['https://images.unsplash.com/photo-1526045431048-f857369baa09?w=800&q=80'],
    materials: ['Resin case', 'Acrylic crystal'],
    dimensions: { displayNote: '43 mm square case' },
    weightGrams: 52,
    careInstructions: 'Battery replacement by authorised service centre.',
    watchDetails: {
      caseShape: 'Square',
      dial: 'Negative LCD display',
      strapType: 'Black resin strap',
      color: 'Black',
    },
  },
  {
    sku: 'WD-FMT-RND-008',
    slug: 'minimalist-rose-gold-mesh',
    name: 'Minimalist — rose gold case, mesh bracelet',
    description:
      'Ultra-thin quartz movement with rose gold PVD finish. Clean dial with stick markers.',
    category: 'Watches',
    subcategory: 'Dress',
    price: 8_899_00,
    stock: 14,
    images: ['https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=800&q=80'],
    materials: ['Stainless steel PVD', 'Mineral crystal'],
    dimensions: { displayNote: '36 mm case' },
    weightGrams: 88,
    careInstructions: 'Avoid abrasive cleaners on PVD coating.',
    watchDetails: {
      caseShape: 'Round',
      dial: 'Soft grey with rose gold hands',
      strapType: 'Rose gold mesh bracelet',
      color: 'Rose gold',
    },
  },
  {
    sku: 'WD-PIL-RND-009',
    slug: 'pilot-aviator-black-leather',
    name: 'Pilot — large crown, black leather strap',
    description:
      'High visibility dial inspired by cockpit instruments. Oversized crown for gloves.',
    category: 'Watches',
    subcategory: 'Pilot',
    price: 18_750_00,
    stock: 9,
    images: ['https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=800&q=80'],
    materials: ['Stainless steel', 'Sapphire crystal'],
    dimensions: { displayNote: '44 mm case · large onion crown' },
    weightGrams: 118,
    careInstructions: 'Leather strap: avoid soaking.',
    watchDetails: {
      caseShape: 'Round',
      dial: 'Black with cathedral hands',
      strapType: 'Black riveted leather',
      color: 'Black / steel',
    },
  },
  {
    sku: 'WD-SKL-RND-010',
    slug: 'skeleton-automatic-open-heart',
    name: 'Skeleton automatic — open heart dial',
    description:
      'Mechanical automatic movement visible through dial aperture. Exhibition case back.',
    category: 'Watches',
    subcategory: 'Dress',
    price: 36_500_00,
    compareAtPrice: 42_000_00,
    stock: 6,
    images: ['https://images.unsplash.com/photo-1585123334904-845d60e97b29?w=800&q=80'],
    materials: ['Stainless steel', 'Sapphire crystal front & back'],
    dimensions: { displayNote: '42 mm case · 11 mm thick' },
    weightGrams: 172,
    careInstructions: 'Wind gently if manual reserve runs low; avoid magnets.',
    watchDetails: {
      caseShape: 'Round',
      dial: 'Skeleton open-heart with rose accents',
      strapType: 'Black alligator-pattern leather',
      color: 'Silver / black',
    },
  },

  // —— Bracelets (category must match admin picker: "Bracelets") ——
  {
    sku: 'BR-CHAIN-CUBAN-001',
    slug: 'bracelet-steel-cuban-link-8mm',
    name: 'Steel Cuban link bracelet — 8 mm',
    description:
      'Solid-feel stainless steel Cuban curb chain with secure box clasp. Fits 19–21 cm wrists; one removable link included.',
    category: 'Bracelets',
    subcategory: 'Chain',
    price: 4_250_00,
    compareAtPrice: 4_990_00,
    stock: 25,
    images: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220c?w=800&q=80'],
    materials: ['316L stainless steel'],
    dimensions: { displayNote: 'Length 21 cm · 8 mm width · fits wrists 19–21 cm' },
    weightGrams: 42,
    careInstructions: 'Wipe dry after wear; store in pouch. Avoid harsh chemicals on polished links.',
  },
  {
    sku: 'BR-LEATHER-WRAP-002',
    slug: 'bracelet-double-wrap-brown-leather',
    name: 'Double-wrap leather bracelet — espresso brown',
    description:
      'Vegetable-tanned leather wraps twice for a slim stacked look. Magnetic stainless clasp with safety catch.',
    category: 'Bracelets',
    subcategory: 'Leather',
    price: 1_890_00,
    stock: 40,
    images: ['https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=800&q=80'],
    materials: ['Genuine leather', 'Stainless steel clasp'],
    dimensions: { displayNote: 'Adjustable 17–20 cm wrist' },
    weightGrams: 18,
    careInstructions: 'Keep dry; condition leather every few months.',
  },
  {
    sku: 'BR-BEAD-SILVER-003',
    slug: 'bracelet-silver-bead-stretch',
    name: 'Sterling silver bead stretch bracelet',
    description:
      '4 mm seamless beads on strong elastic. Easy on/off; stacks well with watches or cuffs.',
    category: 'Bracelets',
    subcategory: 'Beaded',
    price: 2_650_00,
    stock: 32,
    images: ['https://images.unsplash.com/photo-1515562149807-7a168e96b8c8?w=800&q=80'],
    materials: ['Sterling silver 925'],
    dimensions: { displayNote: 'Inner circumference ~18 cm (stretch)' },
    weightGrams: 14,
    careInstructions: 'Roll on gently; polish with silver cloth. Avoid overstretching.',
  },
  {
    sku: 'BR-CUFF-RG-004',
    slug: 'bracelet-open-cuff-rose-gold',
    name: 'Open cuff — rose gold tone',
    description:
      'Minimal open cuff with brushed outer and polished inner faces. Slight flex for comfort.',
    category: 'Bracelets',
    subcategory: 'Cuff',
    price: 3_100_00,
    stock: 18,
    images: ['https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=800&q=80'],
    materials: ['Stainless steel', 'Rose gold PVD'],
    dimensions: { displayNote: 'Opening 2.8 cm · best for wrists 16–18 cm' },
    weightGrams: 22,
    careInstructions: 'Do not over-bend; wipe with soft cloth.',
  },
  {
    sku: 'BR-TENNIS-CZ-005',
    slug: 'bracelet-tennis-row-cz-silver',
    name: 'Tennis bracelet — single row CZ, silver tone',
    description:
      'Prong-set cubic zirconia in rhodium-plated setting. Classic line-of-light look for evenings.',
    category: 'Bracelets',
    subcategory: 'Tennis',
    price: 5_499_00,
    compareAtPrice: 6_299_00,
    stock: 14,
    images: ['https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80'],
    materials: ['Brass', 'Rhodium plating', 'Cubic zirconia'],
    dimensions: { displayNote: '17.5 cm wearable length · 3 mm stone size' },
    weightGrams: 16,
    careInstructions: 'Store flat; avoid impact on stones; clean with mild soap and water.',
  },
  {
    sku: 'BR-ROPE-SILVER-006',
    slug: 'bracelet-rope-chain-silver-5mm',
    name: 'Rope chain bracelet — silver tone, 5 mm',
    description:
      'Twisted rope profile with lobster clasp and 2 cm extender. Pairs with steel dress watches.',
    category: 'Bracelets',
    subcategory: 'Chain',
    price: 2_199_00,
    stock: 28,
    images: ['https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=800&q=80'],
    materials: ['Stainless steel'],
    dimensions: { displayNote: '19–22 cm adjustable' },
    weightGrams: 26,
    careInstructions: 'Rinse if exposed to sweat; dry before storage.',
  },
  {
    sku: 'BR-CORD-NAVY-007',
    slug: 'bracelet-nautical-cord-anchor',
    name: 'Nautical cord bracelet — navy with anchor charm',
    description:
      'Waxed polyester cord with stainless anchor charm and adjustable slip knot. Beach-friendly.',
    category: 'Bracelets',
    subcategory: 'Cord',
    price: 899_00,
    stock: 60,
    images: ['https://images.unsplash.com/photo-1526045431048-f857369baa09?w=800&q=80'],
    materials: ['Waxed polyester cord', 'Stainless steel charm'],
    dimensions: { displayNote: 'One size adjustable 16–22 cm' },
    weightGrams: 8,
    careInstructions: 'Cord can be rinsed; air dry fully.',
  },
  {
    sku: 'BR-BANGLE-SLIM-008',
    slug: 'bracelet-slim-bangle-polished-steel',
    name: 'Slim oval bangle — polished steel',
    description:
      'Rigid oval bangle with side hinge and hidden clasp. Clean lines for office wear.',
    category: 'Bracelets',
    subcategory: 'Bangle',
    price: 2_450_00,
    stock: 20,
    images: ['https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=800&q=80'],
    materials: ['Stainless steel'],
    dimensions: { displayNote: 'Inner width 60 × 50 mm oval · medium wrist' },
    weightGrams: 24,
    careInstructions: 'Open hinge gently; avoid dropping on hard surfaces.',
  },
  {
    sku: 'BR-CHARM-SILVER-009',
    slug: 'bracelet-charm-links-silver-tone',
    name: 'Charm link bracelet — silver tone',
    description:
      'Cable link base with three removable charms (compass, moon, star). Add your own charms.',
    category: 'Bracelets',
    subcategory: 'Charm',
    price: 3_350_00,
    stock: 22,
    images: ['https://images.unsplash.com/photo-1585123334904-845d60e97b29?w=800&q=80'],
    materials: ['Stainless steel', 'Zinc alloy charms'],
    dimensions: { displayNote: '18 cm + 2 cm extender' },
    weightGrams: 28,
    careInstructions: 'Check jump rings periodically; keep away from small children.',
  },
  {
    sku: 'BR-SILICONE-BLK-010',
    slug: 'bracelet-silicone-perf-black',
    name: 'Perforated silicone sport band — black',
    description:
      'Breathable holes for active wear; stainless tang buckle. Compatible with many 20 mm lug watches as a strap swap.',
    category: 'Bracelets',
    subcategory: 'Sport',
    price: 1_290_00,
    stock: 45,
    images: ['https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=800&q=80'],
    materials: ['Silicone', 'Stainless steel buckle'],
    dimensions: { displayNote: '20 mm width · fits wrists 165–210 mm' },
    weightGrams: 20,
    careInstructions: 'Wash with mild soap; avoid prolonged UV on silicone.',
  },
];

const JEWELLERY_IMAGES = [
  'https://images.unsplash.com/photo-1515562149807-7a168e96b8c8?w=800&q=80',
  'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80',
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220c?w=800&q=80',
  'https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=800&q=80',
  'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=800&q=80',
  'https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=800&q=80',
  'https://images.unsplash.com/photo-1585123334904-845d60e97b29?w=800&q=80',
  'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=800&q=80',
  'https://images.unsplash.com/photo-1526045431048-f857369baa09?w=800&q=80',
  'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=800&q=80',
] as const;

const JEWELLERY_CARE =
  'Store in a dry pouch; keep away from perfumes and lotions on metal. Wipe with a soft dry cloth after wear.';

function buildJewellerySamples(): SampleProductInput[] {
  type JewellerySub = 'Bangles' | 'Chains' | 'Earrings' | 'Rings' | 'Necklaces';
  const defs: Record<
    JewellerySub,
    { skuPfx: string; slugPfx: string; basePrice: number; names: readonly string[] }
  > = {
    Bangles: {
      skuPfx: 'BAN',
      slugPfx: 'bangle',
      basePrice: 1_199_00,
      names: [
        'Heritage etched gold-plated kada',
        'Temple screw motif two-tone bangle pair',
        'Silver oxidized tribal cuff bangle',
        'Rose gold slim oval hinged bangle',
        'Filigree openable brass kangan',
        'Cubic zirconia channel-set wrist bangle',
        'Lac and mirror work festive chura-style set',
        'Adjustable spring-hinge kada (unisex)',
        'Pearl-accent matte brass bangle pair',
        'Minimal brushed steel torque bangle',
      ],
    },
    Chains: {
      skuPfx: 'CHN',
      slugPfx: 'chain',
      basePrice: 899_00,
      names: [
        'Classic cable link chain — 45 cm',
        'Singapore twist chain with lobster clasp',
        'Box chain — delicate 1.2 mm',
        'Rope chain necklace — 50 cm',
        'Figaro link chain — 55 cm',
        'Ball chain — contemporary 60 cm',
        'Wheat chain — sturdy everyday',
        'Anchor mariner link chain',
        'Paperclip link chain — layered look',
        'Herringbone flat chain — evening',
      ],
    },
    Earrings: {
      skuPfx: 'EAR',
      slugPfx: 'earring',
      basePrice: 649_00,
      names: [
        'Stud earrings — solitaire CZ in prong setting',
        'Jhumka drops — antique gold tone',
        'Hoop earrings — medium click-top',
        'Chandbali crescent with pearl fringe',
        'Thread-style minimalist bar studs',
        'Cluster floral stud with green enamel',
        'Long linear drop with baguette CZ',
        'Huggie hoops with pavé channel',
        'Temple coin motif stud pair',
        'Mismatched star & moon studs set',
      ],
    },
    Rings: {
      skuPfx: 'RNG',
      slugPfx: 'ring',
      basePrice: 799_00,
      names: [
        'Classic band — high-polish gold tone',
        'Adjustable open wrap ring with leaf motif',
        'Signet ring — brushed steel with blank face',
        'Stackable slim rings — set of 3 tones',
        'Cocktail ring — oval CZ halo',
        'Claddagh-inspired friendship ring',
        'Textured hammered band — rose gold',
        'Midi ring set — knuckle stackers',
        'Infinity twist band with tiny stones',
        'Vintage filigree dome ring',
      ],
    },
    Necklaces: {
      skuPfx: 'NCK',
      slugPfx: 'necklace',
      basePrice: 1_499_00,
      names: [
        'Layered satellite chain with pendant',
        'Temple pendant on beaded mala chain',
        'Choker — velvet ribbon with center stone',
        'Lariat Y-chain with bar drop',
        'Coin pendant on rolo chain',
        'Evil-eye enamel pendant necklace',
        'Pearl strand princess length',
        'Minimal bar pendant on snake chain',
        'Navratna-style multistone collar',
        'Heart locket — photo-ready',
      ],
    },
  };

  const materialSets = [
    { materials: ['Brass', 'Nickel-safe plating'], m: 'Brass alloy', f: 'Electroplated nickel-free coat' },
    { materials: ['925 sterling silver'], m: 'Sterling silver 925', f: 'High-polish rhodium flash' },
    { materials: ['Stainless steel 316L'], m: '316L stainless steel', f: 'IP rose gold / steel two-tone' },
    { materials: ['Copper core', 'Gold plating'], m: 'Copper core', f: '14K gold tone plating' },
  ] as const;

  const motifs = [
    'Cubic zirconia accents',
    'Hand-set crystal highlights',
    'Enamel fill detailing',
    'Laser-etched pattern',
    'Freshwater pearl accents',
    'Synthetic ruby / emerald accents',
    'Plain polished surface',
    'Micro milgrain edge',
    'Cable twist metalwork',
    'Granulated bead border',
  ] as const;

  const customs = [
    'Complimentary size check on first order',
    'Optional engraving — leave note at checkout',
    'Made-to-order length; ships in 3–5 days',
    'Includes gift box and care card',
    'Adjustable closure — fits most sizes',
    'Pair with matching SKU from same subcategory',
    'Hypoallergenic post option on request',
    'Exchange for size within 7 days',
    'Custom stone colour on request (lead time)',
    'Gift message card included',
  ] as const;

  const tagSets = [
    ['Handcrafted', 'Traditional'],
    ['Lightweight', 'Daily wear'],
    ['Wedding guest', 'Statement'],
    ['Nickel-safe', 'Plated'],
    ['Layering', 'Minimal'],
    ['Festival', 'Gift-ready'],
    ['Adjustable', 'Unisex'],
    ['Antique finish', 'Artisan'],
    ['Evening', 'CZ sparkle'],
    ['Heritage', 'Temple motif'],
  ] as const;

  const out: SampleProductInput[] = [];

  (Object.keys(defs) as JewellerySub[]).forEach((sub) => {
    const cfg = defs[sub];
    cfg.names.forEach((name, i) => {
      const n = i + 1;
      const ms = materialSets[i % materialSets.length];
      const price = cfg.basePrice + n * 175_00 + (sub === 'Necklaces' ? 200_00 : 0);
      const compare = n % 4 === 0 ? price + 350_00 : undefined;
      out.push({
        sku: `JW-${cfg.skuPfx}-${String(n).padStart(3, '0')}`,
        slug: `jewellery-${cfg.slugPfx}-${n}-${slugFragment(name)}`,
        name,
        description: `${name}. Part of our Jewellery collection — quality-checked plating and secure clasps where applicable.`,
        category: 'Jewellery',
        subcategory: sub,
        price,
        compareAtPrice: compare,
        stock: 8 + ((n * 3) % 28),
        images: [JEWELLERY_IMAGES[i % JEWELLERY_IMAGES.length]],
        materials: [...ms.materials],
        tags: [...tagSets[i % tagSets.length]],
        jewelryDetails: {
          materialType: ms.m,
          finishOrPlating: ms.f,
          stoneOrMotif: motifs[i % motifs.length],
          customizationNote: customs[i % customs.length],
        },
        dimensions: {
          displayNote:
            sub === 'Bangles'
              ? `Inner width ~${54 + (n % 4) * 2}–${58 + (n % 4) * 2} mm · see size note`
              : sub === 'Chains'
                ? `Wearable length ${42 + n}–${52 + n} cm (model ${n})`
                : sub === 'Earrings'
                  ? `Post / hook nickel-safe · drop length varies by design`
                  : sub === 'Rings'
                    ? `Adjustable or US size ${6 + (n % 5)}–${8 + (n % 3)} range`
                    : `Pendant drop ~${20 + n}–${35 + n} mm · chain as listed`,
        },
        weightGrams: 6 + n * 3 + (sub === 'Bangles' ? 18 : sub === 'Necklaces' ? 10 : 0),
        careInstructions: JEWELLERY_CARE,
      });
    });
  });

  return out;
}

function slugFragment(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export const SAMPLE_CATALOG: SampleProductInput[] = [...WATCH_BRACELET_CATALOG, ...buildJewellerySamples()];
