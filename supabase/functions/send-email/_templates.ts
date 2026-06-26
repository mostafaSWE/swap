// Branded, bilingual (ar/en) email templates for the Supabase Send-Email Auth Hook.
// Rendered + sent via Resend from index.ts. Plain string templating (no deps) so
// it runs cleanly on Deno. Arabic is the product default (RTL).
//
// One shared base template — `layout()` — wraps EVERY email so they all look like
// they came from the same product: deep-navy background matching the app theme
// (packages/config/src/theme.ts), the JustSwap logo + wordmark, IBM Plex Sans
// Arabic (with a web-safe Arabic fallback), a single mobile-friendly column, and a
// footer with the brand, legal links + a transactional notice. Per-email copy lives
// in COPY; only the heading/body/cta/token differ between types.

type Action = "signup" | "recovery" | "magiclink" | "email_change" | "invite" | "reauthentication";
type Locale = "ar" | "en";

interface Copy {
  subject: string;
  heading: string;
  body: string;
  cta: string;
}

// ── Brand tokens (mirror packages/config/src/theme.ts — the deep-navy dark theme) ──
const BRAND = {
  canvas: "#0A0E1A", // page base (cool near-black navy)
  surface: "#121829", // card
  elevated: "#1B2438", // inset blocks (token, code)
  border: "#232C42",
  navy: "#0B1324", // brand panel (header band)
  green: "#18B66A", // primary accent
  greenDark: "#16A863",
  text: "#E9EDF6",
  textMuted: "#97A1B7",
  textFaint: "#5C6781",
} as const;

// 'IBM Plex Sans Arabic' only loads in clients that honor web fonts (Apple Mail /
// iOS). Everywhere else (Gmail, Outlook, Android) the first INSTALLED fallback
// renders: Segoe UI on Windows/Outlook, the system Arabic face on Android, then
// Tahoma/Arial — all web-safe with solid Arabic coverage. One stack for LTR + RTL.
const FONT_STACK = "'IBM Plex Sans Arabic', 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif";

const FALLBACK = {
  en: "If the button doesn't work, copy and paste this link into your browser:",
  ar: "إذا لم يعمل الزر، انسخ هذا الرابط والصقه في متصفحك:",
} as const;

// Footer: brand line + the legal links + a transactional notice. These are account /
// security emails, so no marketing unsubscribe is required — we say so explicitly.
const FOOTER = {
  en: {
    tagline: "JustSwap — exchange what you have for what you need.",
    notice:
      "You received this email because this action was requested for your account. If it wasn't you, you can safely ignore it — this is a one-off security message, not a subscription.",
    terms: "Terms",
    privacy: "Privacy",
    help: "Help",
    rights: "All rights reserved.",
  },
  ar: {
    tagline: "JustSwap — بادل ما لديك بما تحتاجه.",
    notice:
      "وصلتك هذه الرسالة لأن هذا الإجراء طُلب لحسابك. إن لم تكن أنت، يمكنك تجاهلها بأمان — هذه رسالة أمان لمرة واحدة وليست اشتراكاً بريدياً.",
    terms: "الشروط",
    privacy: "الخصوصية",
    help: "المساعدة",
    rights: "جميع الحقوق محفوظة.",
  },
} as const;

