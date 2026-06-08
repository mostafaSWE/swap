/**
 * Design tokens — the single source of truth for Swap's visual language.
 * Consumed by the web app (mapped into Tailwind theme) and the mobile app
 * (mapped into React Native styles), so both platforms stay in sync.
 *
 * Palette derived from the product design reference: clean, modern,
 * trustworthy, mobile-first, Arabic-first.
 */

export const colors = {
  /** Brand navy — hero sections, brand surfaces, admin sidebar. */
  navy: "#0B1324",
  /** Brand green — primary buttons, verification badges, accents. */
  green: "#18B66A",
  greenDark: "#119455",
  greenLight: "#E7F8F0",

  white: "#FFFFFF",
  /** App canvas / light gray background. */
  background: "#F5F7F8",
  /** Card / surface background. */
  surface: "#FFFFFF",
  border: "#E5E7EB",

  text: "#111827",
  textMuted: "#6B7280",

  success: "#18B66A",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const shadows = {
  /** Soft card shadow matching the reference design. */
  card: "0 1px 3px rgba(16, 24, 39, 0.06), 0 1px 2px rgba(16, 24, 39, 0.04)",
  elevated: "0 8px 24px rgba(16, 24, 39, 0.10)",
} as const;

export const fontFamilies = {
  /** Arabic-friendly first, with Latin fallbacks. */
  sans: "'IBM Plex Sans Arabic', 'Cairo', 'Inter', system-ui, sans-serif",
} as const;

export const theme = {
  colors,
  radii,
  spacing,
  shadows,
  fontFamilies,
} as const;

export type Theme = typeof theme;
