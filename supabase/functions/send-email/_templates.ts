// Branded, bilingual (ar/en) email templates for the Supabase Send-Email Auth Hook.
// Rendered + sent via Resend from index.ts. Plain string templating (no deps) so
// it runs cleanly on Deno. Arabic is the product default (RTL).

type Action = "signup" | "recovery" | "magiclink" | "email_change" | "invite" | "reauthentication";
type Locale = "ar" | "en";

interface Copy {
  subject: string;
  heading: string;
  body: string;
  cta: string;
}

const FALLBACK_EN = "If the button doesn't work, copy and paste this link into your browser:";
const FALLBACK_AR = "إذا لم يعمل الزر، انسخ هذا الرابط والصقه في متصفحك:";
const FOOTER_EN = "JustSwap - direct exchange, simply. You received this email because this action was requested for your account. If it wasn't you, you can safely ignore it.";
const FOOTER_AR = "JustSwap - مبادلة مباشرة ببساطة. وصلتك هذه الرسالة لأن هذا الإجراء طُلب لحسابك. إن لم تكن أنت، يمكنك تجاهلها بأمان.";

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

function layout(opts: { locale: Locale; heading: string; body: string; cta: string; url: string; token?: string }): string {
  const { locale, heading, body, cta, url, token } = opts;
  const dir = locale === "ar" ? "rtl" : "ltr";
  const fallback = locale === "ar" ? FALLBACK_AR : FALLBACK_EN;
  const footer = locale === "ar" ? FOOTER_AR : FOOTER_EN;
  const safeUrl = escapeHtml(url);
  // Inline styles only — email clients strip <style>/external CSS. Brand: terracotta on warm sand.
  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
  <body style="margin:0;padding:0;background:#F7F4EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Tahoma,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EE;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 16px rgba(26,23,19,0.06);">
          <tr><td style="background:#E8572A;height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
          <tr><td style="padding:32px 32px 8px;" dir="${dir}">
            <div style="display:inline-block;width:44px;height:44px;border-radius:9999px;background:#FDF1EC;color:#E8572A;text-align:center;line-height:44px;font-size:22px;font-weight:700;">⇄</div>
            <h1 style="margin:20px 0 8px;font-size:22px;line-height:1.3;color:#1A1713;">${escapeHtml(heading)}</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#5C564E;">${escapeHtml(body)}</p>
            ${
              token
                ? `<div style="margin:0 0 24px;font-size:30px;letter-spacing:6px;font-weight:700;color:#1A1713;background:#FDF1EC;border-radius:12px;padding:14px;text-align:center;">${escapeHtml(token)}</div>`
                : ""
            }
            <a href="${safeUrl}" style="display:inline-block;background:#E8572A;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;padding:13px 28px;border-radius:9999px;">${escapeHtml(cta)}</a>
            <p style="margin:24px 0 6px;font-size:12px;color:#5C564E;">${escapeHtml(fallback)}</p>
            <p style="margin:0 0 8px;font-size:12px;word-break:break-all;"><a href="${safeUrl}" style="color:#E8572A;">${safeUrl}</a></p>
          </td></tr>
          <tr><td style="padding:16px 32px 28px;" dir="${dir}">
            <hr style="border:none;border-top:1px solid #E4DDD3;margin:0 0 16px;" />
            <p style="margin:0;font-size:11px;line-height:1.6;color:#9b948a;">${escapeHtml(footer)}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/** Build the subject + HTML for a given auth-email action + locale. */
export function renderEmail(opts: { action: string; url: string; token?: string; locale: Locale }): { subject: string; html: string } {
  const action = (COPY[opts.locale][opts.action as Action] ? (opts.action as Action) : "signup");
  const copy = COPY[opts.locale][action];
  // A code-only action (reauthentication) has no link; show the token prominently.
  const showToken = action === "reauthentication";
  return {
    subject: copy.subject,
    html: layout({
      locale: opts.locale,
      heading: copy.heading,
      body: copy.body,
      cta: copy.cta,
      url: opts.url,
      token: showToken ? opts.token : undefined,
    }),
  };
}
