// Polyfills MUST load before anything that touches URL / crypto (i.e. supabase-js).
// Order matters: get-random-values first, then the WHATWG URL polyfill (RN's
// built-in URL has a no-op searchParams, which would drop REST query strings).
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../src/theme";

// The app entry is the tab group (there is no root app/index.tsx), so tell
// expo-router the root anchor is "(tabs)".
export const unstable_settings = { initialRouteName: "(tabs)" };

export default function RootLayout() {
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
      </Stack>
    </SafeAreaProvider>
  );
}
