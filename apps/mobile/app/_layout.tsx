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
import { isRTL } from "../src/i18n";

// Keep the native splash up until the boot direction guard has confirmed the
// native layout direction matches the locale — nothing renders before then.
void SplashScreen.preventAutoHideAsync();

// The app entry is the tab group (there is no root app/index.tsx), so tell
// expo-router the root anchor is "(tabs)".
export const unstable_settings = { initialRouteName: "(tabs)" };

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
      if (!cancelled) {
        setReady(true);
        await SplashScreen.hideAsync();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Stay behind the native splash until the direction is confirmed correct.
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.navy },
          headerTintColor: colors.white,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="m0-check" options={{ title: "M0 connectivity" }} />
        <Stack.Screen name="ui-kit" options={{ title: "UI kit" }} />
        <Stack.Screen name="listings/[id]" options={{ title: "" }} />
        <Stack.Screen name="users/[username]" options={{ title: "" }} />
        <Stack.Screen name="saved" options={{ title: "" }} />
        <Stack.Screen name="login" options={{ title: "" }} />
        <Stack.Screen name="register" options={{ title: "" }} />
        <Stack.Screen name="forgot-password" options={{ title: "" }} />
        <Stack.Screen name="messages/[id]" options={{ title: "" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
