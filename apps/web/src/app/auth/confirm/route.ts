import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Verify-email / password-recovery / magic-link callback (locale-agnostic; excluded
// from the i18n middleware). Supabase's Send-Email hook points its links here with a
// token_hash + type; we exchange them for a session, then redirect to `next`.
type EmailOtpType = "signup" | "recovery" | "magiclink" | "email_change" | "invite" | "email";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
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
