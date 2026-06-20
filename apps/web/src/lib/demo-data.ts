/**
 * Demo dataset used ONLY when Supabase is not configured, so the UI is
 * presentable immediately after `pnpm dev` (before you create a Supabase
 * project + seed it). Mirrors supabase/seed.sql. Once env vars are set, real
 * data from Supabase is used instead — see lib/data.ts.
 */
import {
  CATEGORY_BY_SLUG,
  CITY_BY_ID,
  COUNTRY_BY_ISO,
} from "@swap/config";
import type { ListingWithRelations, PublicProfile } from "@swap/types";

const SA = COUNTRY_BY_ISO["SA"]!;
const AE = COUNTRY_BY_ISO["AE"]!;
const QA = COUNTRY_BY_ISO["QA"]!;
const KW = COUNTRY_BY_ISO["KW"]!;

const owners: Record<string, PublicProfile> = {
  ahmed: mkOwner("ahmed", "أحمد العتيبي", 8, "https://i.pravatar.cc/150?img=12"),
  sara: mkOwner("sara", "سارة القحطاني", 5, "https://i.pravatar.cc/150?img=45"),
  khalid: mkOwner("khalid", "خالد المنصوري", 0, "https://i.pravatar.cc/150?img=33"),
  fatima: mkOwner("fatima", "فاطمة آل ثاني", 3, "https://i.pravatar.cc/150?img=47"),
  omar: mkOwner("omar", "عمر الصباح", 1, "https://i.pravatar.cc/150?img=14"),
};

function mkOwner(
  username: string,
  full_name: string,
  completed_swaps_count: number,
  avatar_url: string,
): PublicProfile {
  return {
    id: `demo-${username}`,
    full_name,
    username,
    avatar_url,
    bio: null,
    country_id: SA.id,
    city_id: CITY_BY_ID[Object.keys(CITY_BY_ID)[0]!]!.id,
    followers_count: 0,
    following_count: 0,
    listings_count: 0,
    completed_swaps_count,
    rating: null,
    ratings_count: 0,
    created_at: "2024-01-01T00:00:00Z",
  };
}

interface Spec {
  n: number;
  title: string;
  owner: keyof typeof owners;
  categorySlug: string;
  countryIso: string;
  cityId: string;
  condition: "new" | "used";
  wanted: string;
  views: number;
  featured?: boolean;
}

const cid = (n: number) => `22222222-2222-4222-8222-${n.toString().padStart(12, "0")}`;

const specs: Spec[] = [
  { n: 1, title: "آيفون 14 برو", owner: "ahmed", categorySlug: "electronics", countryIso: "SA", cityId: cid(1), condition: "used", wanted: "جهاز سامسونج S23 أو لابتوب", views: 142, featured: true },
  { n: 2, title: "غسالة أوتوماتيك", owner: "sara", categorySlug: "home-appliances", countryIso: "SA", cityId: cid(2), condition: "used", wanted: "ثلاجة أو مايكروويف", views: 58 },
  { n: 3, title: "طقم غرفة نوم", owner: "khalid", categorySlug: "furniture", countryIso: "AE", cityId: cid(9), condition: "used", wanted: "أثاث مجلس أو طاولة طعام", views: 77, featured: true },
  { n: 4, title: "مكيف سبليت", owner: "fatima", categorySlug: "home-appliances", countryIso: "QA", cityId: cid(16), condition: "used", wanted: "غسالة فل أوتوماتيك", views: 91 },
  { n: 5, title: "Dell XPS Laptop", owner: "omar", categorySlug: "electronics", countryIso: "KW", cityId: cid(20), condition: "used", wanted: "iPad Pro or gaming console", views: 64 },
  { n: 6, title: "ساعة يد فاخرة", owner: "ahmed", categorySlug: "watches-jewelry", countryIso: "SA", cityId: cid(1), condition: "new", wanted: "ساعة أخرى أو سماعات", views: 39 },
  { n: 7, title: "دراجة هوائية", owner: "sara", categorySlug: "sports", countryIso: "SA", cityId: cid(2), condition: "used", wanted: "دراجة كهربائية", views: 27 },
  { n: 8, title: "كنبة مجلس", owner: "khalid", categorySlug: "furniture", countryIso: "AE", cityId: cid(9), condition: "used", wanted: "طاولة طعام أو مكتب", views: 45 },
  { n: 9, title: "بلايستيشن 5", owner: "fatima", categorySlug: "electronics", countryIso: "QA", cityId: cid(16), condition: "used", wanted: "إكس بوكس أو لابتوب", views: 118, featured: true },
  { n: 10, title: "ماكينة قهوة", owner: "omar", categorySlug: "home-appliances", countryIso: "KW", cityId: cid(20), condition: "used", wanted: "Air fryer or blender", views: 33 },
  { n: 11, title: "عربة أطفال", owner: "ahmed", categorySlug: "toys", countryIso: "SA", cityId: cid(1), condition: "used", wanted: "كرسي سيارة للأطفال", views: 21 },
  { n: 12, title: "كرسي مكتب", owner: "sara", categorySlug: "furniture", countryIso: "SA", cityId: cid(2), condition: "new", wanted: "كرسي قيمنق", views: 52 },
];

const COUNTRY_BY_ISO_MAP = { SA, AE, QA, KW } as const;

export const DEMO_LISTINGS: ListingWithRelations[] = specs.map((s) => {
  const country = COUNTRY_BY_ISO_MAP[s.countryIso as keyof typeof COUNTRY_BY_ISO_MAP];
  const city = CITY_BY_ID[s.cityId]!;
  const category = CATEGORY_BY_SLUG[s.categorySlug]!;
  const id = `44444444-4444-4444-8444-${s.n.toString().padStart(12, "0")}`;
  return {
    id,
    owner_id: owners[s.owner]!.id,
    category_id: category.id,
    country_id: country.id,
    city_id: city.id,
    title: s.title,
    description: s.title,
    condition: s.condition,
    wanted_exchange: s.wanted,
    status: "active",
    is_featured: Boolean(s.featured),
    view_count: s.views,
    created_at: "2024-02-01T00:00:00Z",
    updated_at: "2024-02-01T00:00:00Z",
    images: [0, 1].map((img) => ({
      id: `img-${s.n}-${img}`,
      listing_id: id,
      image_url: `https://picsum.photos/seed/swap-${s.n}-${img}/600/600`,
      sort_order: img,
      created_at: "2024-02-01T00:00:00Z",
    })),
    owner: owners[s.owner]!,
    category,
    country,
    city,
  };
});
