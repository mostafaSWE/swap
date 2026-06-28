import type { Country } from "@swap/types";

/**
 * Canonical GCC country list. These fixed UUIDs are the SAME ones used by
 * supabase/seed.sql, so the app, seed data, and constants never drift.
 *
 * To add a country later: append here AND in seed.sql (or, once the admin
 * "Manage countries" screen is wired to the DB, manage it there instead).
 */
export const COUNTRIES: Country[] = [
  {
    id: "11111111-1111-4111-8111-000000000001",
    name_ar: "السعودية",
    name_en: "Saudi Arabia",
    iso_code: "SA",
    phone_code: "+966",
    currency_code: "SAR",
    timezone: "Asia/Riyadh",
    is_active: true,
    sort_order: 1,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "11111111-1111-4111-8111-000000000002",
    name_ar: "الإمارات العربية المتحدة",
    name_en: "United Arab Emirates",
    iso_code: "AE",
    phone_code: "+971",
    currency_code: "AED",
    timezone: "Asia/Dubai",
    is_active: true,
    sort_order: 2,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "11111111-1111-4111-8111-000000000003",
    name_ar: "قطر",
    name_en: "Qatar",
    iso_code: "QA",
    phone_code: "+974",
    currency_code: "QAR",
    timezone: "Asia/Qatar",
    is_active: true,
    sort_order: 3,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "11111111-1111-4111-8111-000000000004",
    name_ar: "الكويت",
    name_en: "Kuwait",
    iso_code: "KW",
    phone_code: "+965",
    currency_code: "KWD",
    timezone: "Asia/Kuwait",
    is_active: true,
    sort_order: 4,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "11111111-1111-4111-8111-000000000005",
    name_ar: "البحرين",
    name_en: "Bahrain",
    iso_code: "BH",
    phone_code: "+973",
    currency_code: "BHD",
    timezone: "Asia/Bahrain",
    is_active: true,
    sort_order: 5,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "11111111-1111-4111-8111-000000000006",
    name_ar: "عُمان",
    name_en: "Oman",
    iso_code: "OM",
    phone_code: "+968",
    currency_code: "OMR",
    timezone: "Asia/Muscat",
    is_active: true,
    sort_order: 6,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "11111111-1111-4111-8111-000000000007",
    name_ar: "مصر",
    name_en: "Egypt",
    iso_code: "EG",
    phone_code: "+20",
    currency_code: "EGP",
    timezone: "Africa/Cairo",
    is_active: true,
    sort_order: 7,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "11111111-1111-4111-8111-000000000008",
    name_ar: "سوريا",
    name_en: "Syria",
    iso_code: "SY",
    phone_code: "+963",
    currency_code: "SYP",
    timezone: "Asia/Damascus",
    is_active: true,
    sort_order: 8,
    created_at: "2024-01-01T00:00:00Z",
  },
];

export const COUNTRY_BY_ID: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.id, c]),
);

export const COUNTRY_BY_ISO: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.iso_code, c]),
);
