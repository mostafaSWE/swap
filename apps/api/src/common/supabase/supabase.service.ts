import { Injectable, Logger } from "@nestjs/common";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

/**
 * Wraps Supabase access for the backend.
 *
 * `admin` uses the SERVICE ROLE key and therefore BYPASSES RLS — every service
 * that uses it MUST enforce authorization in code (ownership / admin checks).
 * This is the intended security model for the backend layer: RLS still protects
 * direct browser → Supabase reads, while privileged writes go through this API
 * which does its own authz. See docs/database-schema.md.
 */
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  readonly admin: SupabaseClient;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      this.logger.warn(
        "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — the API will start but DB calls will fail until configured.",
      );
    }
    this.admin = createClient(url ?? "http://localhost", serviceKey ?? "service-role-missing", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  /** Verify a Supabase access token and return the auth user (or null). */
  async getUserFromToken(token: string): Promise<User | null> {
    try {
      const { data, error } = await this.admin.auth.getUser(token);
      if (error) return null;
      return data.user;
    } catch {
      return null;
    }
  }
}
