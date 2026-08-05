import { Injectable } from "@nestjs/common";
import type { DeviceToken } from "@swap/types";

/** A generic, privacy-safe push message (no private message/swap content). */
export interface PushMessage {
  title: string;
  body: string;
  /** Navigation identifiers only — the app re-checks authorization on open. */
  data: Record<string, unknown>;
}

/** Per-device delivery result. `invalid` → the token is dead and must be disabled. */
export interface PushSendResult {
  deviceId: string;
  ok: boolean;
  invalid: boolean;
  error?: string;
}

/** Pluggable transport. Swap the mock for Expo Push / FCM v1 / APNs once creds exist. */
export interface PushProvider {
  send(devices: DeviceToken[], message: PushMessage): Promise<PushSendResult[]>;
}

/** DI token for the active {@link PushProvider}. */
export const PUSH_PROVIDER = Symbol("PUSH_PROVIDER");

/**
 * Default no-network provider. **No FCM/APNs credentials are configured yet** (the
 * M5 external-credential gap — see the owner checklist in docs). This does NOT send
 * anything; it simulates results so the full outbox lifecycle (sent / retry / invalid
 * → disable) is testable. Deterministic simulation via the token string:
 *   • contains "MOCK-INVALID" → invalid token (device gets disabled)
 *   • contains "MOCK-FAIL"    → transient failure (row retried with backoff)
 *   • otherwise               → delivered ok
 */
@Injectable()
export class MockPushProvider implements PushProvider {
  async send(devices: DeviceToken[], message: PushMessage): Promise<PushSendResult[]> {
    return devices.map((d) => {
      const invalid = d.token.includes("MOCK-INVALID");
      const fail = d.token.includes("MOCK-FAIL");
      return {
        deviceId: d.id,
        ok: !invalid && !fail,
        invalid,
        error: invalid ? "DeviceNotRegistered" : fail ? "simulated transient failure" : undefined,
      };
    });
  }
}
