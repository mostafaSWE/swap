/**
 * Admin analytics (spec §4.2). Computed server-side via the admin's RLS client
 * (admins can read every table), bucketed in JS. At MVP volume this is cheap; if
 * data grows, move the per-day/per-week aggregation into SQL (date_trunc) RPCs.
 *
 * The five metric CARDS are current totals with a fixed last-30-day sparkline.
 * Every CHART respects the date-range picker ([from, to], inclusive days).
 */
import { createClient } from "./supabase/server";
import { isDemoMode } from "./env";

export interface AdminAnalyticsRange {
  /** Inclusive day, YYYY-MM-DD (UTC). */
  from: string;
  to: string;
}

export interface NamedCount {
  id: string;
  name_ar: string;
  name_en: string;
  count: number;
}

export interface AdminAnalytics {
  range: AdminAnalyticsRange;
  cards: {
    totalUsers: number;
    activeListings: number;
    completedSwaps: number;
    openProposals: number;
    pendingReports: number;
  };
  /** 30 daily points each (oldest → newest), for the card sparklines. */
  sparklines: {
    users: number[];
    listings: number[];
    completions: number[];
    proposals: number[];
    reports: number[];
  };
  /** New users + new listings per day across the selected range. */
  daily: { date: string; users: number; listings: number }[];
  /** Completed swaps per ISO week (week-start date) across the range. */
  completionsByWeek: { week: string; count: number }[];
  /** Active listings created in range, grouped by category / city. */
  categoryBreakdown: NamedCount[];
  cityBreakdown: NamedCount[];
  /** Proposal funnel over the range (current status is a proxy for "reached"). */
  funnel: { proposals: number; agreed: number; completed: number };
}

const DAY_MS = 86_400_000;

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** UTC day key (YYYY-MM-DD) for a timestamp. */
function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Midnight UTC for a YYYY-MM-DD string. */
function startOfUTCDay(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/** Inclusive list of UTC day keys from `start` to `end` (both YYYY-MM-DD). */
function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  let t = startOfUTCDay(start).getTime();
  const last = startOfUTCDay(end).getTime();
  // Guard against an inverted or absurd range.
  for (let i = 0; t <= last && i < 800; i += 1, t += DAY_MS) {
    out.push(dayKey(new Date(t)));
  }
  return out;
}

/** Monday-based week-start day key (UTC) for a timestamp. */
function weekKey(d: Date): string {
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(d.getTime() - day * DAY_MS);
  return dayKey(monday);
}

/** Counts timestamps into the provided ordered day keys. */
function bucketDays(timestamps: string[], dayKeys: string[]): number[] {
  const tally: Record<string, number> = {};
  for (const ts of timestamps) {
    const k = dayKey(new Date(ts));
    tally[k] = (tally[k] ?? 0) + 1;
  }
  return dayKeys.map((k) => tally[k] ?? 0);
}

type Db = ReturnType<typeof createClient>;

async function count(db: Db, table: string, build?: (q: any) => any): Promise<number> {
  let q = db.from(table).select("*", { count: "exact", head: true });
  if (build) q = build(q);
  const { count: c } = await q;
  return c ?? 0;
}

/** Selects a single timestamp column within [fromISO, toISO], returns the raw values. */
async function selectTimestamps(
  db: Db,
  table: string,
  col: string,
  fromISO: string,
  toISO: string,
  build?: (q: any) => any,
): Promise<string[]> {
  let q = db.from(table).select(col).gte(col, fromISO).lte(col, toISO).limit(20000);
  if (build) q = build(q);
  const { data } = await q;
  return (data ?? [])
    .map((r: Record<string, string>) => r[col])
    .filter((v): v is string => Boolean(v));
}

const OPEN_PROPOSAL = ["pending", "countered", "agreed", "awaiting_confirmation"];
const AGREED_OR_BEYOND = ["agreed", "awaiting_confirmation", "completed"];

export function defaultRange(): AdminAnalyticsRange {
  const today = new Date();
  const to = dayKey(today);
  const from = dayKey(new Date(today.getTime() - 89 * DAY_MS));
  return { from, to };
}

/** Clamp/normalise a possibly-invalid range coming from the URL. */
export function normaliseRange(input?: Partial<AdminAnalyticsRange>): AdminAnalyticsRange {
  const dflt = defaultRange();
  const isDay = (s?: string) => Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s));
  let from = isDay(input?.from) ? input!.from! : dflt.from;
  let to = isDay(input?.to) ? input!.to! : dflt.to;
  if (startOfUTCDay(from).getTime() > startOfUTCDay(to).getTime()) [from, to] = [to, from];
  return { from, to };
}

