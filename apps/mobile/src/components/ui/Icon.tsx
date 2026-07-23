import type { LucideIcon } from "lucide-react-native";
import { I18nManager } from "react-native";
import { colors } from "../../theme";

/** Thin wrapper over lucide-react-native for consistent size/color, plus RTL
 *  mirroring for directional glyphs (chevrons/arrows). Pass `mirror` for those
 *  so they flip under RTL (RN doesn't mirror icon paths automatically). */
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
  return (
    <LucideCmp
      size={size}
      color={color}
      strokeWidth={2}
      style={mirror && I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
    />
  );
}
