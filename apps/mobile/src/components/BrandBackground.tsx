import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";
import { Repeat2 } from "lucide-react-native";
import { colors } from "../theme";
import { isRTL } from "../i18n";
import { RotatingSwap, useReduceMotion } from "./motion";

/**
 * Full-bleed branded background for the auth / marketing surfaces — the native
 * counterpart of the web `AuthShell` form panel: a deep near-black navy base, a
 * faint ink grid, soft emerald glows, and a large slowly-rotating swap motif.
 *
 * The glows are a pre-rendered soft radial-gradient PNG (assets/brand-glow.png)
 * placed off-screen so only their soft falloff bleeds in — no hard-edged circles,
 * no `expo-linear-gradient`/blur (which would need an EAS rebuild or crash Fabric).
 * A gentle breathing (opacity + scale) and the rotating motif make it feel alive
 * like the website; both are disabled under Reduce Motion. RTL-aware.
 */
const GLOW = require("../../assets/brand-glow.png");
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const GRID = 44;
const GRID_LINE = "rgba(233,237,246,0.045)";
const H_LINES = Array.from({ length: Math.ceil(SCREEN_H / GRID) + 2 }, (_, i) => i * GRID);
const V_LINES = Array.from({ length: Math.ceil(SCREEN_W / GRID) + 2 }, (_, i) => i * GRID);
const TOP_GLOW = 520;

export function BrandBackground({ children }: { children: ReactNode }) {
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

      {/* one soft emerald glow — a radial-gradient PNG bleeding off the top edge
          (matches the web's single top glow); intensity kept subtle. */}
      <Animated.Image
        source={GLOW}
        resizeMode="contain"
        style={[styles.glowTop, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
      />

      {/* large, slowly-rotating swap motif, bottom trailing edge */}
      <RotatingSwap icon={Repeat2} size={280} color={colors.green} style={[styles.motif, isRTL ? styles.motifStart : styles.motifEnd]} />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, overflow: "hidden" },
  hLine: { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: GRID_LINE },
  vLine: { position: "absolute", top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: GRID_LINE },
  glowTop: { position: "absolute", pointerEvents: "none", width: TOP_GLOW, height: TOP_GLOW, top: -TOP_GLOW * 0.55, left: SCREEN_W / 2 - TOP_GLOW / 2 },
  motif: { position: "absolute", bottom: -36, opacity: 0.05 },
  motifEnd: { right: -40 },
  motifStart: { left: -40 },
});
