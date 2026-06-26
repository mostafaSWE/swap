import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Verify-email / password-recovery / magic-link callback (locale-agnostic; excluded
// from the i18n middleware). Supabase's Send-Email hook points its links here with a
// token_hash + type; we exchange them for a session, then redirect to `next`.
type EmailOtpType = "signup" | "recovery" | "magiclink" | "email_change" | "invite" | "email";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const { searchParams } = url;
  // Behind a reverse proxy (Railway), url.origin is the container's INTERNAL bind
  // (e.g. http://localhost:3000), so redirects built from it send users to localhost.
  // Use the PUBLIC origin instead: the host the proxy forwards, then the configured
  // app URL, then (local dev) the request's own origin.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const origin =
    (forwardedHost ? `${forwardedProto}://${forwardedHost}` : "") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    url.origin;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Same-origin relative paths only — reject absolute ("http…") and
  // protocol-relative ("//host", "/\\host") targets to prevent open redirects.
  const rawNext = searchParams.get("next") ?? "/";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\") ? rawNext : "/";
  const locale = next.split("/").filter(Boolean)[0] === "en" ? "en" : "ar";

  if (tokenHash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }
  // Invalid or expired link → back to login with a flag the page can surface.
  return NextResponse.redirect(new URL(`/${locale}/login?error=link`, origin));
}
