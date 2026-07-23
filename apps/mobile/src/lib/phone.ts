/**
 * Normalize a user-entered phone into canonical `+<dialCode><national>` form
 * (port of web `lib/phone.ts`). Accepts a bare local number, a 00-prefixed
 * international number, or one that already includes the country code, and always
 * produces a single consistently-prefixed value (prevents the double-dial-code
 * bug). Returns null when there is no plausible national number.
 */
export function buildPhone(raw: string, dialCode: string): string | null {
  const code = dialCode.replace(/\D/g, "");
  if (!code) return null;
  let n = raw.replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith(code)) n = n.slice(code.length);
  n = n.replace(/^0+/, "");
  if (n.length < 6 || n.length > 12) return null;
  return `+${code}${n}`;
}