const COPY: Record<Locale, Record<Action, Copy>> = {
  en: {
    signup: {
      subject: "Confirm your email · JustSwap",
      heading: "Confirm your email",
      body: "Welcome to JustSwap! Confirm your email address to start listing items and swapping.",
      cta: "Confirm email",
    },
    recovery: {
      subject: "Reset your password · JustSwap",
      heading: "Reset your password",
      body: "We received a request to reset your JustSwap password. Choose a new one below. If you didn't request this, you can ignore this email.",
      cta: "Reset password",
    },
    magiclink: {
      subject: "Your sign-in link · JustSwap",
      heading: "Sign in to JustSwap",
      body: "Use the button below to sign in. This link expires shortly, so use it soon.",
      cta: "Sign in",
    },
    email_change: {
      subject: "Confirm your new email · JustSwap",
      heading: "Confirm your new email",
      body: "Confirm your new email address to keep using your JustSwap account.",
      cta: "Confirm email",
    },
    invite: {
      subject: "You're invited to JustSwap",
      heading: "You're invited to JustSwap",
      body: "You've been invited to JustSwap. Accept below to set up your account.",
      cta: "Accept invite",
    },
    reauthentication: {
      subject: "Your verification code · JustSwap",
      heading: "Verify it's you",
      body: "Enter this code to continue:",
      cta: "Verify",
    },
  },
  ar: {
    signup: {
      subject: "أكّد بريدك الإلكتروني · JustSwap",
      heading: "أكّد بريدك الإلكتروني",
      body: "أهلاً بك في JustSwap! أكّد بريدك الإلكتروني لتبدأ بعرض أغراضك والمقايضة.",
      cta: "تأكيد البريد",
    },
    recovery: {
      subject: "إعادة تعيين كلمة المرور · JustSwap",
      heading: "إعادة تعيين كلمة المرور",
      body: "وصلنا طلب لإعادة تعيين كلمة مرور حسابك في JustSwap. اختر كلمة مرور جديدة بالأسفل. إن لم تطلب ذلك، تجاهل هذه الرسالة.",
      cta: "إعادة التعيين",
    },
    magiclink: {
      subject: "رابط الدخول · JustSwap",
      heading: "تسجيل الدخول إلى JustSwap",
      body: "استخدم الزر بالأسفل لتسجيل الدخول. ينتهي هذا الرابط قريباً، فاستخدمه سريعاً.",
      cta: "تسجيل الدخول",
    },
    email_change: {
      subject: "أكّد بريدك الجديد · JustSwap",
      heading: "أكّد بريدك الجديد",
      body: "أكّد عنوان بريدك الإلكتروني الجديد لمتابعة استخدام حسابك في JustSwap.",
      cta: "تأكيد البريد",
    },
    invite: {
      subject: "دعوة للانضمام إلى JustSwap",
      heading: "أنت مدعوّ إلى JustSwap",
      body: "تمت دعوتك إلى JustSwap. اقبل الدعوة بالأسفل لإعداد حسابك.",
      cta: "قبول الدعوة",
    },
    reauthentication: {
      subject: "رمز التحقق · JustSwap",
      heading: "تأكيد هويتك",
      body: "أدخل هذا الرمز للمتابعة:",
      cta: "تحقق",
    },
  },
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]!),
  );
}

/** Localized year-free footer is fine; copyright line is brand + rights only. */
function footerLinks(appUrl: string, locale: Locale): string {
  const f = FOOTER[locale];
  const base = appUrl.replace(/\/$/, "");
  const link = (href: string, label: string) =>
    `<a href="${escapeHtml(`${base}/${locale}${href}`)}" style="color:${BRAND.textMuted};text-decoration:underline;">${escapeHtml(label)}</a>`;
  const sep = `<span style="color:${BRAND.textFaint};padding:0 8px;">·</span>`;
  return [link("/terms", f.terms), link("/privacy", f.privacy), link("/support", f.help)].join(sep);
}

/**
 * The single shared base template every email renders through. Inline styles only
 * (clients strip <style>/external CSS) except the <head> block, which adds the web
 * font + dark color-scheme hints + a couple of progressive-enhancement rules that
 * degrade gracefully where unsupported.
 */
