import { Inject, Injectable, Logger } from "@nestjs/common";
import type { DeviceToken, Locale, Notification, NotificationType } from "@swap/types";
import type { RegisterDeviceInput } from "@swap/validation";
import { SupabaseService } from "../../common/supabase/supabase.service";
import { PUSH_PROVIDER, type PushMessage, type PushProvider } from "./push.provider";

const MAX_ATTEMPTS = 5;

/**
 * Generic, privacy-safe push copy per notification type. Deliberately carries NO
 * private content (message text, item names, prices) — only a category label — so
 * nothing sensitive lands on a lock screen. The app navigates using `data`.
 */
const COPY: Record<NotificationType, { en: string; ar: string }> = {
  new_message: { en: "New message", ar: "رسالة جديدة" },
  new_follower: { en: "New follower", ar: "متابع جديد" },
  new_rating: { en: "New rating", ar: "تقييم جديد" },
  proposal_received: { en: "New swap proposal", ar: "عرض مبادلة جديد" },
  proposal_countered: { en: "Your proposal was countered", ar: "تم تقديم عرض مقابل" },
  proposal_accepted: { en: "Your proposal was accepted", ar: "تم قبول عرضك" },
  proposal_cancelled: { en: "A proposal was cancelled", ar: "تم إلغاء عرض" },
  swap_confirm_pending: { en: "Confirm your swap", ar: "أكّد عملية المبادلة" },
  swap_completed: { en: "Swap completed", ar: "اكتملت المبادلة" },
  swap_disputed: { en: "A swap was disputed", ar: "تم فتح نزاع على مبادلة" },
};

@Injectable()
export class PushService {
  private readonly log = new Logger(PushService.name);

  constructor(
    private readonly supabase: SupabaseService,
    @Inject(PUSH_PROVIDER) private readonly provider: PushProvider,
  ) {}

  /** Idempotent register/rotate for the caller's installation (owner-scoped). */
  async registerDevice(userId: string, input: RegisterDeviceInput): Promise<void> {
    const { error } = await this.supabase.admin.from("device_tokens").upsert(
      {
        user_id: userId,
        installation_id: input.installation_id,
        token: input.token,
        provider: input.provider,
        platform: input.platform,
        app_env: input.app_env,
        enabled: true,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,installation_id" },
    );
    if (error) throw error;
  }

  /** Revoke this installation's token (logout). Soft-disable so history is kept. */
  async revokeDevice(userId: string, installationId: string): Promise<void> {
    const { error } = await this.supabase.admin
      .from("device_tokens")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("installation_id", installationId);
    if (error) throw error;
  }

  async listDevices(userId: string): Promise<DeviceToken[]> {
    const { data, error } = await this.supabase.admin
      .from("device_tokens")
      .select("*")
      .eq("user_id", userId)
      .order("last_seen_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Drain the push_outbox: for each due `pending` row, deliver to the user's enabled
   * devices via the provider, then advance the row. Idempotent + bounded:
   *   • no enabled devices / missing notification → `skipped`
   *   • any device delivered → `sent`
   *   • invalid token(s) → that device is disabled
   *   • all deliveries failed → retry with exponential backoff; `failed` after MAX_ATTEMPTS
   * Never throws for a single bad row (isolates failures). Called by the cron and by
   * the admin "process now" endpoint.
   */
  async processOutbox(limit = 50): Promise<{ processed: number; sent: number; skipped: number; retried: number; failed: number }> {
    const nowIso = new Date().toISOString();
    const { data: rows, error } = await this.supabase.admin
      .from("push_outbox")
      .select("*")
      .eq("status", "pending")
      .lte("next_attempt_at", nowIso)
      .order("next_attempt_at", { ascending: true })
      .limit(limit);
    if (error) throw error;

    let sent = 0;
    let skipped = 0;
    let retried = 0;
    let failed = 0;

    for (const row of rows ?? []) {
      try {
        const [{ data: devices }, { data: notif }, { data: profile }] = await Promise.all([
          this.supabase.admin.from("device_tokens").select("*").eq("user_id", row.user_id).eq("enabled", true),
          this.supabase.admin.from("notifications").select("*").eq("id", row.notification_id).maybeSingle(),
          this.supabase.admin.from("profiles").select("preferred_language").eq("id", row.user_id).maybeSingle(),
        ]);

        if (!notif) {
          await this.finish(row.id, "skipped", row.attempts, "notification no longer exists");
          skipped++;
          continue;
        }
        if (!devices?.length) {
          await this.finish(row.id, "skipped", row.attempts, "no enabled devices");
          skipped++;
          continue;
        }

        const message = this.buildMessage(notif, (profile?.preferred_language as Locale) ?? "ar");
        const results = await this.provider.send(devices, message);

        const invalidIds = results.filter((r) => r.invalid).map((r) => r.deviceId);
        if (invalidIds.length) {
          await this.supabase.admin.from("device_tokens").update({ enabled: false }).in("id", invalidIds);
        }

        const attempts = row.attempts + 1;
        if (results.some((r) => r.ok)) {
          await this.finish(row.id, "sent", attempts, null);
          sent++;
        } else if (attempts >= MAX_ATTEMPTS) {
          await this.finish(row.id, "failed", attempts, results.find((r) => r.error)?.error ?? "delivery failed");
          failed++;
        } else {
          const backoffMs = Math.min(60_000 * 2 ** attempts, 3_600_000); // exp, capped at 1h
          await this.supabase.admin
            .from("push_outbox")
            .update({
              status: "pending",
              attempts,
              next_attempt_at: new Date(Date.now() + backoffMs).toISOString(),
              last_error: results.find((r) => r.error)?.error ?? "retry",
            })
            .eq("id", row.id);
          retried++;
        }
      } catch (e) {
        this.log.error(`outbox row ${row.id} failed: ${(e as Error).message}`);
        // leave it pending; the next tick retries (do not lose the row)
      }
    }
    return { processed: rows?.length ?? 0, sent, skipped, retried, failed };
  }

  private async finish(id: string, status: "sent" | "failed" | "skipped", attempts: number, error: string | null) {
    await this.supabase.admin.from("push_outbox").update({ status, attempts, last_error: error }).eq("id", id);
  }

  private buildMessage(notif: Notification, locale: Locale): PushMessage {
    const label = COPY[notif.type][locale];
    return {
      title: "JustSwap",
      body: label,
      data: {
        type: notif.type,
        notification_id: notif.id,
        proposal_id: notif.proposal_id,
        conversation_id: notif.conversation_id,
      },
    };
  }
}
