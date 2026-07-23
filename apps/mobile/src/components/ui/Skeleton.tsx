import { useEffect, useRef } from "react";
import { Animated, StyleSheet, type DimensionValue, type ViewStyle } from "react-native";
import { colors, radii } from "../../theme";

/** Pulsing placeholder for loading states (web `Skeleton`). Direction-agnostic. */
export function Skeleton({
  width = "100%",
  height = 16,
  radius = radii.sm,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[styles.base, { width, height, borderRadius: radius, opacity: pulse }, style]} />;
}

const styles = StyleSheet.create({ base: { backgroundColor: colors.elevated } });
