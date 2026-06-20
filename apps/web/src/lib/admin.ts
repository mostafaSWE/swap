/**
 * Admin-side data helpers. **Database-first** — queries run as the (admin) user
 * server-side, so admin RLS policies apply (admins can read every table). Demo
 * numbers are returned only when NEXT_PUBLIC_USE_DEMO_DATA=true.
 *
 * Analytics live in ./admin-analytics. This module covers the moderation
 * surfaces: the users / listings / reports queues, the audit log, the per-user
 * detail aggregate, and the catalog tables.
 */
import type {
  AdminAction,
  Category,
  City,
  Country,
  Listing,
  Profile,
  Rating,
  Report,
  SwapProposal,
} from "@swap/types";
import { createClient } from "./supabase/server";
import { isDemoMode } from "./env";

const PAGE_SIZE = 20;

/**
 * Whether a user is CURRENTLY suspended. Mirrors the AuthGuard: a temporary
 * suspension whose `suspended_until` is in the past is auto-lifted, so the admin
 * UI must not keep showing "Suspended" for it. (NULL window = indefinite.)
 */
export function effectiveSuspended(u: { is_suspended: boolean; suspended_until: string | null }): boolean {
  return u.is_suspended && (!u.suspended_until || new Date(u.suspended_until) > new Date());
}

export interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

function emptyPage<T>(page = 1, pageSize = PAGE_SIZE): Paged<T> {
  return { rows: [], total: 0, page, pageSize, pageCount: 0 };
}

function pageBounds(page: number, pageSize: number): { from: number; to: number } {
  const p = Math.max(1, Math.floor(page) || 1);
  return { from: (p - 1) * pageSize, to: (p - 1) * pageSize + pageSize - 1 };
}

/** Strips characters that would break a PostgREST `.or()` / `.ilike` filter. */
function ilikeSafe(q: string): string {
  return q.replace(/[%,()\\*]/g, " ").trim();
}

async function count(table: string, build?: (q: any) => any): Promise<number> {
  const supabase = createClient();
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (build) q = build(q);
  const { count: c } = await q;
  return c ?? 0;
}

async function fetchTable<T>(table: string, order = "created_at"): Promise<T[]> {
  try {
    const { data, error } = await createClient()
      .from(table)
      .select("*")
      .order(order, { ascending: table === "categories" || table === "countries" || table === "cities" })
      .limit(300);
    if (error) throw error;
    return (data ?? []) as T[];
  } catch (e) {
    console.error(`[admin] fetch ${table} failed:`, e);
    return [];
  }
}

/* Catalog tables — read from the DB so the admin sees actual DB state. */
export const fetchAdminCategories = () => fetchTable<Category>("categories", "sort_order");
export const fetchAdminCountries = () => fetchTable<Country>("countries", "sort_order");
export const fetchAdminCities = () => fetchTable<City>("cities", "sort_order");

/** Resolves a set of profile ids to usernames in one query. */
async function usernameMap(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const { data } = await createClient().from("profiles").select("id,username").in("id", unique);
  const m: Record<string, string> = {};
  for (const r of data ?? []) m[r.id] = r.username;
  return m;
}

/* ─────────────────────────── Users queue ─────────────────────────── */

export type UserStatusFilter = "all" | "active" | "suspended" | "banned" | "admin";

export interface AdminUsersQuery {
  search?: string;
  status?: UserStatusFilter;
  page?: number;
}

export async function fetchAdminUsers(query: AdminUsersQuery = {}): Promise<Paged<Profile>> {
  const page = Math.max(1, query.page ?? 1);
  if (isDemoMode()) return emptyPage<Profile>(page);
  try {
    const supabase = createClient();
    let q = supabase.from("profiles").select("*", { count: "exact" });

    const term = query.search ? ilikeSafe(query.search) : "";
    if (term) q = q.or(`username.ilike.%${term}%,full_name.ilike.%${term}%,email.ilike.%${term}%`);

    switch (query.status) {
      case "suspended":
        q = q.eq("is_suspended", true);
        break;
      case "banned":
        q = q.eq("is_banned", true);
        break;
      case "admin":
        q = q.eq("is_admin", true);
        break;
      case "active":
        q = q.eq("is_suspended", false).eq("is_banned", false);
        break;
      default:
        break;
    }

    const { from, to } = pageBounds(page, PAGE_SIZE);
    const { data, count: total, error } = await q
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    const t = total ?? 0;
    return { rows: (data ?? []) as Profile[], total: t, page, pageSize: PAGE_SIZE, pageCount: Math.ceil(t / PAGE_SIZE) };
  } catch (e) {
    console.error("[admin] fetchAdminUsers failed:", e);
    return emptyPage<Profile>(page);
  }
}

/* ─────────────────────────── User detail ─────────────────────────── */

