import type { City } from "@swap/types";
import { COUNTRY_BY_ISO } from "./countries";

const SA = COUNTRY_BY_ISO["SA"]!.id;
const AE = COUNTRY_BY_ISO["AE"]!.id;
const QA = COUNTRY_BY_ISO["QA"]!.id;
const KW = COUNTRY_BY_ISO["KW"]!.id;
const BH = COUNTRY_BY_ISO["BH"]!.id;
const OM = COUNTRY_BY_ISO["OM"]!.id;

const cityId = (n: number) =>
  `22222222-2222-4222-8222-${n.toString().padStart(12, "0")}`;

type CitySeed = Omit<City, "id" | "is_active" | "sort_order" | "created_at">;

const seeds: CitySeed[] = [
  // Saudi Arabia
  { country_id: SA, name_ar: "الرياض", name_en: "Riyadh", slug: "riyadh" },
  { country_id: SA, name_ar: "جدة", name_en: "Jeddah", slug: "jeddah" },
  { country_id: SA, name_ar: "مكة المكرمة", name_en: "Makkah", slug: "makkah" },
  { country_id: SA, name_ar: "المدينة المنورة", name_en: "Madinah", slug: "madinah" },
  { country_id: SA, name_ar: "الدمام", name_en: "Dammam", slug: "dammam" },
  { country_id: SA, name_ar: "الخبر", name_en: "Khobar", slug: "khobar" },
  { country_id: SA, name_ar: "الطائف", name_en: "Taif", slug: "taif" },
  { country_id: SA, name_ar: "أبها", name_en: "Abha", slug: "abha" },
  // United Arab Emirates
  { country_id: AE, name_ar: "دبي", name_en: "Dubai", slug: "dubai" },
  { country_id: AE, name_ar: "أبوظبي", name_en: "Abu Dhabi", slug: "abu-dhabi" },
  { country_id: AE, name_ar: "الشارقة", name_en: "Sharjah", slug: "sharjah" },
  { country_id: AE, name_ar: "عجمان", name_en: "Ajman", slug: "ajman" },
  { country_id: AE, name_ar: "رأس الخيمة", name_en: "Ras Al Khaimah", slug: "ras-al-khaimah" },
  { country_id: AE, name_ar: "الفجيرة", name_en: "Fujairah", slug: "fujairah" },
  { country_id: AE, name_ar: "أم القيوين", name_en: "Umm Al Quwain", slug: "umm-al-quwain" },
  // Qatar
  { country_id: QA, name_ar: "الدوحة", name_en: "Doha", slug: "doha" },
  { country_id: QA, name_ar: "الريان", name_en: "Al Rayyan", slug: "al-rayyan" },
  { country_id: QA, name_ar: "الوكرة", name_en: "Al Wakrah", slug: "al-wakrah" },
  { country_id: QA, name_ar: "لوسيل", name_en: "Lusail", slug: "lusail" },
  // Kuwait
  { country_id: KW, name_ar: "مدينة الكويت", name_en: "Kuwait City", slug: "kuwait-city" },
  { country_id: KW, name_ar: "حولي", name_en: "Hawalli", slug: "hawalli" },
  { country_id: KW, name_ar: "السالمية", name_en: "Salmiya", slug: "salmiya" },
  { country_id: KW, name_ar: "الفروانية", name_en: "Farwaniya", slug: "farwaniya" },
  // Bahrain
  { country_id: BH, name_ar: "المنامة", name_en: "Manama", slug: "manama" },
  { country_id: BH, name_ar: "المحرق", name_en: "Muharraq", slug: "muharraq" },
  { country_id: BH, name_ar: "الرفاع", name_en: "Riffa", slug: "riffa" },
  { country_id: BH, name_ar: "مدينة عيسى", name_en: "Isa Town", slug: "isa-town" },
  // Oman
  { country_id: OM, name_ar: "مسقط", name_en: "Muscat", slug: "muscat" },
  { country_id: OM, name_ar: "صلالة", name_en: "Salalah", slug: "salalah" },
  { country_id: OM, name_ar: "صحار", name_en: "Sohar", slug: "sohar" },
  { country_id: OM, name_ar: "نزوى", name_en: "Nizwa", slug: "nizwa" },
];

export const CITIES: City[] = seeds.map((s, i) => ({
  ...s,
  id: cityId(i + 1),
  is_active: true,
  sort_order: i + 1,
  created_at: "2024-01-01T00:00:00Z",
}));

export const CITY_BY_ID: Record<string, City> = Object.fromEntries(
  CITIES.map((c) => [c.id, c]),
);

export const citiesByCountry = (countryId: string): City[] =>
  CITIES.filter((c) => c.country_id === countryId);