export async function fetchAdminAnalytics(
  rangeInput?: Partial<AdminAnalyticsRange>,
): Promise<AdminAnalytics> {
  const range = normaliseRange(rangeInput);
  if (isDemoMode()) return demoAnalytics(range);

  try {
    const db = createClient();
    const fromISO = startOfUTCDay(range.from).toISOString();
    const toISO = new Date(startOfUTCDay(range.to).getTime() + DAY_MS - 1).toISOString();

    // Sparklines: fixed last 30 days ending TODAY, independent of the picker.
    // The upper bound must be end-of-today (NOT the picker's range.to), else a
    // past range end would truncate or empty the sparklines.
    const today = new Date();
    const spark30From = startOfUTCDay(dayKey(new Date(today.getTime() - 29 * DAY_MS)));
    const spark30FromISO = spark30From.toISOString();
    const spark30ToISO = new Date(startOfUTCDay(dayKey(today)).getTime() + DAY_MS - 1).toISOString();
    const sparkDays = eachDay(dayKey(spark30From), dayKey(today));

    const [
      totalUsers,
      activeListings,
      completedSwaps,
      openProposals,
      pendingReports,
      // sparkline source timestamps (last 30 days)
      sUsers,
      sListings,
      sCompletions,
      sProposals,
      sReports,
      // range timestamps
      rUsers,
      rListings,
      rCompletions,
      // breakdowns + funnel
      catRows,
      cityRows,
      proposalsInRange,
      agreedInRange,
      completedInRange,
      categories,
      cities,
    ] = await Promise.all([
      count(db, "profiles"),
      count(db, "listings", (q) => q.eq("status", "active")),
      count(db, "swap_proposals", (q) => q.eq("status", "completed")),
      count(db, "swap_proposals", (q) => q.in("status", OPEN_PROPOSAL)),
      count(db, "reports", (q) => q.eq("status", "pending")),
      selectTimestamps(db, "profiles", "created_at", spark30FromISO, spark30ToISO),
      selectTimestamps(db, "listings", "created_at", spark30FromISO, spark30ToISO, (q) =>
        q.eq("status", "active"),
      ),
      selectTimestamps(db, "swap_proposals", "updated_at", spark30FromISO, spark30ToISO, (q) =>
        q.eq("status", "completed"),
      ),
      selectTimestamps(db, "swap_proposals", "created_at", spark30FromISO, spark30ToISO),
      selectTimestamps(db, "reports", "created_at", spark30FromISO, spark30ToISO),
      selectTimestamps(db, "profiles", "created_at", fromISO, toISO),
      selectTimestamps(db, "listings", "created_at", fromISO, toISO),
      selectTimestamps(db, "swap_proposals", "updated_at", fromISO, toISO, (q) =>
        q.eq("status", "completed"),
      ),
      // category/city of active listings created in range
      rangeRows(db, "listings", "category_id", fromISO, toISO),
      rangeRows(db, "listings", "city_id", fromISO, toISO),
      count(db, "swap_proposals", (q) => q.gte("created_at", fromISO).lte("created_at", toISO)),
      count(db, "swap_proposals", (q) =>
        q.gte("created_at", fromISO).lte("created_at", toISO).in("status", AGREED_OR_BEYOND),
      ),
      count(db, "swap_proposals", (q) =>
        q.gte("created_at", fromISO).lte("created_at", toISO).eq("status", "completed"),
      ),
      db.from("categories").select("id,name_ar,name_en"),
      db.from("cities").select("id,name_ar,name_en"),
    ]);

    const rangeDays = eachDay(range.from, range.to);
    const usersByDay = bucketDays(rUsers, rangeDays);
    const listingsByDay = bucketDays(rListings, rangeDays);
    const daily = rangeDays.map((date, i) => ({
      date,
      users: usersByDay[i] ?? 0,
      listings: listingsByDay[i] ?? 0,
    }));

    // completions per week
    const weekTally: Record<string, number> = {};
    for (const ts of rCompletions) {
      const k = weekKey(new Date(ts));
      weekTally[k] = (weekTally[k] ?? 0) + 1;
    }
    const completionsByWeek = Object.entries(weekTally)
      .map(([week, c]) => ({ week, count: c }))
      .sort((a, b) => a.week.localeCompare(b.week));

    const catMap = nameMap(categories.data);
    const cityMap = nameMap(cities.data);

    return {
      range,
      cards: { totalUsers, activeListings, completedSwaps, openProposals, pendingReports },
      sparklines: {
        users: bucketDays(sUsers, sparkDays),
        listings: bucketDays(sListings, sparkDays),
        completions: bucketDays(sCompletions, sparkDays),
        proposals: bucketDays(sProposals, sparkDays),
        reports: bucketDays(sReports, sparkDays),
      },
      daily,
      completionsByWeek,
      categoryBreakdown: tallyNamed(catRows, catMap),
      cityBreakdown: tallyNamed(cityRows, cityMap),
      funnel: { proposals: proposalsInRange, agreed: agreedInRange, completed: completedInRange },
    };
  } catch (e) {
    console.error("[admin] fetchAdminAnalytics failed:", e);
    return emptyAnalytics(range);
  }
}