export interface AdminUserDetail {
  profile: Profile;
  listings: Listing[];
  /** Reports filed against this user OR their listings. */
  reports: Report[];
  /** Swap proposals this user is a party to (most recent first). */
  proposals: SwapProposal[];
  /** Ratings this user received, newest first, with the rater's username. */
  ratings: (Rating & { rater_username: string | null })[];
  /** Admin actions targeting this user (notes, messages, suspensions) — the audit/notes trail. */
  actions: (AdminAction & { admin_username: string | null })[];
}

export async function fetchAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  if (isDemoMode()) return null;
  try {
    const supabase = createClient();
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (!profile) return null;

    const { data: listings } = await supabase
      .from("listings")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    const listingIds = (listings ?? []).map((l) => l.id);

    const targetIds = [userId, ...listingIds];
    const { data: reports } = await supabase
      .from("reports")
      .select("*")
      .in("target_id", targetIds)
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: proposals } = await supabase
      .from("swap_proposals")
      .select("*")
      .or(`proposer_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("updated_at", { ascending: false })
      .limit(50);

    const { data: ratings } = await supabase
      .from("ratings")
      .select("*")
      .eq("ratee_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: actions } = await supabase
      .from("admin_actions")
      .select("*")
      .eq("target_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    const names = await usernameMap([
      ...(ratings ?? []).map((r) => r.rater_id),
      ...(actions ?? []).map((a) => a.admin_id),
    ]);

    return {
      profile: profile as Profile,
      listings: (listings ?? []) as Listing[],
      reports: (reports ?? []) as Report[],
      proposals: (proposals ?? []) as SwapProposal[],
      ratings: ((ratings ?? []) as Rating[]).map((r) => ({ ...r, rater_username: names[r.rater_id] ?? null })),
      actions: ((actions ?? []) as AdminAction[]).map((a) => ({ ...a, admin_username: names[a.admin_id] ?? null })),
    };
  } catch (e) {
    console.error("[admin] fetchAdminUserDetail failed:", e);
    return null;
  }
}

/* ─────────────────────────── Listings queue ─────────────────────────── */

export type ListingTab = "all" | "reported" | "flagged";

export interface EnrichedListing extends Listing {
  owner_username: string | null;
  pending_reports: number;
}

export interface AdminListingsQuery {
  tab?: ListingTab;
  search?: string;
  page?: number;
}

/** distinct listing target_ids with a pending report. */
async function reportedListingIds(): Promise<string[]> {
  const { data } = await createClient()
    .from("reports")
    .select("target_id")
    .eq("target_type", "listing")
    .eq("status", "pending");
  return [...new Set((data ?? []).map((r) => r.target_id))];
}

export async function fetchAdminListings(query: AdminListingsQuery = {}): Promise<Paged<EnrichedListing>> {
  const page = Math.max(1, query.page ?? 1);
  const tab = query.tab ?? "all";
  if (isDemoMode()) return emptyPage<EnrichedListing>(page);
  try {
    const supabase = createClient();
    let q = supabase.from("listings").select("*", { count: "exact" });

    if (tab === "flagged") {
      q = q.eq("status", "hidden");
    } else if (tab === "reported") {
      const ids = await reportedListingIds();
      if (!ids.length) return emptyPage<EnrichedListing>(page);
      q = q.in("id", ids);
    }

    const term = query.search ? ilikeSafe(query.search) : "";
    if (term) q = q.ilike("title", `%${term}%`);

    const { from, to } = pageBounds(page, PAGE_SIZE);
    const { data, count: total, error } = await q
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;

    const listings = (data ?? []) as Listing[];
    const owners = await usernameMap(listings.map((l) => l.owner_id));

    // Pending-report counts for just this page's listings.
    const counts: Record<string, number> = {};
    if (listings.length) {
      const { data: rep } = await supabase
        .from("reports")
        .select("target_id")
        .eq("target_type", "listing")
        .eq("status", "pending")
        .in("target_id", listings.map((l) => l.id));
      for (const r of rep ?? []) counts[r.target_id] = (counts[r.target_id] ?? 0) + 1;
    }

    const rows: EnrichedListing[] = listings.map((l) => ({
      ...l,
      owner_username: owners[l.owner_id] ?? null,
      pending_reports: counts[l.id] ?? 0,
    }));
    const t = total ?? 0;
    return { rows, total: t, page, pageSize: PAGE_SIZE, pageCount: Math.ceil(t / PAGE_SIZE) };
  } catch (e) {
    console.error("[admin] fetchAdminListings failed:", e);
    return emptyPage<EnrichedListing>(page);
  }
}

/* ─────────────────────────── Reports queue ─────────────────────────── */

export type ReportSort = "severity" | "newest";

/** Higher = more severe. Drives the default "severity + age" ordering. */
export const REPORT_SEVERITY: Record<string, number> = {
  scam: 3,
  // Deal-closing disputes are a real moderation signal,
  // not background noise — rank them with the higher-severity reasons.
  "Exchange dispute": 3,
  "Swap dispute": 3,
  inappropriate: 2,
  spam: 1,
  other: 0,
};

// Reports are enriched + severity-sorted in JS, so we read a bounded working set.
const REPORTS_WORKING_LIMIT = 500;

export interface EnrichedReport extends Report {
  reporter_username: string | null;
  /** Human label for the reported entity (listing title / username) when resolvable. */
  target_label: string | null;
  severity: number;
}

export interface AdminReportsQuery {
  sort?: ReportSort;
  page?: number;
}

export async function fetchAdminReports(query: AdminReportsQuery = {}): Promise<Paged<EnrichedReport>> {
  const page = Math.max(1, query.page ?? 1);
  const sort = query.sort ?? "severity";
  if (isDemoMode()) return emptyPage<EnrichedReport>(page);
  try {
    const supabase = createClient();
    // Pull a working window, enrich + sort in JS (severity isn't a column).
    const { data, count: total, error } = await supabase
      .from("reports")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(REPORTS_WORKING_LIMIT);
    if (error) throw error;
    if ((total ?? 0) > REPORTS_WORKING_LIMIT) {
      // Don't pretend to paginate beyond what we sorted: pagination is derived
      // from the working set below. Surface the truncation rather than hiding it.
      console.warn(
        `[admin] reports queue capped at ${REPORTS_WORKING_LIMIT} of ${total}; older reports are not paginated.`,
      );
    }

    const reports = (data ?? []) as Report[];
    const reporters = await usernameMap(reports.map((r) => r.reporter_id));

    // Resolve target labels: usernames for user targets, titles for listing targets.
    const userTargetIds = reports.filter((r) => r.target_type === "user").map((r) => r.target_id);
    const listingTargetIds = reports.filter((r) => r.target_type === "listing").map((r) => r.target_id);
    const targetUsers = await usernameMap(userTargetIds);
    const titleMap: Record<string, string> = {};
    if (listingTargetIds.length) {
      const { data: ls } = await supabase
        .from("listings")
        .select("id,title")
        .in("id", [...new Set(listingTargetIds)]);
      for (const l of ls ?? []) titleMap[l.id] = l.title;
    }

    const enriched: EnrichedReport[] = reports.map((r) => ({
      ...r,
      reporter_username: reporters[r.reporter_id] ?? null,
      target_label:
        r.target_type === "user"
          ? targetUsers[r.target_id] ?? null
          : r.target_type === "listing"
            ? titleMap[r.target_id] ?? null
            : null,
      severity: REPORT_SEVERITY[r.reason] ?? 0,
    }));

    enriched.sort((a, b) => {
      if (sort === "severity" && b.severity !== a.severity) return b.severity - a.severity;
      return a.created_at < b.created_at ? (sort === "newest" ? 1 : -1) : sort === "newest" ? -1 : 1;
    });

    const { from, to } = pageBounds(page, PAGE_SIZE);
    const rows = enriched.slice(from, to + 1);
    // Paginate over the actually-sorted working set so no blank pages appear
    // past the cap (and severity ordering stays correct within it).
    const t = enriched.length;
    return { rows, total: t, page, pageSize: PAGE_SIZE, pageCount: Math.ceil(t / PAGE_SIZE) };
  } catch (e) {
    console.error("[admin] fetchAdminReports failed:", e);
    return emptyPage<EnrichedReport>(page);
  }
}

/* ─────────────────────────── Audit log ─────────────────────────── */

export interface EnrichedAction extends AdminAction {
  admin_username: string | null;
}

export interface AdminActionsQuery {
  search?: string;
  page?: number;
}

export async function fetchAdminActions(query: AdminActionsQuery = {}): Promise<Paged<EnrichedAction>> {
  const page = Math.max(1, query.page ?? 1);
  if (isDemoMode()) return emptyPage<EnrichedAction>(page);
  try {
    const supabase = createClient();
    let q = supabase.from("admin_actions").select("*", { count: "exact" });

    const term = query.search ? ilikeSafe(query.search) : "";
    if (term) q = q.or(`action_type.ilike.%${term}%,target_type.ilike.%${term}%,notes.ilike.%${term}%`);

    const { from, to } = pageBounds(page, PAGE_SIZE);
    const { data, count: total, error } = await q
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;

    const actions = (data ?? []) as AdminAction[];
    const admins = await usernameMap(actions.map((a) => a.admin_id));
    const rows: EnrichedAction[] = actions.map((a) => ({ ...a, admin_username: admins[a.admin_id] ?? null }));
    const t = total ?? 0;
    return { rows, total: t, page, pageSize: PAGE_SIZE, pageCount: Math.ceil(t / PAGE_SIZE) };
  } catch (e) {
    console.error("[admin] fetchAdminActions failed:", e);
    return emptyPage<EnrichedAction>(page);
  }
}
