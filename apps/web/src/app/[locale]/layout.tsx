import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { routing } from "@/i18n/routing";
import type { Locale } from "@swap/types";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getSiteUrl } from "@/lib/site-url";
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
    ? "JustSwap سوق مقايضة في الخليج. بدّل ما لديك بما تحتاجه دون بيع أو شراء."
    : "JustSwap is a barter marketplace for the GCC. Exchange what you have for what you need without buying or selling.";

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s · ${SITE_NAME}` },
    description,
    applicationName: SITE_NAME,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "32x32" },
        { url: "/brand/justswap-favicon-32.png", sizes: "32x32", type: "image/png" },
        {
          url: "/brand/justswap-favicon-dark-32.png",
          sizes: "32x32",
          type: "image/png",
          media: "(prefers-color-scheme: dark)",
        },
        { url: "/brand/justswap-app-icon.png", type: "image/png" },
        { url: "/brand/justswap-mark.png", type: "image/png" },
      ],
      apple: [{ url: "/brand/justswap-app-icon.png", type: "image/png" }],
    },
    alternates: { languages: { ar: "/ar", en: "/en" } },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: isAr ? "ar_AR" : "en_US",
      url: `/${locale}`,
      title,
      description,
      images: [{ url: "/brand/justswap-app-icon.png", width: 1024, height: 1024, alt: SITE_NAME }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/brand/justswap-app-icon.png"] },
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
