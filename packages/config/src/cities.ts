import type { City } from "@swap/types";
import { COUNTRY_BY_ISO } from "./countries";

const SA = COUNTRY_BY_ISO["SA"]!.id;
const AE = COUNTRY_BY_ISO["AE"]!.id;
const QA = COUNTRY_BY_ISO["QA"]!.id;
const KW = COUNTRY_BY_ISO["KW"]!.id;
const BH = COUNTRY_BY_ISO["BH"]!.id;
const OM = COUNTRY_BY_ISO["OM"]!.id;
const EG = COUNTRY_BY_ISO["EG"]!.id;
const SY = COUNTRY_BY_ISO["SY"]!.id;

const cityId = (n: number) =>
  `22222222-2222-4222-8222-${n.toString().padStart(12, "0")}`;

type CitySeed = Omit<City, "id" | "is_active" | "sort_order" | "created_at">;

/**
 * Curated bilingual (ar/en) GCC city dataset.
 *
 * Source/method: English city coverage cross-checked against the
 * `country-state-city` npm dataset (MIT); Arabic names curated by hand because
 * no open package ships reliable Arabic names for all GCC cities (see
 * docs/database-schema.md → "Country/city data"). Extend by appending below —
 * the admin "Manage cities" screen can manage the rest later.
 *
 * IMPORTANT: the FIRST 31 entries keep their original Phase-1 order/IDs so demo
 * listings/profiles keep valid foreign keys. New cities are APPENDED (IDs 32+),
 * grouped per country only for readability — display uses citiesByCountry().
 */
const originalSeeds: CitySeed[] = [
  // Saudi Arabia (1-8)
  { country_id: SA, name_ar: "الرياض", name_en: "Riyadh", slug: "riyadh" },
  { country_id: SA, name_ar: "جدة", name_en: "Jeddah", slug: "jeddah" },
  { country_id: SA, name_ar: "مكة المكرمة", name_en: "Makkah", slug: "makkah" },
  { country_id: SA, name_ar: "المدينة المنورة", name_en: "Madinah", slug: "madinah" },
  { country_id: SA, name_ar: "الدمام", name_en: "Dammam", slug: "dammam" },
  { country_id: SA, name_ar: "الخبر", name_en: "Khobar", slug: "khobar" },
  { country_id: SA, name_ar: "الطائف", name_en: "Taif", slug: "taif" },
  { country_id: SA, name_ar: "أبها", name_en: "Abha", slug: "abha" },
  // United Arab Emirates (9-15)
  { country_id: AE, name_ar: "دبي", name_en: "Dubai", slug: "dubai" },
  { country_id: AE, name_ar: "أبوظبي", name_en: "Abu Dhabi", slug: "abu-dhabi" },
  { country_id: AE, name_ar: "الشارقة", name_en: "Sharjah", slug: "sharjah" },
  { country_id: AE, name_ar: "عجمان", name_en: "Ajman", slug: "ajman" },
  { country_id: AE, name_ar: "رأس الخيمة", name_en: "Ras Al Khaimah", slug: "ras-al-khaimah" },
  { country_id: AE, name_ar: "الفجيرة", name_en: "Fujairah", slug: "fujairah" },
  { country_id: AE, name_ar: "أم القيوين", name_en: "Umm Al Quwain", slug: "umm-al-quwain" },
  // Qatar (16-19)
  { country_id: QA, name_ar: "الدوحة", name_en: "Doha", slug: "doha" },
  { country_id: QA, name_ar: "الريان", name_en: "Al Rayyan", slug: "al-rayyan" },
  { country_id: QA, name_ar: "الوكرة", name_en: "Al Wakrah", slug: "al-wakrah" },
  { country_id: QA, name_ar: "لوسيل", name_en: "Lusail", slug: "lusail" },
  // Kuwait (20-23)
  { country_id: KW, name_ar: "مدينة الكويت", name_en: "Kuwait City", slug: "kuwait-city" },
  { country_id: KW, name_ar: "حولي", name_en: "Hawalli", slug: "hawalli" },
  { country_id: KW, name_ar: "السالمية", name_en: "Salmiya", slug: "salmiya" },
  { country_id: KW, name_ar: "الفروانية", name_en: "Farwaniya", slug: "farwaniya" },
  // Bahrain (24-27)
  { country_id: BH, name_ar: "المنامة", name_en: "Manama", slug: "manama" },
  { country_id: BH, name_ar: "المحرق", name_en: "Muharraq", slug: "muharraq" },
  { country_id: BH, name_ar: "الرفاع", name_en: "Riffa", slug: "riffa" },
  { country_id: BH, name_ar: "مدينة عيسى", name_en: "Isa Town", slug: "isa-town" },
  // Oman (28-31)
  { country_id: OM, name_ar: "مسقط", name_en: "Muscat", slug: "muscat" },
  { country_id: OM, name_ar: "صلالة", name_en: "Salalah", slug: "salalah" },
  { country_id: OM, name_ar: "صحار", name_en: "Sohar", slug: "sohar" },
  { country_id: OM, name_ar: "نزوى", name_en: "Nizwa", slug: "nizwa" },
];

