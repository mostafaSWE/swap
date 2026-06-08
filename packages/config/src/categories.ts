import type { Category } from "@swap/types";

const catId = (n: number) =>
  `33333333-3333-4333-8333-${n.toString().padStart(12, "0")}`;

type CategorySeed = Pick<Category, "name_ar" | "name_en" | "slug" | "icon"> & {
  /** 1-based index of the parent in this list, or null for top-level. */
  parent?: number;
};

/**
 * Inclusive marketplace categories (26 top-level), Arabic-first.
 *
 * The first 9 IDs (electronics, furniture, cars, home-appliances, fashion,
 * watches-jewelry, toys, sports, other) intentionally REUSE the original Phase-1
 * UUIDs so existing demo listings keep valid foreign keys. New categories get
 * fresh IDs (010+). `icon` maps to a Lucide icon in the CategoryIcon component.
 *
 * Parent/child is supported via `parent` (-> parent_id). A few example
 * subcategories are seeded to prove the model; the admin can manage the rest.
 */
const seeds: CategorySeed[] = [
  // ── Top-level ──
  { name_ar: "إلكترونيات", name_en: "Electronics", slug: "electronics", icon: "electronics" }, // 1 -> id 001
  { name_ar: "جوالات وأجهزة لوحية", name_en: "Mobiles & Tablets", slug: "mobiles-tablets", icon: "mobiles" }, // 2 -> 010
  { name_ar: "كمبيوترات ولابتوبات", name_en: "Computers & Laptops", slug: "computers-laptops", icon: "computers" }, // 3 -> 011
  { name_ar: "ألعاب إلكترونية وأجهزة ألعاب", name_en: "Gaming & Consoles", slug: "gaming-consoles", icon: "gaming" }, // 4 -> 012
  { name_ar: "أجهزة منزلية", name_en: "Home Appliances", slug: "home-appliances", icon: "appliances" }, // 5 -> 004
  { name_ar: "أثاث", name_en: "Furniture", slug: "furniture", icon: "furniture" }, // 6 -> 002
  { name_ar: "المنزل والحديقة", name_en: "Home & Garden", slug: "home-garden", icon: "home-garden" }, // 7 -> 013
  { name_ar: "سيارات", name_en: "Cars", slug: "cars", icon: "cars" }, // 8 -> 003
  { name_ar: "دراجات نارية", name_en: "Motorcycles", slug: "motorcycles", icon: "motorcycles" }, // 9 -> 014
  { name_ar: "قطع غيار وإكسسوارات سيارات", name_en: "Auto Parts & Accessories", slug: "auto-parts", icon: "auto-parts" }, // 10 -> 015
  { name_ar: "أزياء وملابس", name_en: "Fashion", slug: "fashion", icon: "fashion" }, // 11 -> 005
  { name_ar: "ساعات ومجوهرات", name_en: "Watches & Jewelry", slug: "watches-jewelry", icon: "watches" }, // 12 -> 006
  { name_ar: "أطفال ومواليد", name_en: "Baby & Kids", slug: "baby-kids", icon: "baby" }, // 13 -> 016
  { name_ar: "ألعاب", name_en: "Toys & Games", slug: "toys", icon: "toys" }, // 14 -> 007
  { name_ar: "رياضة ولياقة", name_en: "Sports & Fitness", slug: "sports", icon: "sports" }, // 15 -> 008
  { name_ar: "كتب وقرطاسية", name_en: "Books & Stationery", slug: "books-stationery", icon: "books" }, // 16 -> 017
  { name_ar: "أدوات ومعدات", name_en: "Tools & Equipment", slug: "tools-equipment", icon: "tools" }, // 17 -> 018
  { name_ar: "صحة وجمال", name_en: "Health & Beauty", slug: "health-beauty", icon: "health" }, // 18 -> 019
  { name_ar: "حيوانات أليفة ومستلزماتها", name_en: "Pets & Pet Supplies", slug: "pets", icon: "pets" }, // 19 -> 020
  { name_ar: "آلات موسيقية", name_en: "Musical Instruments", slug: "musical-instruments", icon: "music" }, // 20 -> 021
  { name_ar: "كاميرات وتصوير", name_en: "Cameras & Photography", slug: "cameras-photography", icon: "cameras" }, // 21 -> 022
  { name_ar: "مواد ومستلزمات منزلية", name_en: "Home Materials", slug: "home-materials", icon: "materials" }, // 22 -> 023
  { name_ar: "معدات مكتبية وتجارية", name_en: "Office & Business Equipment", slug: "office-business", icon: "office" }, // 23 -> 024
  { name_ar: "مقتنيات وتحف", name_en: "Collectibles & Antiques", slug: "collectibles-antiques", icon: "collectibles" }, // 24 -> 025
  { name_ar: "مفتوح لأي عرض مناسب", name_en: "Open to Any Exchange", slug: "open-exchange", icon: "open-exchange" }, // 25 -> 026
  { name_ar: "أخرى", name_en: "Other", slug: "other", icon: "other" }, // 26 -> 009

  // ── Example subcategories (prove the parent/child model) ──
  { name_ar: "آيفون", name_en: "iPhone", slug: "iphone", icon: "mobiles", parent: 2 },
  { name_ar: "أندرويد", name_en: "Android Phones", slug: "android-phones", icon: "mobiles", parent: 2 },
  { name_ar: "بلايستيشن", name_en: "PlayStation", slug: "playstation", icon: "gaming", parent: 4 },
  { name_ar: "إكس بوكس", name_en: "Xbox", slug: "xbox", icon: "gaming", parent: 4 },
];

// Stable IDs: carried-over slugs keep their original Phase-1 UUID; everything
// else is assigned sequentially from 010 upward (subcategories included).
const FIXED_IDS: Record<string, number> = {
  electronics: 1,
  furniture: 2,
  cars: 3,
  "home-appliances": 4,
  fashion: 5,
  "watches-jewelry": 6,
  toys: 7,
  sports: 8,
  other: 9,
};

let nextId = 10;
const idForSlug = (slug: string): string =>
  catId(FIXED_IDS[slug] ?? nextId++);

// Resolve IDs first (so subcategory parents can reference them).
const ids = seeds.map((s) => idForSlug(s.slug));

export const CATEGORIES: Category[] = seeds.map((s, i) => ({
  id: ids[i]!,
  parent_id: s.parent ? ids[s.parent - 1]! : null,
  name_ar: s.name_ar,
  name_en: s.name_en,
  slug: s.slug,
  icon: s.icon,
  sort_order: i + 1,
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
}));

export const CATEGORY_BY_ID: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

export const CATEGORY_BY_SLUG: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c]),
);

/** Top-level categories only (parent_id === null). */
export const TOP_LEVEL_CATEGORIES: Category[] = CATEGORIES.filter(
  (c) => c.parent_id === null,
);

/** Direct subcategories of a given category id. */
export const subcategoriesOf = (parentId: string): Category[] =>
  CATEGORIES.filter((c) => c.parent_id === parentId);
