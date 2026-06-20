import type { Locale } from "@swap/types";

/**
 * Canonical platform-responsibility disclaimer. Centralized here so the web app,
 * mobile app, and the backend `/api/v1/safety` endpoint all show identical text.
 */
export const SAFETY_DISCLAIMER: Record<Locale, { title: string; points: string[] }> = {
  ar: {
    title: "تنويه مهم",
    points: [
      "JustSwap لا تملك الأغراض المعروضة.",
      "JustSwap لا تشتري المنتجات.",
      "JustSwap لا تبيع المنتجات.",
      "JustSwap لا تضمن إتمام عمليات التبادل.",
      "JustSwap لا تكمل أو تدير أو تضمن معاملات المبادلة مباشرة.",
      "JustSwap لا تضمن حالة أي غرض معروض.",
      "الاتفاق النهائي وتسليم الغرض مسؤولية المستخدمين.",
    ],
  },
  en: {
    title: "Important notice",
    points: [
      "JustSwap does not own the listed items.",
      "JustSwap does not buy products.",
      "JustSwap does not sell products.",
      "JustSwap does not guarantee that exchanges are completed.",
      "JustSwap does not directly complete, manage, escrow, or mediate swap transactions.",
      "JustSwap does not guarantee the condition of any listed item.",
      "The final agreement and item handover are the responsibility of the users.",
    ],
  },
};
