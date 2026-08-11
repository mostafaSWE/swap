import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, spacing } from "../../theme";

/**
 * Brand lockup — the JS "swap" mark (green J + white S) next to the "JustSwap"
 * wordmark, matching the web `<Logo>`: **Just is green, Swap is white** (the mark's
 * green-J / white-S echoed in the text). Used on the home header and the auth
 * screens so the brand is actually present, not just a text wordmark.
 * `flexDirection:"row"` auto-mirrors under RTL (mark → trailing side), like the web.
 */
const MARK = require("../../../assets/logo-mark.png");

export function Logo({
  markSize = 40,
  textSize = 26,
  style,
}: {
  markSize?: number;
  textSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.row, style]} accessibilityRole="header" accessibilityLabel="JustSwap">
      <Image source={MARK} style={{ width: markSize, height: markSize }} resizeMode="contain" />
      <Text style={[styles.text, { fontSize: textSize }]}>
        <Text style={styles.just}>Just</Text>Swap
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  text: { color: colors.white, fontWeight: "800", letterSpacing: 0.2 },
  just: { color: colors.green },
});
