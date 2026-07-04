import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { routing } from "@/i18n/routing";
import type { Locale } from "@swap/types";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getSiteUrl } from "@/lib/site-url";
import { altLinks, OG_DEFAULT } from "@/lib/seo";
import "../globals.css";

/** Arabic-first display + body face — also carries a clean Latin set. */
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

/** Latin / numerals — used as the primary face on the English locale. */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-latin",
  display: "swap",
});

const SITE_NAME = "JustSwap";
const SITE_URL = getSiteUrl();

export function generateMetadata({ params: { locale } }: { params: { locale: string } }): Metadata {
  const isAr = locale === "ar";
  const title = isAr ? "JustSwap - بدّل ما لديك بما تحتاجه" : "JustSwap - Exchange what you have for what you need";
  const description = isAr
    ? "JustSwap سوق المقايضة المجتمعي — بدّل ما لديك بما تحتاجه مع من حولك دون بيع أو شراء. تصفّح آلاف الإعلانات أو أضِف إعلانك."
    : "JustSwap is a community barter marketplace — the place to just swap what you have for what you need with people near you. No buying, no selling, just direct exchange.";

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s · ${SITE_NAME}` },
    description,
    applicationName: SITE_NAME,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "32x32" },
        // Theme-aware favicon: the brand mark uses a navy "S" on light tabs and a
        // white "S" on dark tabs, so the full "JS" stays legible either way.
        { url: "/brand/justswap-favicon.png", sizes: "32x32", type: "image/png", media: "(prefers-color-scheme: light)" },
        { url: "/brand/justswap-favicon-dark.png", sizes: "32x32", type: "image/png", media: "(prefers-color-scheme: dark)" },
        { url: "/brand/justswap-app-icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/brand/justswap-app-icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/brand/justswap-apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    alternates: altLinks(locale as Locale, ""),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: isAr ? "ar_AR" : "en_US",
      alternateLocale: isAr ? "en_US" : "ar_AR",
      url: `/${locale}`,
      title,
      description,
      images: [{ url: OG_DEFAULT, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_DEFAULT] },
    robots: { index: true, follow: true },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const dynamic = "force-dynamic";

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(locale as Locale)) notFound();

  setRequestLocale(locale);

  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={`${plexArabic.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className={locale === "ar" ? "font-sans" : "font-latin"}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
