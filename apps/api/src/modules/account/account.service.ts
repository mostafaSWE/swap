import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { AccountDeletionRequestInput } from "@swap/validation";
import { SupabaseService } from "../../common/supabase/supabase.service";

/** Buckets whose objects are keyed under a `<user_id>/…` prefix, so a whole user's
 *  uploads can be enumerated and removed. `swap-confirmations` is deliberately NOT
 *  here — see `deleteAccount()`. */
const USER_PREFIXED_BUCKETS = ["avatars", "listing-images", "chat-images"] as const;

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Permanently delete the caller's account.
   *
   * Three stages, in this order — the DB stage first so that if a later stage fails
   * the account is already unusable and de-identified (fail safe, not fail open):
   *
   *  1. `delete_account(uuid)` RPC (one transaction): removes every personal row and
   *     anonymises the profile into a tombstone. See migration 0022 for exactly what
   *     is purged vs retained and why a hard delete is unsafe here.
   *  2. Storage purge: everything under `<user_id>/` in the user-prefixed buckets.
   *  3. Delete the Supabase auth user, which frees the email/phone for re-use and
   *     makes sign-in impossible. Migration 0022 dropped the cascading FK from
   *     profiles → auth.users so this does NOT take the tombstone (and with it the
   *     counterparty's messages, ratings and our moderation reports) down with it.
   */
  async deleteAccount(userId: string, reason?: string): Promise<{ deleted: true }> {
    // Stage 1 — atomic DB purge + anonymise.
    const { error: rpcError } = await this.supabase.admin.rpc("delete_account", {
      p_user_id: userId,
    });
    if (rpcError) {
      // Surface the two deliberate guard rails from the SQL function as clean HTTP.
      if (rpcError.message?.includes("admin_cannot_self_delete")) {
        throw new ForbiddenException({
          statusCode: 403,
          error: "Forbidden",
          code: "admin_cannot_self_delete",
          message: "Admin accounts cannot be self-deleted. Remove admin rights first.",
        });
      }
      if (rpcError.message?.includes("profile_not_found")) {
        throw new NotFoundException("Profile not found");
      }
      throw rpcError;
    }

    // Stage 2 — storage. Best-effort: the account is already de-identified, so a
    // storage hiccup must not leave the caller stuck on a live account.
    for (const bucket of USER_PREFIXED_BUCKETS) {
      try {
        await this.purgeUserFolder(bucket, userId);
      } catch (err) {
        this.logger.error(`Storage purge failed for ${bucket}/${userId}: ${String(err)}`);
      }
    }

    // Stage 3 — the login itself.
    try {
      const { error } = await this.supabase.admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    } catch (err) {
      // The profile is already an anonymised tombstone and every session token now
      // fails the AuthGuard's deleted_at check, so the account is effectively gone.
      // Log loudly so the leftover auth row can be swept manually.
      this.logger.error(`auth.admin.deleteUser failed for ${userId}: ${String(err)}`);
    }

    if (reason?.trim()) {
      // Keep the free-text reason detached from the (now deleted) identity: log only.
      this.logger.log(`Account deleted. Reason given: ${reason.trim().slice(0, 500)}`);
    }

    return { deleted: true };
  }

  /**
   * Record a deletion request from the public web form. Used by people who cannot
   * sign in (lost password, already uninstalled) — Play requires a deletion route
   * that does not depend on having the app.
   *
   * Always resolves the same way regardless of whether the email exists, so the
   * endpoint cannot be used to test which addresses are registered.
   */
  async requestDeletion(input: AccountDeletionRequestInput): Promise<{ received: true }> {
    const email = input.email.trim().toLowerCase();

    // Best-effort match so support can action it quickly; never revealed to the caller.
    const { data: match } = await this.supabase.admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .is("deleted_at", null)
      .maybeSingle();

    const { error } = await this.supabase.admin.from("account_deletion_requests").insert({
      email,
      username: input.username?.trim() || null,
      reason: input.reason?.trim() || null,
      user_id: match?.id ?? null,
    });
    if (error) {
      // Don't leak storage failures to an unauthenticated caller; log and 202 anyway
      // so the user still sees "we've received your request" and contacts support.
      this.logger.error(`Failed to record deletion request: ${error.message}`);
    }

    return { received: true };
  }

  /** Recursively list and remove every object under `<userId>/` in a bucket. */
  private async purgeUserFolder(bucket: string, userId: string): Promise<void> {
    const paths = await this.listRecursive(bucket, userId);
    if (paths.length === 0) return;
    // Supabase caps a remove() batch; chunk defensively.
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await this.supabase.admin.storage
        .from(bucket)
        .remove(paths.slice(i, i + 100));
      if (error) throw error;
    }
    this.logger.log(`Purged ${paths.length} object(s) from ${bucket}/${userId}`);
  }

  /** Depth-limited recursive listing — storage `list()` is one level at a time. */
  private async listRecursive(bucket: string, prefix: string, depth = 0): Promise<string[]> {
    if (depth > 3) return [];
    const { data, error } = await this.supabase.admin.storage
      .from(bucket)
      .list(prefix, { limit: 1000 });
    if (error || !data) return [];

    const files: string[] = [];
    for (const entry of data) {
      const path = `${prefix}/${entry.name}`;
      // Supabase marks real files with an `id`; pseudo-folders have none.
      if (entry.id) files.push(path);
      else files.push(...(await this.listRecursive(bucket, path, depth + 1)));
    }
    return files;
  }
}
