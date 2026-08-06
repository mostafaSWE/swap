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
const APP_SCHEME = "justswap://";

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    let pathname: string;
    let search: string;
    if (path.startsWith(APP_SCHEME)) {
      // Custom scheme: the WHOLE remainder is the intended route, not a host.
      // `new URL("justswap://listings/123")` would treat "listings" as the host
      // and drop it, so parse it by hand: justswap://listings/123 -> /listings/123
      // (query preserved, e.g. justswap://auth/confirm?token_hash=… for email links).
      const rest = path.slice(APP_SCHEME.length);
      const q = rest.indexOf("?");
      pathname = "/" + (q === -1 ? rest : rest.slice(0, q)).replace(/^\/+/, "");
      search = q === -1 ? "" : rest.slice(q);
    } else {
      // Full https universal link OR a bare path — URL handles both.
      const url = new URL(path, "https://justswap.me");
      pathname = url.pathname;
      search = url.search;
    }
    const stripped = pathname.replace(/^\/(ar|en)(?=\/|$)/, "");
    const normalized = stripped === "" ? "/" : stripped;
    return normalized + search;
  } catch {
    return path;
  }
}
