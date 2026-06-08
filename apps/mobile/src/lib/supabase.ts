import Constants from "expo-constants";
import { createSupabaseClient, type SwapClient } from "@swap/api";

// Expo replaces EXPO_PUBLIC_* at build time; declare process for typing only.
declare const process: { env: Record<string, string | undefined> };

/**
 * Mobile Supabase client built from the shared @swap/api factory — the SAME
 * typed client and query functions used by the web app. Credentials come from
 * app.json `extra` (or EXPO_PUBLIC_* env vars).
 *
 * TODO (Phase 2): wire AsyncStorage for session persistence on native.
 */
const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? "";

export const supabase: SwapClient | null =
  url && anonKey ? createSupabaseClient(url, anonKey) : null;
