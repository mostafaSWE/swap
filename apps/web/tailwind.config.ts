import type { Config } from "tailwindcss";

/**
 * Tailwind theme mirrors packages/config/src/theme.ts (the cross-platform token
 * source of truth). Keep the two in sync when you change the palette.
 *
 * Swap ships BOTH a light and a deep-navy dark theme, switchable by the user
 * (next-themes, `class` strategy → `.dark` on <html>). The colour tokens resolve
 * to CSS variables (space-separated RGB channels) defined in globals.css, so a
 * single set of semantic class names (bg-surface, text-ink, border-line,
 * bg-accent, …) flips between themes with no per-file `dark:` variants. The
 * channel form `rgb(var(--x) / <alpha-value>)` keeps every opacity modifier
 * (bg-accent/15, text-ink/70, …) working in both themes.
 *
 * Brand: green accent (#18B66A) + navy panels (#0B1324), in both themes.
 */
const withAlpha = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx,mdx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Surface layers (page → card → raised) ── */
        canvas: withAlpha("--canvas"),
        night: withAlpha("--canvas"), // alias of canvas (kept for existing classes)
        surface: withAlpha("--surface"),
        elevated: withAlpha("--elevated"),
        field: withAlpha("--field"),

        /* ── Brand green accent ── */
        accent: {
          DEFAULT: withAlpha("--accent"),
          hover: withAlpha("--accent-hover"),
          soft: "rgb(var(--accent) / 0.12)",
          glow: "rgb(var(--accent) / 0.3)",
        },

        /* ── Brand navy panel (dark in BOTH themes) + the light text used on it ── */
        navy: { DEFAULT: withAlpha("--navy"), 900: withAlpha("--navy") },
        onnavy: withAlpha("--onnavy"),

        /* ── Legacy semantic aliases (remapped onto the new tokens) ── */
        green: { DEFAULT: withAlpha("--accent"), dark: withAlpha("--green-dark"), light: withAlpha("--green-light") },
        swap: { DEFAULT: withAlpha("--accent"), tint: withAlpha("--green-light"), dark: withAlpha("--green-dark") },
        ink: withAlpha("--ink"),
        muted: withAlpha("--muted"),
        faint: withAlpha("--faint"),
        line: withAlpha("--line"),
        linestrong: withAlpha("--linestrong"),

        success: withAlpha("--success"),
        warning: withAlpha("--warning"),
        danger: withAlpha("--danger"),
        info: withAlpha("--info"),
      },
      borderRadius: {
        card: "16px",
        pill: "999px",
      },
      boxShadow: {
        /* Theme-aware shadows (subtle in light, deep in dark) via CSS vars. */
        card: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
        glow: "0 10px 36px rgb(var(--accent) / 0.3)",
      },
      fontFamily: {
        sans: [
          "var(--font-arabic)",
          "var(--font-latin)",
          "IBM Plex Sans Arabic",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        latin: [
          "var(--font-latin)",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
      keyframes: {
        "swap-spin": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "swap-spin": "swap-spin 9s linear infinite",
      },
      maxWidth: {
        app: "480px", // mobile-first app container
      },
    },
  },
  plugins: [],
};

export default config;
