import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "../theme";
import { Logo } from "./ui/Logo";
import { BrandBackdrop } from "./BrandBackground";
import { useReduceMotion } from "./motion";

/**
 * Branded full-screen loading/splash — the JustSwap logo lockup, gently breathing,
 * over the branded backdrop (soft glow + rotating swap motif). Reused for BOTH the
 * app's boot (behind the direction guard) and the "switching language" reload, so
 * the user sees an alive branded screen instead of a blank/white flash. All motion
 * is Reduce-Motion gated.
 */
export function LoadingScreen() {
  const reduce = useReduceMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce) {
      pulse.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduce]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <BrandBackdrop />
      <View style={styles.center}>
        <Animated.View style={{ transform: [{ scale }], opacity }}>
          <Logo markSize={60} textSize={34} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, overflow: "hidden" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
