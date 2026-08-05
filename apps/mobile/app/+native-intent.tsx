/**
 * Deep-link / App-Link path normalizer (expo-router).
 *
 * The public web uses a locale prefix (`/en/listings/:id`, `/ar/users/:name`) but
 * the app's routes do not (`/listings/[id]`, `/users/[username]`). When Android
 * App Links / iOS Universal Links open `https://justswap.me/{locale}/…`, strip the
 * leading locale segment so it resolves to the matching in-app route. Custom-scheme
 * links (`justswap://listings/123`) pass through unchanged.
 *
 * Security note: this only maps the PATH. Authorization is unchanged — e.g. a
 * `/messages/:id` deep link opens the chat screen, which reads messages through the
 * RLS-protected client, so a non-participant sees nothing (the DB, not this file,
 * is the gate).
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    // `path` may be a full URL (universal link) or a bare path (custom scheme).
    const url = new URL(path, "https://justswap.me");
    const stripped = url.pathname.replace(/^\/(ar|en)(?=\/|$)/, "");
    const normalized = stripped === "" ? "/" : stripped;
    return normalized + url.search;
  } catch {
    return path;
  }
}
