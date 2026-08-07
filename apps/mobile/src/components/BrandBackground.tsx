import type { ReactNode } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Repeat2 } from "lucide-react-native";
import { colors } from "../theme";
import { isRTL } from "../i18n";
import { Icon } from "./ui/Icon";

/**
 * Full-bleed branded background for the auth / marketing surfaces — the native
 * counterpart of the web `AuthShell` form panel (apps/web AuthShell.tsx): a deep
 * near-black navy base, a faint ink grid, soft emerald glows, and a large faint
 * swap-arrow motif.
 *
 * Everything is composed from plain Views (layered translucent discs for the
 * glows, hairline Views for the grid, a stroke lucide glyph for the motif) so it
 * is light and reliable on the New Architecture (Fabric) — no `react-native-svg`
 * fill, no `expo-linear-gradient` (which would need an EAS rebuild), no blur.
 * RTL-aware: the motif + bottom glow flip to the leading side under Arabic.
 */
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const GRID = 44;
const GRID_LINE = "rgba(233,237,246,0.05)"; // ink (#E9EDF6) at ~5%, matching the web grid
const H_LINES = Array.from({ length: Math.ceil(SCREEN_H / GRID) + 2 }, (_, i) => i * GRID);
const V_LINES = Array.from({ length: Math.ceil(SCREEN_W / GRID) + 2 }, (_, i) => i * GRID);
const TOP_GLOW_LEFT = SCREEN_W / 2 - 210;

export function BrandBackground({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      {/* faint ink grid */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {H_LINES.map((y) => (
          <View key={`h${y}`} style={[styles.hLine, { top: y }]} />
        ))}
        {V_LINES.map((x) => (
          <View key={`v${x}`} style={[styles.vLine, { left: x }]} />
        ))}
      </View>

      {/* emerald glows — layered translucent discs (top-center + bottom-leading) */}
      <View style={[styles.glowOuter, styles.glowTop]} pointerEvents="none" />
      <View style={[styles.glowInner, styles.glowTop]} pointerEvents="none" />
      <View style={[styles.glowOuter, isRTL ? styles.glowBottomEnd : styles.glowBottomStart]} pointerEvents="none" />

      {/* faint swap-arrow motif, bottom trailing edge */}
      <View style={[styles.motif, isRTL ? styles.motifStart : styles.motifEnd]} pointerEvents="none">
        <Icon icon={Repeat2} size={260} color={colors.green} />
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, overflow: "hidden" },
  hLine: { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: GRID_LINE },
  vLine: { position: "absolute", top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: GRID_LINE },
  glowOuter: { position: "absolute", width: 420, height: 420, borderRadius: 210, backgroundColor: "rgba(24,182,106,0.07)" },
  glowInner: { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(24,182,106,0.10)" },
  glowTop: { top: -190, left: TOP_GLOW_LEFT },
  glowBottomStart: { bottom: -150, left: -140 },
  glowBottomEnd: { bottom: -150, right: -140 },
  motif: { position: "absolute", bottom: -40, opacity: 0.06 },
  motifEnd: { right: -34 },
  motifStart: { left: -34 },
});