const additionalSeeds: CitySeed[] = [
  // Saudi Arabia (more)
  { country_id: SA, name_ar: "الخرج", name_en: "Al Kharj", slug: "al-kharj" },
  { country_id: SA, name_ar: "بريدة", name_en: "Buraidah", slug: "buraidah" },
  { country_id: SA, name_ar: "عنيزة", name_en: "Unaizah", slug: "unaizah" },
  { country_id: SA, name_ar: "حائل", name_en: "Hail", slug: "hail" },
  { country_id: SA, name_ar: "تبوك", name_en: "Tabuk", slug: "tabuk" },
  { country_id: SA, name_ar: "الجبيل", name_en: "Jubail", slug: "jubail" },
  { country_id: SA, name_ar: "ينبع", name_en: "Yanbu", slug: "yanbu" },
  { country_id: SA, name_ar: "نجران", name_en: "Najran", slug: "najran" },
  { country_id: SA, name_ar: "جازان", name_en: "Jazan", slug: "jazan" },
  { country_id: SA, name_ar: "الأحساء", name_en: "Al Ahsa", slug: "al-ahsa" },
  { country_id: SA, name_ar: "القطيف", name_en: "Qatif", slug: "qatif" },
  { country_id: SA, name_ar: "عرعر", name_en: "Arar", slug: "arar" },
  { country_id: SA, name_ar: "سكاكا", name_en: "Sakaka", slug: "sakaka" },
  { country_id: SA, name_ar: "الباحة", name_en: "Al Baha", slug: "al-baha" },
  { country_id: SA, name_ar: "خميس مشيط", name_en: "Khamis Mushait", slug: "khamis-mushait" },
  { country_id: SA, name_ar: "بيشة", name_en: "Bisha", slug: "bisha" },
  { country_id: SA, name_ar: "حفر الباطن", name_en: "Hafar Al-Batin", slug: "hafar-al-batin" },
  { country_id: SA, name_ar: "القريات", name_en: "Qurayyat", slug: "qurayyat" },
  { country_id: SA, name_ar: "رابغ", name_en: "Rabigh", slug: "rabigh" },
  { country_id: SA, name_ar: "الزلفي", name_en: "Zulfi", slug: "zulfi" },
  { country_id: SA, name_ar: "الدوادمي", name_en: "Dawadmi", slug: "dawadmi" },
  { country_id: SA, name_ar: "القنفذة", name_en: "Al Qunfudhah", slug: "al-qunfudhah" },
  // United Arab Emirates (more)
  { country_id: AE, name_ar: "العين", name_en: "Al Ain", slug: "al-ain" },
  { country_id: AE, name_ar: "خورفكان", name_en: "Khor Fakkan", slug: "khor-fakkan" },
  { country_id: AE, name_ar: "دبا الفجيرة", name_en: "Dibba Al-Fujairah", slug: "dibba-al-fujairah" },
  { country_id: AE, name_ar: "كلباء", name_en: "Kalba", slug: "kalba" },
  { country_id: AE, name_ar: "مدينة زايد", name_en: "Madinat Zayed", slug: "madinat-zayed" },
  { country_id: AE, name_ar: "الرويس", name_en: "Ar-Ruways", slug: "ar-ruways" },
  { country_id: AE, name_ar: "جبل علي", name_en: "Jebel Ali", slug: "jebel-ali" },
  { country_id: AE, name_ar: "دبا الحصن", name_en: "Dibba Al-Hisn", slug: "dibba-al-hisn" },
  { country_id: AE, name_ar: "حتا", name_en: "Hatta", slug: "hatta" },
  { country_id: AE, name_ar: "ليوا", name_en: "Liwa", slug: "liwa" },
  { country_id: AE, name_ar: "الذيد", name_en: "Al Dhaid", slug: "al-dhaid" },
  { country_id: AE, name_ar: "غياثي", name_en: "Ghayathi", slug: "ghayathi" },
  { country_id: AE, name_ar: "مصفي", name_en: "Masafi", slug: "masafi" },
  // Qatar (more)
  { country_id: QA, name_ar: "الخور", name_en: "Al Khor", slug: "al-khor" },
  { country_id: QA, name_ar: "أم صلال", name_en: "Umm Salal", slug: "umm-salal" },
  { country_id: QA, name_ar: "دخان", name_en: "Dukhan", slug: "dukhan" },
  { country_id: QA, name_ar: "مسيعيد", name_en: "Mesaieed", slug: "mesaieed" },
  { country_id: QA, name_ar: "الشمال", name_en: "Al Shamal", slug: "al-shamal" },
  { country_id: QA, name_ar: "الذخيرة", name_en: "Al Dhakhira", slug: "al-dhakhira" },
  // Kuwait (more)
  { country_id: KW, name_ar: "الجهراء", name_en: "Al Jahra", slug: "al-jahra" },
  { country_id: KW, name_ar: "الأحمدي", name_en: "Al Ahmadi", slug: "al-ahmadi" },
  { country_id: KW, name_ar: "الفحيحيل", name_en: "Fahaheel", slug: "fahaheel" },
  { country_id: KW, name_ar: "المنقف", name_en: "Mangaf", slug: "mangaf" },
  { country_id: KW, name_ar: "صباح السالم", name_en: "Sabah Al-Salem", slug: "sabah-al-salem" },
  { country_id: KW, name_ar: "الجابرية", name_en: "Jabriya", slug: "jabriya" },
  // Bahrain (more)
  { country_id: BH, name_ar: "سترة", name_en: "Sitra", slug: "sitra" },
  { country_id: BH, name_ar: "مدينة حمد", name_en: "Hamad Town", slug: "hamad-town" },
  { country_id: BH, name_ar: "البديع", name_en: "Budaiya", slug: "budaiya" },
  { country_id: BH, name_ar: "جدحفص", name_en: "Jidhafs", slug: "jidhafs" },
  { country_id: BH, name_ar: "عالي", name_en: "A'ali", slug: "aali" },
  { country_id: BH, name_ar: "سار", name_en: "Saar", slug: "saar" },
  // Oman (more)
  { country_id: OM, name_ar: "صور", name_en: "Sur", slug: "sur" },
  { country_id: OM, name_ar: "بهلاء", name_en: "Bahla", slug: "bahla" },
  { country_id: OM, name_ar: "عبري", name_en: "Ibri", slug: "ibri" },
  { country_id: OM, name_ar: "إبراء", name_en: "Ibra", slug: "ibra" },
  { country_id: OM, name_ar: "الرستاق", name_en: "Rustaq", slug: "rustaq" },
  { country_id: OM, name_ar: "السيب", name_en: "Seeb", slug: "seeb" },
  { country_id: OM, name_ar: "بركاء", name_en: "Barka", slug: "barka" },
  { country_id: OM, name_ar: "خصب", name_en: "Khasab", slug: "khasab" },
  { country_id: OM, name_ar: "صحم", name_en: "Saham", slug: "saham" },
  { country_id: OM, name_ar: "الخابورة", name_en: "Al Khaburah", slug: "al-khaburah" },
  { country_id: OM, name_ar: "البريمي", name_en: "Al Buraimi", slug: "al-buraimi" },
  { country_id: OM, name_ar: "مطرح", name_en: "Muttrah", slug: "muttrah" },
  { country_id: OM, name_ar: "العامرات", name_en: "Al Amrat", slug: "al-amrat" },
  { country_id: OM, name_ar: "قريات", name_en: "Quriyat", slug: "quriyat" },
];

