import type { Category } from "@swap/types";

const catId = (n: number) =>
  `33333333-3333-4333-8333-${n.toString().padStart(12, "0")}`;

type CategorySeed = Pick<Category, "name_ar" | "name_en" | "slug" | "icon">;

/** `icon` is a key the UI maps to an icon component (see CategoryIcon). */
const seeds: CategorySeed[] = [
  { name_ar: "إلكترونيات", name_en: "Electronics", slug: "electronics", icon: "electronics" },
  { name_ar: "أثاث", name_en: "Furniture", slug: "furniture", icon: "furniture" },
  { name_ar: "سيارات", name_en: "Cars", slug: "cars", icon: "cars" },
  { name_ar: "أجهزة منزلية", name_en: "Home appliances", slug: "home-appliances", icon: "appliances" },
  { name_ar: "ملابس", name_en: "Clothing", slug: "clothing", icon: "clothing" },
  { name_ar: "ساعات", name_en: "Watches", slug: "watches", icon: "watches" },
  { name_ar: "ألعاب", name_en: "Toys", slug: "toys", icon: "toys" },
  { name_ar: "معدات رياضية", name_en: "Sports equipment", slug: "sports", icon: "sports" },
  { name_ar: "أخرى", name_en: "Other", slug: "other", icon: "other" },
];

export const CATEGORIES: Category[] = seeds.map((s, i) => ({
  ...s,
  id: catId(i + 1),
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
