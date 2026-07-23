import type { LucideIcon } from "lucide-react-native";
import { I18nManager, StyleSheet, View } from "react-native";
import { colors } from "../../theme";

/** Thin wrapper over lucide-react-native for consistent size/color, plus RTL
 *  mirroring for directional glyphs (chevrons/arrows). Pass `mirror` for those
 *  so they flip under RTL (RN doesn't mirror icon paths automatically).
 *
 *  The flip is applied to a wrapping `View` (RN transform, origin = center) —
 *  NOT to the svg's own `style`, which is unreliable on the New Architecture and
 *  can drop the glyph entirely. */
export function Icon({
  icon: LucideCmp,
  size = 20,
  color = colors.text,
  mirror = false,
}: {
  icon: LucideIcon;
  size?: number;
  color?: string;
  mirror?: boolean;
}) {
  const glyph = <LucideCmp size={size} color={color} strokeWidth={2} />;
  return mirror && I18nManager.isRTL ? <View style={styles.flip}>{glyph}</View> : glyph;
}

const styles = StyleSheet.create({ flip: { transform: [{ scaleX: -1 }] } });
