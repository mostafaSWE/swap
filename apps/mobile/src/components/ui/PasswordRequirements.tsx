import { StyleSheet, Text, View } from "react-native";
import { Check, Circle } from "lucide-react-native";
import { colors, spacing } from "../../theme";
import { t } from "../../i18n";
import { Icon } from "./Icon";

/** The three password rules (web `PasswordStrength` checklist): ≥8 chars, a
 *  letter, a number. Each row turns green with a check once satisfied — the same
 *  rules `pwOk` enforces on submit. */
export function PasswordRequirements({ value }: { value: string }) {
  const rules = [
    { ok: value.length >= 8, label: t("auth.reqMinLength") },
    { ok: /[a-zA-Z]/.test(value), label: t("auth.reqLetter") },
    { ok: /[0-9]/.test(value), label: t("auth.reqNumber") },
  ];
  return (
    <View style={styles.wrap}>
      {rules.map((r) => (
        <View key={r.label} style={styles.row}>
          <Icon icon={r.ok ? Check : Circle} size={13} color={r.ok ? colors.green : colors.textFaint} />
          <Text style={[styles.label, r.ok && styles.labelOk]}>{r.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 3, marginTop: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: 12 },
  labelOk: { color: colors.green },
});
