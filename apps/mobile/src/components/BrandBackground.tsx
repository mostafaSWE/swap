import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";
import { Repeat2 } from "lucide-react-native";
import { colors } from "../theme";
import { isRTL } from "../i18n";
import { RotatingSwap, useReduceMotion } from "./motion";

/**
 * Full-bleed branded background for the auth / marketing surfaces — the native
 * counterpart of the web `AuthShell` form panel: a deep near-black navy base, a
 * faint ink grid, a soft emerald glow, and a large slowly-rotating swap motif.
 *
 * The glow is a pre-rendered soft radial-gradient PNG (assets/brand-glow.png)
 * placed off-screen so only its soft falloff bleeds in — no hard-edged circles,
 * no `expo-linear-gradient`/blur (which would need an EAS rebuild or crash Fabric).
 * A gentle breathing (opacity + scale) and the rotating motif make it feel alive
 * like the website; both are disabled under Reduce Motion. RTL-aware.
 */
const GLOW = require("../../assets/brand-glow.png");
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const GRID = 44;
const GRID_LINE = "rgba(233,237,246,0.045)";
const V_LINES = Array.from({ length: Math.ceil(SCREEN_W / GRID) + 2 }, (_, i) => i * GRID);
const TOP_GLOW = 520;

/**
 * BrandBackdrop — the branded visual LAYER only (faint ink grid + breathing emerald
 * glow + slowly-rotating swap motif), absolutely filling its parent. Reusable behind
 * ANY surface: the full-screen auth shell (via `BrandBackground`) or a single
 * section like the home hero (`<BrandBackdrop height={heroH} .../>`). The parent MUST
 * set `overflow:"hidden"` and paint its own base background. Reduce-Motion gated, RTL-aware.
 */
export function BrandBackdrop({
  height = SCREEN_H,
  motifSize = 280,
  glowSize = TOP_GLOW,
  motifBottom = -36,
}: {
  height?: number;
  motifSize?: number;
  glowSize?: number;
  motifBottom?: number;
}) {
  const reduce = useReduceMotion();
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce) {
      breathe.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, reduce]);

  // Subtle: peak effective alpha ~0.17 (asset A0 0.78 × ~0.22) — matches the web's
  // bg-accent/18 glow. A gentle breathing pulse, not a wash.
  const glowOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.22] });
  const glowScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  // Horizontal grid lines cover the parent's height (varies for a section like the hero).
  const hLines = useMemo(() => Array.from({ length: Math.ceil(height / GRID) + 2 }, (_, i) => i * GRID), [height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* faint ink grid */}
      {hLines.map((y) => (
        <View key={`h${y}`} style={[styles.hLine, { top: y }]} />
      ))}
      {V_LINES.map((x) => (
        <View key={`v${x}`} style={[styles.vLine, { left: x }]} />
      ))}

      {/* one soft emerald glow — a radial-gradient PNG bleeding off the top edge */}
      <Animated.Image
        source={GLOW}
        resizeMode="contain"
        style={[
          styles.glowTop,
          { width: glowSize, height: glowSize, top: -glowSize * 0.55, left: SCREEN_W / 2 - glowSize / 2, opacity: glowOpacity, transform: [{ scale: glowScale }] },
        ]}
      />

      {/* large, slowly-rotating swap motif, bottom trailing edge */}
      <RotatingSwap icon={Repeat2} size={motifSize} color={colors.green} style={[styles.motif, { bottom: motifBottom }, isRTL ? styles.motifStart : styles.motifEnd]} />
    </View>
  );
}

export function BrandBackground({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <BrandBackdrop />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, overflow: "hidden" },
  hLine: { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: GRID_LINE },
  vLine: { position: "absolute", top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: GRID_LINE },
  glowTop: { position: "absolute" },
  motif: { position: "absolute", opacity: 0.05 },
  motifEnd: { right: -40 },
  motifStart: { left: -40 },
});
