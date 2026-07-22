import { StyleSheet, View } from "react-native";
import { colors } from "../../theme";

/** Hairline rule. */
export function Divider() {
  return <View style={styles.line} />;
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, alignSelf: "stretch" },
});