// Egypt + Syria (appended last so the positional IDs above stay stable —
// existing demo listings/profiles keep their foreign keys). Cities are ordered
// by population + commercial significance. IDs 99+ / sort_order 99+.
const newSeeds: CitySeed[] = [
  // Egypt
  { country_id: EG, name_ar: "القاهرة", name_en: "Cairo", slug: "cairo" },
  { country_id: EG, name_ar: "الإسكندرية", name_en: "Alexandria", slug: "alexandria" },
  { country_id: EG, name_ar: "الجيزة", name_en: "Giza", slug: "giza" },
  { country_id: EG, name_ar: "شبرا الخيمة", name_en: "Shubra El Kheima", slug: "shubra-el-kheima" },
  { country_id: EG, name_ar: "بورسعيد", name_en: "Port Said", slug: "port-said" },
  { country_id: EG, name_ar: "السويس", name_en: "Suez", slug: "suez" },
  { country_id: EG, name_ar: "المحلة الكبرى", name_en: "El Mahalla El Kubra", slug: "el-mahalla-el-kubra" },
  { country_id: EG, name_ar: "المنصورة", name_en: "Mansoura", slug: "mansoura" },
  { country_id: EG, name_ar: "طنطا", name_en: "Tanta", slug: "tanta" },
  { country_id: EG, name_ar: "أسيوط", name_en: "Asyut", slug: "asyut" },
  { country_id: EG, name_ar: "الإسماعيلية", name_en: "Ismailia", slug: "ismailia" },
  { country_id: EG, name_ar: "الفيوم", name_en: "Fayoum", slug: "fayoum" },
  { country_id: EG, name_ar: "الزقازيق", name_en: "Zagazig", slug: "zagazig" },
  { country_id: EG, name_ar: "أسوان", name_en: "Aswan", slug: "aswan" },
  { country_id: EG, name_ar: "دمنهور", name_en: "Damanhur", slug: "damanhur" },
  { country_id: EG, name_ar: "الأقصر", name_en: "Luxor", slug: "luxor" },
  // Syria
  { country_id: SY, name_ar: "دمشق", name_en: "Damascus", slug: "damascus" },
  { country_id: SY, name_ar: "حلب", name_en: "Aleppo", slug: "aleppo" },
  { country_id: SY, name_ar: "حمص", name_en: "Homs", slug: "homs" },
  { country_id: SY, name_ar: "اللاذقية", name_en: "Latakia", slug: "latakia" },
  { country_id: SY, name_ar: "حماة", name_en: "Hama", slug: "hama" },
  { country_id: SY, name_ar: "الرقة", name_en: "Raqqa", slug: "raqqa" },
  { country_id: SY, name_ar: "دير الزور", name_en: "Deir ez-Zor", slug: "deir-ez-zor" },
  { country_id: SY, name_ar: "الحسكة", name_en: "Al-Hasakah", slug: "al-hasakah" },
  { country_id: SY, name_ar: "القامشلي", name_en: "Qamishli", slug: "qamishli" },
  { country_id: SY, name_ar: "طرطوس", name_en: "Tartus", slug: "tartus" },
  { country_id: SY, name_ar: "منبج", name_en: "Manbij", slug: "manbij" },
  { country_id: SY, name_ar: "إدلب", name_en: "Idlib", slug: "idlib" },
  { country_id: SY, name_ar: "درعا", name_en: "Daraa", slug: "daraa" },
];

const seeds: CitySeed[] = [...originalSeeds, ...additionalSeeds, ...newSeeds];

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
  CITIES.filter((c) => c.country_id === countryId).sort((a, b) =>
    a.name_en.localeCompare(b.name_en),
  );
