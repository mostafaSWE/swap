/**
 * Normalize a user-entered phone into a canonical `+<dialCode><national>` form.
 *
 * Accepts whatever the user types — a bare local number ("0512…", "512…"), a number
 * that already includes the country code ("+9665…", "009665…", "9665…") — and always
 * produces a single, consistently-prefixed value. This is what prevents the
 * double-dial-code bug (e.g. "+966" + "+966512…" = "+966+966512…").
 *
 * Returns null when there's no plausible national number (so callers can reject it).
 */
export function buildPhone(raw: string, dialCode: string): string | null {
  const code = dialCode.replace(/\D/g, ""); // e.g. "966"
  if (!code) return null;
  let n = raw.replace(/\D/g, ""); // digits only — drops +, spaces, dashes, parens
  if (n.startsWith("00")) n = n.slice(2); // international 00 prefix
  if (n.startsWith(code)) n = n.slice(code.length); // country code typed by the user
  n = n.replace(/^0+/, ""); // local trunk zero(s)
  if (n.length < 6 || n.length > 12) return null; // implausible length → invalid
  return `+${code}${n}`;
}
