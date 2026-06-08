import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Cairo } from "next/font/google";
import { routing } from "@/i18n/routing";
import type { Locale } from "@swap/types";
import "../globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Swap — بدّل ما لديك بما تحتاجه",
  description: "Swap — a barter marketplace for the GCC. Exchange what you have for what you need.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// The app is database-first and auth-aware: pages read per-request data (DB +
// session cookies via RLS), so render them on demand rather than at build time.
export const dynamic = "force-dynamic";

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(locale as Locale)) notFound();

  // Enable static rendering for this locale.
  setRequestLocale(locale);

  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={cairo.variable}>
      <body className="font-sans">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
