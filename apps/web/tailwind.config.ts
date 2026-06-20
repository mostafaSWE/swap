import type { Config } from "tailwindcss";

/**
 * Tailwind theme mirrors packages/config/src/theme.ts (the cross-platform token
 * source of truth). Keep the two in sync when you change the palette.
 */
const config: Config = {
  content: [
    "./src/**/*.{ts,tsx,mdx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0B1324", 900: "#0B1324" },
        green: {
          DEFAULT: "#18B66A",
          dark: "#119455",
          light: "#E7F8F0",
        },
        swap: {
          DEFAULT: "#18B66A",
          tint: "#E7F8F0",
          dark: "#119455",
        },
        canvas: "#F5F7F8",
        ink: "#111827",
        muted: "#6B7280",
        line: "#E5E7EB",
        success: "#18B66A",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      borderRadius: {
        card: "16px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(16,24,39,0.06), 0 1px 2px rgba(16,24,39,0.04)",
        elevated: "0 8px 24px rgba(16,24,39,0.10)",
      },
      fontFamily: {
        sans: [
          "var(--font-arabic)",
          "IBM Plex Sans Arabic",
          "Cairo",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
      maxWidth: {
        app: "480px", // mobile-first app container
      },
    },
  },
  plugins: [],
};

export default config;
