// Supabase "Send Email" Auth Hook → Resend.
//
// Supabase calls this function whenever it needs to send an auth email (confirm
// signup, password recovery, magic link, email change, …). We verify the hook
// signature, render a branded bilingual template (_templates.ts), and deliver it
// through the Resend API. Token generation stays with Supabase Auth; we only own
// the look + delivery.
//
// Deploy:   supabase functions deploy send-email --no-verify-jwt
// Secrets:  supabase secrets set RESEND_API_KEY=... SEND_EMAIL_HOOK_SECRET=... RESEND_FROM="JustSwap <noreply@yourdomain>" PUBLIC_APP_URL=https://yourapp
// Hook:     Dashboard → Authentication → Hooks → Send Email Hook → this function.
//
// `--no-verify-jwt` is required: the caller is Supabase Auth (no user JWT); the
// request is authenticated by the Standard Webhooks signature instead.

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { renderEmail } from "./_templates.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
// Supabase issues the secret as "v1,whsec_<base64>"; Standard Webhooks wants the base64.
const HOOK_SECRET = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "").replace("v1,whsec_", "");
const FROM = Deno.env.get("RESEND_FROM") ?? "JustSwap <onboarding@resend.dev>";
const APP_URL = (Deno.env.get("PUBLIC_APP_URL") ?? "").replace(/\/$/, "");
const LOGO_CONTENT_ID = "justswap-logo@justswap.email";
const LOGO_CONTENT_TYPE = "image/png";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Logo embedded as base64 (self-contained — supabase deploy does NOT bundle
// loose binary assets, so a runtime Deno.readFile of the logo file fails to boot).
const LOGO_BASE64 =
  "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";

interface HookPayload {
  user: { id: string; email: string; user_metadata?: Record<string, unknown> };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to?: string;
    email_action_type: string;
    site_url: string;
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Same-origin relative destination to land on after the token is verified. */
function resolveNext(redirectTo: string | undefined, locale: string, action: string): string {
  if (redirectTo) {
    try {
      // Accept either a full URL (take its path) or an already-relative path.
      const u = redirectTo.startsWith("http") ? new URL(redirectTo) : null;
      const path = u ? u.pathname + u.search : redirectTo;
      if (path.startsWith("/")) return path;
    } catch {
      /* fall through to the default below */
    }
  }
  return action === "recovery" ? `/${locale}/reset-password` : `/${locale}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!RESEND_API_KEY || !HOOK_SECRET) return json({ error: "function not configured" }, 500);

  const raw = await req.text();
  let payload: HookPayload;
  try {
    payload = new Webhook(HOOK_SECRET).verify(raw, Object.fromEntries(req.headers)) as HookPayload;
  } catch {
    return json({ error: "invalid signature" }, 401);
  }

  const { user, email_data } = payload;
  // No recipient (malformed payload) → no-op success so Supabase doesn't log a
  // misleading "email failed to send".
  if (!user?.email) return json({}, 200);
  const locale = user.user_metadata?.preferred_language === "en" ? "en" : "ar";
  const base = APP_URL || email_data.site_url.replace(/\/$/, "");
  const next = resolveNext(email_data.redirect_to, locale, email_data.email_action_type);
  const confirmUrl =
    `${base}/auth/confirm?token_hash=${encodeURIComponent(email_data.token_hash)}` +
    `&type=${encodeURIComponent(email_data.email_action_type)}&next=${encodeURIComponent(next)}`;

  // The confirm link and footer legal links hang off `base`.
  // If PUBLIC_APP_URL is unset we fall back to site_url, which on a misconfigured
  // project is localhost or *.supabase.co — log loudly so it's caught before users
  // get an unusable link. (We still send: a wrong-but-present link beats no email.)
  if (/localhost|127\.0\.0\.1|\.supabase\.co/.test(base)) {
    console.warn(`[send-email] link base looks non-production: "${base}". Set the PUBLIC_APP_URL secret to the production origin.`);
  }

  const { subject, html, text } = renderEmail({
    action: email_data.email_action_type,
    url: confirmUrl,
    token: email_data.token,
    locale,
    appUrl: base,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    // `text` ships a plain-text MIME part alongside the HTML (deliverability + a11y).
    body: JSON.stringify({
      from: FROM,
      to: [user.email],
      subject,
      html,
      text,
      attachments: [
        {
          filename: "justswap-logo.png",
          content: LOGO_BASE64,
          content_id: LOGO_CONTENT_ID,
          content_type: LOGO_CONTENT_TYPE,
        },
      ],
    }),
  });

  if (!res.ok) {
    // Returning the error lets Supabase surface "email failed to send" instead of silently 200-ing.
    const detail = await res.text().catch(() => "");
    return json({ error: { http_code: res.status, message: `resend: ${detail}` } }, 500);
  }
  return json({}, 200);
});
