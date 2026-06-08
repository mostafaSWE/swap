import type { Locale } from "@swap/types";

/**
 * Canonical platform-responsibility disclaimer. Centralized here so the web app,
 * mobile app, and the backend `/api/v1/safety` endpoint all show identical text.
 */
export const SAFETY_DISCLAIMER: Record<Locale, { title: string; points: string[] }> = {
  ar: {
    title: "تنويه مهم",
    points: [
      "Swap لا تملك المنتجات المعروضة.",
      "Swap لا تشتري المنتجات.",
      "Swap لا تبيع المنتجات.",
      "Swap لا تضمن إتمام عمليات التبادل.",
      "Swap لا تقدّم خدمة وساطة مالية أو ضمان.",
      "Swap لا تضمن حالة المنتج إلا إذا تم توثيقه عبر خدمة توثيق المنتجات الرسمية.",
      "الاتفاق النهائي وتسليم المنتج مسؤولية المستخدمين.",
    ],
  },
  en: {
    title: "Important notice",
    points: [
      "Swap does not own the listed products.",
      "Swap does not buy products.",
      "Swap does not sell products.",
      "Swap does not guarantee that exchanges are completed.",
      "Swap does not provide escrow or financial mediation.",
      "Swap does not guarantee product condition unless verified through the official verified-item service.",
      "The final agreement and item handover are the responsibility of the users.",
    ],
  },
};
