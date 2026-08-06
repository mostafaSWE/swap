import { Redirect } from "expo-router";

/**
 * The center **Add** tab is an action, not a destination: its tab press is
 * intercepted in the tab layout (`listeners.tabPress`) to route to the
 * new-listing flow (or login). This component only renders if something
 * navigates to `/add` directly (e.g. a deep link) — fall back to the new
 * listing screen, which itself gates on auth.
 */
export default function AddTab() {
  return <Redirect href="/new-listing" />;
}
