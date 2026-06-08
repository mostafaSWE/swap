import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  AdminAction,
  Listing,
  Profile,
  Report,
  VerificationRequest,
} from "@swap/types";
import type {
  AdminUpdateListingInput,
  AdminUpdateUserInput,
  UpdateReportInput,
  UpdateVerificationInput,
} from "@swap/validation";
import { SupabaseService } from "../../common/supabase/supabase.service";

export interface AdminOverview {
  totalUsers: number;
  verifiedUsers: number;
  activeListings: number;
  hiddenListings: number;
  pendingReports: number;
  totalConversations: number;
  totalMessages: number;
  listingsByCountry: { country_id: string; count: number }[];
  usersByCountry: { country_id: string; count: number }[];
}

@Injectable()
export class AdminService {
  constructor(private readonly supabase: SupabaseService) {}

  private get db() {
    return this.supabase.admin;
  }

  private async count(table: string, build?: (q: any) => any): Promise<number> {
    let q = this.db.from(table).select("*", { count: "exact", head: true });
    if (build) q = build(q);
    const { count } = await q;
    return count ?? 0;
  }

  private async groupByCountry(table: string): Promise<{ country_id: string; count: number }[]> {
    const { data } = await this.db.from(table).select("country_id");
    const tally: Record<string, number> = {};
    for (const row of data ?? []) {
      const id = (row as { country_id: string | null }).country_id;
      if (id) tally[id] = (tally[id] ?? 0) + 1;
    }
    return Object.entries(tally).map(([country_id, count]) => ({ country_id, count }));
  }

  async overview(): Promise<AdminOverview> {
    const [
      totalUsers,
      verifiedUsers,
      activeListings,
      hiddenListings,
      pendingReports,
      totalConversations,
      totalMessages,
      listingsByCountry,
      usersByCountry,
    ] = await Promise.all([
      this.count("profiles"),
      this.count("profiles", (q) => q.eq("is_verified", true)),
      this.count("listings", (q) => q.eq("status", "active")),
      this.count("listings", (q) => q.eq("status", "hidden")),
      this.count("reports", (q) => q.eq("status", "pending")),
      this.count("conversations"),
      this.count("messages"),
      this.groupByCountry("listings"),
      this.groupByCountry("profiles"),
    ]);
    return {
      totalUsers,
      verifiedUsers,
      activeListings,
      hiddenListings,
      pendingReports,
      totalConversations,
      totalMessages,
      listingsByCountry,
      usersByCountry,
    };
  }

  private async logAction(
    adminId: string,
    actionType: string,
    targetType: string,
    targetId: string,
    notes?: string,
  ): Promise<void> {
    await this.db.from("admin_actions").insert({
      admin_id: adminId,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      notes: notes ?? null,
    });
  }

  /* ── Users ── */
  async users(): Promise<Profile[]> {
    const { data } = await this.db
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  }

  async updateUser(adminId: string, id: string, input: AdminUpdateUserInput): Promise<Profile> {
    const { data, error } = await this.db
      .from("profiles")
      .update(input)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException("User not found");
    await this.logAction(adminId, "update_user", "user", id, JSON.stringify(input));
    return data;
  }

  /* ── Listings ── */
  async listings(): Promise<Listing[]> {
    const { data } = await this.db
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  }

  async updateListing(adminId: string, id: string, input: AdminUpdateListingInput): Promise<Listing> {
    const { data, error } = await this.db
      .from("listings")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException("Listing not found");
    await this.logAction(adminId, "update_listing", "listing", id, JSON.stringify(input));
    return data;
  }

  /* ── Reports ── */
  async reports(): Promise<Report[]> {
    const { data } = await this.db
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  }

  async updateReport(adminId: string, id: string, input: UpdateReportInput): Promise<Report> {
    const { data, error } = await this.db
      .from("reports")
      .update({ status: input.status })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException("Report not found");
    await this.logAction(adminId, "update_report", "report", id, input.status);
    return data;
  }

  /* ── Verification ── */
  async verifications(): Promise<VerificationRequest[]> {
    const { data } = await this.db
      .from("verification_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  }

  /**
   * Approve/reject a verification request. On approval, mark the user verified
   * (account) or the listing verified (item). No payment in MVP.
   */
  async updateVerification(
    adminId: string,
    id: string,
    input: UpdateVerificationInput,
  ): Promise<VerificationRequest> {
    const { data: request, error } = await this.db
      .from("verification_requests")
      .update({ status: input.status, notes: input.notes ?? null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!request) throw new NotFoundException("Verification request not found");

    const approved = input.status === "approved" || input.status === "completed";
    if (approved) {
      if (request.type === "account") {
        await this.db.from("profiles").update({ is_verified: true }).eq("id", request.user_id);
      } else if (request.type === "item" && request.listing_id) {
        await this.db.from("listings").update({ is_verified_item: true }).eq("id", request.listing_id);
      }
    }
    await this.logAction(adminId, "update_verification", "verification", id, input.status);
    return request;
  }

  async actions(): Promise<AdminAction[]> {
    const { data } = await this.db
      .from("admin_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  }
}