function layout(opts: {
  locale: Locale;
  heading: string;
  body: string;
  cta: string;
  url: string;
  appUrl: string;
  token?: string;
}): string {
  const { locale, heading, body, cta, url, appUrl, token } = opts;
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = locale === "ar" ? "right" : "left";
  const safeUrl = escapeHtml(url);
  // Use the 32px mark (not the 1024px source): some mobile email clients ignore an
  // <img>'s width/height and render at intrinsic size — a small source can't blow up
  // the header. The dark-mode favicon is the same green mark, transparent (RGBA).
  const logoUrl = escapeHtml(`${appUrl.replace(/\/$/, "")}/brand/justswap-favicon-dark-32.png`);
  const f = FOOTER[locale];
  // Hidden inbox-preview text (improves the list preview without showing in body).
  const preheader = body.slice(0, 110);

  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>${escapeHtml(heading)}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap');
      :root { color-scheme: dark; supported-color-schemes: dark; }
      body { margin: 0; padding: 0; width: 100% !important; }
      a { text-decoration: none; }
      .btn:hover { background: ${BRAND.greenDark} !important; }
      @media only screen and (max-width: 600px) {
        .card { width: 100% !important; border-radius: 0 !important; }
        .pad { padding-left: 22px !important; padding-right: 22px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.canvas};">
    <!-- Hidden inbox-preview text, padded so the real body doesn't leak into the snippet. -->
    <div style="display:none;mso-hide:all;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${BRAND.canvas};">${escapeHtml(preheader)}${"&#8203;&nbsp;".repeat(40)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BRAND.canvas}" style="background:${BRAND.canvas};padding:32px 12px;font-family:${FONT_STACK};">
      <tr><td align="center" bgcolor="${BRAND.canvas}">
        <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:20px;overflow:hidden;">

          <!-- Brand header -->
          <tr><td style="background:${BRAND.navy};padding:24px 32px;" class="pad" dir="${dir}" align="${align}">
            <table role="presentation" dir="${dir}" align="${align}" cellpadding="0" cellspacing="0"><tr>
              <td style="vertical-align:middle;padding-${align === "right" ? "left" : "right"}:10px;">
                <img src="${logoUrl}" width="36" height="36" alt="JustSwap" style="display:block;width:36px;height:36px;max-width:36px;border:0;outline:none;" />
              </td>
              <td style="vertical-align:middle;font-size:22px;font-weight:700;letter-spacing:-0.2px;font-family:${FONT_STACK};">
                <span style="color:${BRAND.green};">Just</span><span style="color:${BRAND.text};">Swap</span>
              </td>
            </tr></table>
          </td></tr>
          <tr><td style="height:3px;line-height:3px;font-size:0;background:${BRAND.green};">&nbsp;</td></tr>

          <!-- Body -->
          <tr><td style="padding:32px 32px 8px;" class="pad" dir="${dir}" align="${align}">
            <h1 style="margin:0 0 10px;font-size:22px;line-height:1.35;color:${BRAND.text};font-family:${FONT_STACK};">${escapeHtml(heading)}</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:${BRAND.textMuted};font-family:${FONT_STACK};">${escapeHtml(body)}</p>
            ${
              token
                ? `<div style="margin:0 0 24px;font-size:30px;letter-spacing:8px;font-weight:700;color:${BRAND.text};background:${BRAND.elevated};border:1px solid ${BRAND.border};border-radius:12px;padding:16px;text-align:center;font-family:${FONT_STACK};">${escapeHtml(token)}</div>`
                : `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:9999px;background:${BRAND.green};">
                    <a class="btn" href="${safeUrl}" style="display:inline-block;background:${BRAND.green};color:#06210F;text-decoration:none;font-size:15px;font-weight:700;padding:14px 30px;border-radius:9999px;font-family:${FONT_STACK};">${escapeHtml(cta)}</a>
                   </td></tr></table>
                   <p style="margin:24px 0 6px;font-size:12px;color:${BRAND.textMuted};font-family:${FONT_STACK};">${escapeHtml(FALLBACK[locale])}</p>
                   <p dir="ltr" style="margin:0;font-size:12px;word-break:break-all;text-align:${align};font-family:${FONT_STACK};"><a href="${safeUrl}" style="color:${BRAND.green};text-decoration:underline;">${safeUrl}</a></p>`
            }
          </td></tr>

          <!-- Footer -->
          <tr><td style="padding:28px 32px 30px;" class="pad" dir="${dir}" align="${align}">
            <hr style="border:none;border-top:1px solid ${BRAND.border};margin:0 0 18px;" />
            <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:${BRAND.text};font-family:${FONT_STACK};">${escapeHtml(f.tagline)}</p>
            <p style="margin:0 0 14px;font-size:13px;font-family:${FONT_STACK};">${footerLinks(appUrl, locale)}</p>
            <p style="margin:0 0 8px;font-size:11px;line-height:1.7;color:${BRAND.textMuted};font-family:${FONT_STACK};">${escapeHtml(f.notice)}</p>
            <p style="margin:0;font-size:11px;color:${BRAND.textMuted};font-family:${FONT_STACK};">© JustSwap. ${escapeHtml(f.rights)}</p>
          </td></tr>

        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/**
 * Plain-text alternative for the multipart email. Sending a text/plain part
 * alongside the HTML improves deliverability (HTML-only mail is penalised by spam
 * filters) and serves text-preferring / accessibility clients. Mirrors the same copy.
 */
function plainText(opts: {
  locale: Locale;
  heading: string;
  body: string;
  cta: string;
  url: string;
  appUrl: string;
  token?: string;
}): string {
  const { locale, heading, body, cta, url, appUrl, token } = opts;
  const base = appUrl.replace(/\/$/, "");
  const f = FOOTER[locale];
  const lines = [heading, "", body, ""];
  if (token) {
    lines.push(`${cta}: ${token}`, "");
  } else {
    lines.push(`${cta}: ${url}`, "", FALLBACK[locale], url, "");
  }
  lines.push(
    "—",
    f.tagline,
    `${f.terms}: ${base}/${locale}/terms`,
    `${f.privacy}: ${base}/${locale}/privacy`,
    `${f.help}: ${base}/${locale}/support`,
    "",
    f.notice,
    `© JustSwap. ${f.rights}`,
  );
  return lines.join("\n");
}

/** Build the subject + HTML + plain-text body for a given auth-email action + locale. */
export function renderEmail(opts: {
  action: string;
  url: string;
  token?: string;
  locale: Locale;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const action = COPY[opts.locale][opts.action as Action] ? (opts.action as Action) : "signup";
  const copy = COPY[opts.locale][action];
  // A code-only action (reauthentication) has no link; show the token prominently.
  const showToken = action === "reauthentication";
  const parts = {
    locale: opts.locale,
    heading: copy.heading,
    body: copy.body,
    cta: copy.cta,
    url: opts.url,
    appUrl: opts.appUrl,
    token: showToken ? opts.token : undefined,
  };
  return {
    subject: copy.subject,
    html: layout(parts),
    text: plainText(parts),
  };
}
