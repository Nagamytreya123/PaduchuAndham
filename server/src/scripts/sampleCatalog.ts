/**
 * 10 sample catalog rows for sarees & handmade jewellery.
 * Prices are in paise (INR × 100). Images: placeholder URLs suitable for dev.
 */
export type SampleProductInput = {
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  images: string[];
  category: string;
  subcategory: string;
  sku: string;
  slug: string;
  tags: string[];
  materials: string[];
  dimensions?: {
    displayNote?: string;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
  };
  weightGrams?: number;
  careInstructions?: string;
};

export const SAMPLE_CATALOG: SampleProductInput[] = [
  {
    sku: 'SR-KAN-RED-001',
    slug: 'kanchipuram-silk-saree-ruby-border',
    name: 'Kanchipuram silk saree — ruby & gold border',
    description:
      'Handloom-inspired Kanchipuram style saree with rich zari border. Includes contrast blouse piece. Ideal for weddings and festivals.',
    category: 'Sarees',
    subcategory: 'Silk',
    price: 12_499_00,
    compareAtPrice: 14_999_00,
    stock: 8,
    images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80'],
    tags: ['wedding', 'festive', 'zari', 'handloom'],
    materials: ['Art silk blend', 'Zari work'],
    dimensions: { displayNote: '5.5 metres saree + unstitched blouse piece (~0.8 m)', lengthCm: 550 },
    weightGrams: 620,
    careInstructions: 'Dry clean only. Store folded with muslin. Avoid direct perfume on zari.',
  },
  {
    sku: 'SR-BAN-TEAL-002',
    slug: 'banarasi-weave-saree-teal',
    name: 'Banarasi weave saree — teal lotus motif',
    description:
      'Teal base with woven lotus bootis and antique-gold tone border. Lightweight drape for evening gatherings.',
    category: 'Sarees',
    subcategory: 'Banarasi style',
    price: 6_799_00,
    stock: 14,
    images: ['https://images.unsplash.com/photo-1570366583862-f91883984fde?w=800&q=80'],
    tags: ['party', 'woven', 'teal'],
    materials: ['Poly silk', 'Metallic zari'],
    dimensions: { displayNote: '5.5 metres with running blouse fabric' },
    weightGrams: 480,
    careInstructions: 'Dry clean recommended. Cool iron on reverse.',
  },
  {
    sku: 'SR-COT-IND-003',
    slug: 'handblock-cotton-saree-indigo',
    name: 'Hand-block cotton saree — indigo floral',
    description:
      'Breathable cotton saree with traditional hand-block prints. Perfect for daily wear and office ethnic days.',
    category: 'Sarees',
    subcategory: 'Cotton',
    price: 1_899_00,
    stock: 22,
    images: ['https://images.unsplash.com/photo-1590736969955-71cc94901144?w=800&q=80'],
    tags: ['cotton', 'daily wear', 'handblock', 'summer'],
    materials: ['100% cotton', 'Vegetable dye prints'],
    dimensions: { displayNote: '6 metres with blouse piece' },
    weightGrams: 380,
    careInstructions: 'Gentle machine wash cold. Line dry in shade.',
  },
  {
    sku: 'SR-LIN-PST-004',
    slug: 'linen-blend-saree-pastel-stripes',
    name: 'Linen-blend saree — pastel stripes',
    description: 'Minimal pastel stripes on linen blend with tasseled pallu. Contemporary office-friendly drape.',
    category: 'Sarees',
    subcategory: 'Linen blend',
    price: 2_449_00,
    stock: 11,
    images: ['https://images.unsplash.com/photo-1583394839416-72821e0c0e33?w=800&q=80'],
    tags: ['linen', 'minimal', 'office'],
    materials: ['Linen blend', 'Cotton lining on blouse piece'],
    dimensions: { displayNote: '5.5 metres + blouse 0.7 m' },
    weightGrams: 340,
    careInstructions: 'Hand wash or gentle cycle. Low heat iron.',
  },
  {
    sku: 'SR-ORG-MAR-005',
    slug: 'organza-saree-marigold',
    name: 'Organza saree — marigold ombre',
    description:
      'Sheer organza with soft marigold-to-ivory ombre and sequin scatter. Evening and mehndi friendly.',
    category: 'Sarees',
    subcategory: 'Organza',
    price: 3_299_00,
    compareAtPrice: 3_899_00,
    stock: 9,
    images: ['https://images.unsplash.com/photo-1509631179647-017733cc1693?w=800&q=80'],
    tags: ['sheer', 'ombre', 'evening', 'sequin'],
    materials: ['Poly organza', 'Embroidered sequins'],
    dimensions: { displayNote: '5.5 metres; blouse: 0.8 m unstitched' },
    weightGrams: 290,
    careInstructions: 'Dry clean only. Store hung or loosely folded.',
  },
  {
    sku: 'JW-TPL-CHK-101',
    slug: 'temple-necklace-choker-antique-gold',
    name: 'Handmade temple necklace — choker (antique gold tone)',
    description:
      'Nakshi-inspired deity motif choker with adjustable silk thread tie. Statement piece for sarees and lehengas.',
    category: 'Handmade Jewellery',
    subcategory: 'Necklace',
    price: 2_199_00,
    stock: 25,
    images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80'],
    tags: ['temple', 'choker', 'handmade', 'statement'],
    materials: ['Brass alloy', 'Nickel-free plating', 'Silk thread'],
    dimensions: { displayNote: 'Inner circumference adjustable 32–38 cm; pendant drop ~4 cm', lengthCm: 38 },
    weightGrams: 85,
    careInstructions: 'Wipe with soft dry cloth after wear. Avoid water & perfume. Store in anti-tarnish pouch.',
  },
  {
    sku: 'JW-JHM-OXI-102',
    slug: 'jhumka-earrings-oxidised-silver',
    name: 'Handmade jhumka earrings — oxidised silver tone',
    description: 'Layered jhumkas with peacock embossing. Lightweight hooks suitable for long wear.',
    category: 'Handmade Jewellery',
    subcategory: 'Earrings',
    price: 899_00,
    stock: 40,
    images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80'],
    tags: ['jhumka', 'oxidised', 'peacock', 'festive'],
    materials: ['White metal alloy', 'Oxidised finish', 'Surgical steel hooks'],
    dimensions: { displayNote: 'Drop length ~5.5 cm; max width ~2.8 cm', heightCm: 5.5, widthCm: 2.8 },
    weightGrams: 22,
    careInstructions: 'Store paired in box. Wipe gently; avoid moisture.',
  },
  {
    sku: 'JW-BNG-KAD-103',
    slug: ' kada-bangle-set-hand-hammered',
    name: 'Hand-hammered kada bangle set — pair',
    description: 'Set of two adjustable open kadas with hand-hammered texture. Fits most wrist sizes.',
    category: 'Handmade Jewellery',
    subcategory: 'Bangles',
    price: 1_249_00,
    compareAtPrice: 1_499_00,
    stock: 18,
    images: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80'],
    tags: ['kada', 'bangle', 'hammered', 'adjustable'],
    materials: ['Brass', 'Gold-tone plating'],
    dimensions: { displayNote: 'Open cuff; inner diameter ~5.6 cm (adjustable ~±5 mm)' },
    weightGrams: 48,
    careInstructions: 'Remove before washing hands. Polish with soft cloth.',
  },
  {
    sku: 'JW-MAL-PEA-104',
    slug: 'long-pearl-mala-hand-knotted',
    name: 'Long pearl mala — hand-knotted glass pearls',
    description:
      'Matte glass pearls knotted on silk with dual-tone guru bead. Can be doubled or worn long with deep necklines.',
    category: 'Handmade Jewellery',
    subcategory: 'Necklace',
    price: 1_599_00,
    stock: 15,
    images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc2c23?w=800&q=80'],
    tags: ['pearl', 'mala', 'layering', 'classic'],
    materials: ['Glass pearls', 'Silk thread', 'Brass accents'],
    dimensions: { displayNote: 'Total length ~90 cm (single strand)' },
    weightGrams: 65,
    careInstructions: 'Avoid water. Restring every 12–18 months with heavy use.',
  },
  {
    sku: 'JW-RNG-MOO-105',
    slug: 'adjustable-moonstone-ring-silver-tone',
    name: 'Handmade adjustable ring — moonstone cabochon',
    description: 'Open band ring with faceted moonstone glass cabochon in silver-tone bezel. One size fits most.',
    category: 'Handmade Jewellery',
    subcategory: 'Rings',
    price: 649_00,
    stock: 30,
    images: ['https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80'],
    tags: ['ring', 'moonstone', 'adjustable', 'minimal'],
    materials: ['Jeweller’s brass', 'Rhodium-tone plating', 'Glass cabochon'],
    dimensions: { displayNote: 'US size ~6–8 adjustable; band width ~3 mm' },
    weightGrams: 6,
    careInstructions: 'Remove when washing hands. Avoid ultrasonic cleaners; store in a dry, sulphur-free pouch.',
  },
];
