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
const LOGO_CONTENT_TYPE = "image/jpeg";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

const LOGO_BASE64 = bytesToBase64(
  await Deno.readFile(new URL("./justswap-logo-email.jpg", import.meta.url)),
);

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
          filename: "justswap-logo.jpg",
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
