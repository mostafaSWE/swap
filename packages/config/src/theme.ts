/**
 * Design tokens — the single source of truth for JustSwap's visual language.
 * Consumed by the web app (mapped into Tailwind theme) and the mobile app
 * (mapped into React Native styles), so both platforms stay in sync.
 *
 * Swap runs a single deep-navy dark theme: cool near-black navy surfaces, the
 * brand green accent (#18B66A), brand navy panels, cool off-white text.
 * Arabic-first, mobile-first. There is no light mode.
 */

export const colors = {
  /** Brand deep panel — hero visual, admin sidebar. */
  navy: "#0B1324",
  /** Brand green accent — primary buttons, links, trust accents. */
  green: "#18B66A",
  greenDark: "#16A863",
  /** Soft accent surface (green tint over dark). */
  greenLight: "#102A1E",

  white: "#FFFFFF",
  /** App canvas — cool near-black navy page base. */
  background: "#0A0E1A",
  /** Card / surface background. */
  surface: "#121829",
  /** Elevated surface (dropdowns, raised cards, inputs). */
  elevated: "#1B2438",
  border: "#232C42",
  borderStrong: "#313C58",

  text: "#E9EDF6",
  textMuted: "#97A1B7",
  textFaint: "#5C6781",

  success: "#22C55E",
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
