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

// Logo embedded as base64 (self-contained — supabase deploy does NOT bundle
// loose binary assets, so a runtime Deno.readFile of the .jpg fails to boot).
const LOGO_BASE64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAgMDAwMDBAcFBAQEBAkGBwUHCgkLCwoJCgoMDREODAwQDAoKDhQPEBESExMTCw4UFhQSFhESExL/2wBDAQMDAwQEBAgFBQgSDAoMEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhL/wAARCABgAGADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD83KKKK9s4gqezsrjUbqO20+Ca6uJTiOGGMu7n0Cjk12Pwr+FOpfFHWTBZn7Lp1qQb2+dcrED0UD+Jz2H519ieB/h9oPw7sFtvC9kkUhULNeygNcTkd2fH1OBgDPSvNxuZU8P7q1l2/wAz4rifjbB5M/Ypc9X+VOyX+J9PTf03PlfQ/wBmfx3rUYkmsLXSkYZX+0LkRkj/AHV3MPxFdCv7I3ibaN+r6GH28gPIRn0zs6e9fVgBzk0uB+deNLOcS3pZfI/Ma/iZnc5XgoRXZRv+bZ8b6x+y/wCOtLj32trp+q88rY3gLY9cOFJ/CvM9Y0PUfD941rrljd2FyvWK4iMbEZxkZ6j3Ffonis7X/D+meKdPax8S2FtqNq3/ACznj3FfdW6qfcGtqOd1E/3kbryPTy3xTxcJpY2kpR7x0f3NtP8AD1Pzvq5p+k3mrfaTpttLcCzt3uLgxrkRRL9529AMj8xXuvxA/ZXvrfVLeX4dy/a9PvLgJLBdShXsQx++W/jjHqPmHHB616Nqvw80r4XfA/xXYaIguLifS3+3Xzrte6fgZ/2UGTtXt3ySTXpTzSjyx5Hdt/d6n3OJ47yz2dD6rLnnVkkls43aTcu1r6Lr001PjiiiivTPtwqzpmnz6vqVpY2K77m9nSCFc4y7sFUfmRVavS/2crCO++L+iGYrttfNnCsudzLG2B+ZB/Csq1T2dOU+yOLMsX9UwdXEWvyRcvuVz618DeDLPwB4YstE0pF22y5uJQOZ5j99z+PA9AAK3mIRSzlVVRlmY4CgdST6UAV4t+1T4qutE8FWOl6e7wjXLhluXU4LQxgEp64JYZ9QMV8XRpzxFZRb1Z/MOW4PEZ3mkaMpe/Ubbb+bb+6+nyJfGf7U3hzw7cSWvhu1m8RXERw0yyeTbE5wQHwWb6gYPY1wr/tf6ubgMnh3S1h7x+fISen8X59q+f6K+op5VhYqzjf1P3jB8A5Dh6fK6PO+8m239zSXySPq3wv+1noOpyrF4r0u70UscefA/wBpiUepGA/5A17RpurWWuWEV9ot5bX9nN/q57eQOrY6jI6Eeh5r8/vDXhy+8Wa1baVoyI91dNhfMkCIo6lmY8AAZJr7Z+Fnw3074a+Hv7P02dLy7uGEl9dCQETSAfwjPCjt37mvJzPCYegk4OzfQ/POO+HMlyuEZYZuNSX2N1bq9dV97vslu12fA+lcj8XQD8LPFeSB/wASuTGT7iux8iQ4IRyPUKa4n40wsfhR4oBU/LYE8j0Za8vD/wAaHqvzPgsk1zPDL+/D/wBKR8JUUUV92f1mFd78C9fj8OfFXw/c3Uhjt5rg20x9pVKDPtuZT+FcFRWdWCqQcH1ObG4WOKw1ShPaacX81Y/SBkKMytwQcGvPvjX8NG+JvhJbWwdItU0+Uz2TOQFkOMNGx7AjGD6gVn/Az4uW/wARdBh0/UpgviTToQtxG3BukUACZfU9NwHQ89DXpzGvi2quFrdpI/l6dPHZBmmvu1ab07Pz801+B+eWuaBqPhrUZLDX7K5sLuIndFPGVOMkZHqMg4I4Pas+v0U1DTbPWLU2+sWdpfwMMGK5hWVSPT5ga+W/2pfDekeHdb0BPDul2GlpPZyNMtpAIldg+ASB3xX0ODzRV5qm42Z+0cM8ewzfExwk6LjNpu6d1or+T/P1PD6khnltpBJbySROOjIxUj8RX2r/AMEuPhX4L+KXxD8b2/xP8M6X4ntNO0OKa1gv4hIsUhnClgD3xxmvuLxp/wAE9/gL40VifBI0GcoVSbRL+W22Z77MlCfqtelKqk7NH6Jy3R+LkPjDXrb/AI99b1eL/cvpF/kasT/EHxPdafcWN34g1m4s7tdk0E97JIjr6EMTX258dP8AglB4j8M2lxqnwJ1w+LrWFdx0bUUW3v8AAHPluP3cp9vkPsTXwZqOm3ej39xY6va3Fje2crRXFtcxNFJDIpwyurAFWBGCCMihRpy1SRzSwdBtScFf0RWooorU3CiiigCzp2o3WkX0N5pdxNa3du++KaFyrIfUEV9DeA/2sNkEVp8RLGSaRQq/2lYqoZu26SPgZ7kr+VeLWfww8Y6hpdvqdh4T8TXOnXS74LyHSZ3hlXOMq4XaRkEZB7Vjalouo6M4TV7C9sXPRbmBoj+TAVzYjC0a6tNHjZxkGAzWmoYune2z2a9H+m3kfcWkfGDwRrkKyWXifS495wI7qT7O+c4xtfBrwn9rDVbLVda8Ovpd7a3qJZyqzW8yyBT5nQ4NeDUVyYfK4UKqqRkz57JeBMJlOYLF0asnZNWduqtukvyPu7/gk14o0bw18R/Hh8SatpekrdaFAsDX95HbiRhcAkKXIyfpX6p2d1b6jbC4025tr23IyJraZZk/76UkV/N9XY/DT4w+NPg7rcWrfDTxJqugXcb7mFrORFNxjEkRykgx2ZSK7p0ru9z7xSsf0K18c/8ABQn9kCy+Mvgm+8e+BrCOHx74ctmnulgjw2tWiDLowH3pkUFlbqQCp7Eem/sa/tNx/tQ/Ck6zqNrb6d4m0S4Flrtrb8RNIV3JPECchHGflP3WVhkjBr3pGCsCQGA6qRkEeh9qw1iy9z+biivW/wBrP4e2vwr/AGkPiD4Z0tVSxsNZkktUVQojhmCzIgA6BVkCj2FeSV2J3VzIKKKKYH7sfsOXMq/slfDNVlkVRpDDAYgf66Sva5Yop8/aIYJs9fNhV8/mK8P/AGHP+TS/hp/2CW/9HSV7nXE9zU8M/aq+MHw8/Z3+HEviHxx4Y0PW9QvWa20XSDpUJa/uducM5QhI1HLMeccAFiBX4k+OfGN78QPF2q+ItYg061u9WuGme306zS1t4QeFSKJBhUUAADrxySck/wBCPi3wdoXj7w/daF440fTte0a9A8+xv4BLG5ByrYPRgQCGGCCODXxD8Vf+CSXhDX7uW8+EHizUPChkfd/Z2qwm/t0GMbUkBWQc85bf/hpTlGO5Mk2flfRX25P/AMEkvi6t2y22v/D+W2DYWZtSuEYr6lPIOD7Zr2r4Of8ABJbw/wCH9Tg1L41+KX8TJDtcaNpELWsDtzlZZmO9l6cIEPHXmtXUiieVlj/gkb8OtS0L4c+NfGWoxyQ2Piq9t7PTlcYEyWvmeZKvtvlKZ9UPpX3xVTSdIsfD+lWWl6DZWum6Zp0CW9nZ2kQiit4lGFRFHAUDtXK/Gf4t6R8C/hlrvjbxQ4Fto1uWt4MgNd3LcQwL6lnx9ACe1c8m5O5otD8c/wDgoHqcOq/th/EqW0dZI4r+C33KcjdFawxt/wCPKRXz1Wl4l8Q3vi3xHquua1IJdQ1m9mvbtwMBpZXLuQP95jWbXWlZWMmFFFFMD9gvhH+0R4W/Zr/YM+HPiTxrKZ7mfSpItI0iJwJ9SnE0nyr/AHUHBZ+gHqSBXz58Ev8Agq34k03xnqK/HTTYtY8M6xfNNBJpcSxT6IjcCONeksQwPlY7uWIY8LXwtrfizWPElrpVtruo3V7baHZiz02GV8pawBi2xF6AbmJPqTzWTWSpLqVzH9C/wx+Lvgz4z6ImrfC7xHpviG1ZQXS2lxPASM7ZYTh42weQwrr+lfzlaD4i1XwtqUeo+GNT1DSNQhz5d3YXT28qZ64dCCPzr6R8Ef8ABSf47+DIhFceJrPxLAihY017To7goB6Ou1z+LGodF9B8yP2kor8kx/wVs+MAhwdC+Hxl/v8A9l3GPy+0Vxnjb/gpd8dvGVsYLTxBpvhmJgQ/9haYkDOCOm997D6gg0vZSDmR+sHxk+PHgX4BaA+q/FLXrbSwVJtrBT5t5eNx8sUA+Y8kfMcKM5JAr8d/2uf2u/EP7Uvi6N545NH8HaPI39iaGsm4R54M8xHDzsO/RR8q9y3h+ua/qfifU5tS8S6jf6tqNyQZru+uXnmkIGBudySePU1QrSFNR1JcrhRRRWoj/9k=";

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