/** Selects one id column from active listings created in range (for breakdowns). */
async function rangeRows(
  db: Db,
  table: string,
  col: string,
  fromISO: string,
  toISO: string,
): Promise<string[]> {
  const { data } = await db
    .from(table)
    .select(col)
    .eq("status", "active")
    .gte("created_at", fromISO)
    .lte("created_at", toISO)
    .limit(20000);
  return (data ?? []).map((r: Record<string, string | null>) => r[col]).filter(Boolean) as string[];
}

function nameMap(
  rows: { id: string; name_ar: string; name_en: string }[] | null,
): Record<string, { name_ar: string; name_en: string }> {
  const m: Record<string, { name_ar: string; name_en: string }> = {};
  for (const r of rows ?? []) m[r.id] = { name_ar: r.name_ar, name_en: r.name_en };
  return m;
}

function tallyNamed(
  ids: string[],
  names: Record<string, { name_ar: string; name_en: string }>,
): NamedCount[] {
  const tally: Record<string, number> = {};
  for (const id of ids) tally[id] = (tally[id] ?? 0) + 1;
  return Object.entries(tally)
    .map(([id, c]) => ({
      id,
      name_ar: names[id]?.name_ar ?? id,
      name_en: names[id]?.name_en ?? id,
      count: c,
    }))
    .sort((a, b) => b.count - a.count);
}

function emptyAnalytics(range: AdminAnalyticsRange): AdminAnalytics {
  return {
    range,
    cards: { totalUsers: 0, activeListings: 0, completedSwaps: 0, openProposals: 0, pendingReports: 0 },
    sparklines: { users: [], listings: [], completions: [], proposals: [], reports: [] },
    daily: [],
    completionsByWeek: [],
    categoryBreakdown: [],
    cityBreakdown: [],
    funnel: { proposals: 0, agreed: 0, completed: 0 },
  };
}

/** Deterministic synthetic data so the dashboard renders without a database. */
function demoAnalytics(range: AdminAnalyticsRange): AdminAnalytics {
  const rangeDays = eachDay(range.from, range.to);
  const wave = (i: number, base: number, amp: number) =>
    Math.max(0, Math.round(base + amp * Math.sin(i / 4) + (i % 3)));
  const daily = rangeDays.map((date, i) => ({
    date,
    users: wave(i, 3, 2),
    listings: wave(i, 5, 3),
  }));
  const spark = (base: number) => Array.from({ length: 30 }, (_, i) => wave(i, base, 2));
  const weeks: Record<string, number> = {};
  rangeDays.forEach((d, i) => {
    if (i % 7 === 0) weeks[d] = wave(i, 2, 2);
  });
  return {
    range,
    cards: { totalUsers: 12, activeListings: 40, completedSwaps: 7, openProposals: 5, pendingReports: 3 },
    sparklines: {
      users: spark(3),
      listings: spark(5),
      completions: spark(1),
      proposals: spark(2),
      reports: spark(1),
    },
    daily,
    completionsByWeek: Object.entries(weeks).map(([week, count]) => ({ week, count })),
    categoryBreakdown: [
      { id: "1", name_ar: "إلكترونيات", name_en: "Electronics", count: 14 },
      { id: "2", name_ar: "ملابس", name_en: "Clothing", count: 9 },
      { id: "3", name_ar: "كتب", name_en: "Books", count: 7 },
      { id: "4", name_ar: "أثاث", name_en: "Furniture", count: 6 },
      { id: "5", name_ar: "رياضة", name_en: "Sports", count: 4 },
    ],
    cityBreakdown: [
      { id: "1", name_ar: "الرياض", name_en: "Riyadh", count: 12 },
      { id: "2", name_ar: "جدة", name_en: "Jeddah", count: 8 },
      { id: "3", name_ar: "دبي", name_en: "Dubai", count: 7 },
      { id: "4", name_ar: "الدوحة", name_en: "Doha", count: 5 },
    ],
    funnel: { proposals: 24, agreed: 12, completed: 7 },
  };
}
