import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// CSP is applied only for production builds: `next dev` needs 'unsafe-eval' and a
// websocket to localhost for React Fast Refresh, which a strict policy would break.
const isProd = process.env.NODE_ENV === "production";

// connect-src must allow Supabase REST + Realtime (wss) and the backend API.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const connectSrc = ["'self'"];
if (supabaseUrl) {
  connectSrc.push(supabaseUrl, supabaseUrl.replace(/^https/, "wss"));
}
if (apiUrl) {
  try {
    connectSrc.push(new URL(apiUrl).origin);
  } catch {
    // ignore an unparseable API URL — 'self' still covers same-origin calls
  }
}

// Pragmatic baseline CSP (no per-request nonce yet — tightening script-src with a
// nonce middleware is a documented future step). 'unsafe-inline' is required for
// Next's inline hydration bootstrap + Tailwind/inline styles.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'self'",
  "img-src 'self' data: blob: https:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src ${connectSrc.join(" ")}`,
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  ...(isProd ? [{ key: "Content-Security-Policy", value: csp }] : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile the shared workspace packages (they ship raw TS).
  transpilePackages: ["@swap/types", "@swap/config", "@swap/api", "@swap/ui"],
  images: {
    // Prefer AVIF (much cleaner on smooth gradients than WebP — avoids banding on
    // the hero backgrounds), falling back to WebP.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      // Supabase Storage public URLs (replace project ref or use a wildcard).
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
