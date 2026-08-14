// Polyfills MUST load before anything that touches URL / crypto (i.e. supabase-js).
// Order matters: get-random-values first, then the WHATWG URL polyfill (RN's
// built-in URL has a no-op searchParams, which would drop REST query strings).
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import { useEffect, useState } from "react";
import { I18nManager } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../src/theme";
import { applyLocaleOverride, isRTL, t } from "../src/i18n";
import { getStoredLocale } from "../src/lib/locale-store";
import { TermsProvider } from "../src/lib/terms";
import { BiometricLock } from "../src/components/BiometricLock";
import { PushManager } from "../src/components/PushManager";
import { LoadingScreen } from "../src/components/LoadingScreen";

// Keep the native splash up until the boot direction guard has confirmed the
// native layout direction matches the locale — nothing renders before then.
void SplashScreen.preventAutoHideAsync();

// The app entry is the tab group (there is no root app/index.tsx), so tell
// expo-router the root anchor is "(tabs)".
export const unstable_settings = { initialRouteName: "(tabs)" };

// Branded auth routes float a transparent header so BrandBackground's glow/grid/motif
// crown the screen under the (white) back chevron, instead of an opaque bar masking it.
// (These screens set their own `title:""` in-component, which only merges the title.)
const TRANSPARENT_HEADER = { title: "", headerTransparent: true, headerStyle: { backgroundColor: "transparent" } } as const;

/**
 * Boot direction guard — enforces the hard invariant that a **mismatched layout
 * direction is never rendered** (Arabic ⇒ RTL, English ⇒ LTR).
 *
 * On every launch, behind the still-visible splash: if the native `I18nManager`
 * flag already matches the locale's required direction (the common path), reveal
 * immediately — zero cost. If it doesn't — first launch after install, or any
 * future drift between locale and native direction, whatever the cause — flip the
 * native flag and `Updates.reloadAsync()` *while still behind the splash*.
 * `forceRTL` persists, so the reloaded instance matches and reveals correctly; it
 * fires at most once per install. The user sees a slightly longer launch, never
 * wrong-direction content.
 *
 * This is the ONLY place that calls `forceRTL`/`allowRTL` (see D-7). The future
 * in-app language switcher (M3) will reuse the same flip-and-reload behind a
 * branded "Switching language…" screen (Option A).
 */
export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Apply a persisted in-app language override (Settings → Language) BEFORE the
      // direction check, so `isRTL` below reflects the chosen language, not just the
      // device locale. Nothing has rendered yet (still behind the splash).
      const stored = await getStoredLocale();
      if (stored) applyLocaleOverride(stored);

      if (I18nManager.isRTL !== isRTL) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(isRTL);
        try {
          await Updates.reloadAsync();
          return; // reloading behind the splash — never reveal this (mismatched) instance
        } catch (e) {
          // reloadAsync can be unavailable in some dev/edge configs. Trapping the
          // user behind the splash forever is worse than revealing, and forceRTL
          // is already persisted so the next manual launch self-corrects. In a
          // production build with expo-updates this path is not expected.
          if (__DEV__) console.warn("[rtl-guard] reloadAsync failed; revealing anyway:", e);
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hand off from the native splash to our branded <LoadingScreen/> as soon as RN
  // mounts, so boot AND the language-switch reload show an animated branded loader
  // instead of a blank/white flash. Safe: the LoadingScreen is direction-agnostic
  // (centered logo), so it can show before the direction guard confirms/reloads;
  // only real CONTENT waits for `ready`, and that is always correct-direction.
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  // Dev-only build provenance — lets us confirm the running bundle matches a known
  // git HEAD during device QA. Injected via EXPO_PUBLIC_GIT_SHA at Metro start.
  // Never rendered in the UI / never shipped to production output.
  useEffect(() => {
    if (__DEV__) console.log("[boot] git HEAD:", process.env.EXPO_PUBLIC_GIT_SHA ?? "(unset)");
  }, []);

  // Branded animated loader until the direction is confirmed correct (reused by the
  // language-switch reload via LanguageChooser).
  if (!ready) return <LoadingScreen />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <BiometricLock>
        <TermsProvider>
          <PushManager />
          <Stack
          screenOptions={{
            // Seamless header: same token as the screen body so the bar blends into the
            // canvas — no navy-on-near-black seam (the branded auth routes go transparent below).
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.white,
            headerTitleStyle: { fontWeight: "800", fontSize: 20 },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="m0-check" options={{ title: "M0 connectivity" }} />
          <Stack.Screen name="ui-kit" options={{ title: "UI kit" }} />
          <Stack.Screen name="listings/[id]" options={{ title: "" }} />
          <Stack.Screen name="listings/[id]/edit" options={{ title: "" }} />
          <Stack.Screen name="users/[username]" options={{ title: "" }} />
          <Stack.Screen name="connections/[username]" options={{ title: "" }} />
          <Stack.Screen name="settings" options={{ title: "" }} />
          <Stack.Screen name="categories/index" options={{ title: "" }} />
          <Stack.Screen name="notifications" options={{ title: t("notifications.title") }} />
          <Stack.Screen name="saved" options={{ title: "" }} />
          <Stack.Screen name="blocked" options={{ title: "" }} />
          <Stack.Screen name="delete-account" options={{ title: "" }} />
          <Stack.Screen name="support" options={{ title: "" }} />
          <Stack.Screen name="terms" options={{ title: "" }} />
          <Stack.Screen name="privacy" options={{ title: "" }} />
          <Stack.Screen name="safety" options={{ title: "" }} />
          <Stack.Screen name="login" options={TRANSPARENT_HEADER} />
          <Stack.Screen name="register" options={TRANSPARENT_HEADER} />
          <Stack.Screen name="forgot-password" options={TRANSPARENT_HEADER} />
          <Stack.Screen name="reset-password" options={TRANSPARENT_HEADER} />
          <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={TRANSPARENT_HEADER} />
          <Stack.Screen name="profile/edit" options={{ title: "" }} />
          <Stack.Screen name="new-listing" options={{ title: "" }} />
          <Stack.Screen name="messages/[id]" options={{ title: "" }} />
        </Stack>
        </TermsProvider>
      </BiometricLock>
    </SafeAreaProvider>
  );
}
