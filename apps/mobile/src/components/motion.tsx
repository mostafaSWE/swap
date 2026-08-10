import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, type StyleProp, type ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Icon } from "./ui/Icon";

/**
 * Shared motion vocabulary — the native counterpart of the web `components/motion.tsx`
 * (Reveal / Stagger / RotatingSwap). Built on the core `Animated` API (Fabric-safe,
 * no reanimated dep) with `useNativeDriver` (transform/opacity only). Every animation
 * is gated on Reduce Motion: when enabled, elements render in their final state with
 * no motion (a11y `reduced-motion`).
 */

/** Live Reduce-Motion preference (reads once, then subscribes to changes). */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => mounted && setReduce(v));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => mounted && setReduce(v));
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * Entrance wrapper: a restrained fade + rise on mount. Stagger a group by passing an
 * increasing `delay` (30–50ms per item) — see the auth screens. Honors Reduce Motion.
 */
export function Reveal({
  children,
  delay = 0,
  distance = 12,
  style,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReduceMotion();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return anim.setValue(1);
    const t = Animated.timing(anim, {
      toValue: 1,
      duration: 460,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    t.start();
    return () => t.stop();
  }, [anim, delay, reduce]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
  return <Animated.View style={[style, { opacity: anim, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/**
 * Continuously (slowly) rotating swap glyph — the native `RotatingSwap` motif. A full
 * turn every ~16s reads as "living" without being distracting. Static under Reduce Motion.
 */
export function RotatingSwap({
  icon,
  size,
  color,
  style,
}: {
  icon: LucideIcon;
  size: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReduceMotion();
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin, reduce]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <Animated.View style={[style, reduce ? null : { transform: [{ rotate }] }]}>
      <Icon icon={icon} size={size} color={color} />
    </Animated.View>
  );
}
