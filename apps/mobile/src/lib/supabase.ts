import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { AppState } from "react-native";
import { createSupabaseClient, type SwapClient } from "@swap/api";

// Expo inlines EXPO_PUBLIC_* at build time; declare process for typing only.
declare const process: { env: Record<string, string | undefined> };

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? "";

if (!url || !anonKey) {
  // Fail LOUD. The old skeleton resolved this client to `null`, which silently
  // broke every screen. Throwing at import makes a misconfigured build obvious.
  throw new Error(
    "Missing Supabase config — set EXPO_PUBLIC_SUPABASE_URL and " +
      "EXPO_PUBLIC_SUPABASE_ANON_KEY (see apps/mobile/.env.example).",
  );
}

/**
 * Mobile Supabase client built from the shared @swap/api factory — the SAME
 * typed client + query functions the web app uses. On native we inject
 * AsyncStorage so the auth session survives cold starts, and disable
 * detectSessionInUrl (there is no browser URL to parse a session from).
 */
export const supabase: SwapClient = createSupabaseClient(url, anonKey, {
  storage: AsyncStorage,
  detectSessionInUrl: false,
  autoRefreshToken: true,
  persistSession: true,
});

// React Native has no window-focus events, so Supabase's token auto-refresh
// must be driven by AppState: run it while the app is foreground, pause it
// while backgrounded (the official Supabase + Expo pattern).
AppState.addEventListener("change", (state) => {
  if (state === "active") void supabase.auth.startAutoRefresh();
  else void supabase.auth.stopAutoRefresh();
});
