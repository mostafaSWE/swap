import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { Flag } from "lucide-react-native";
import { colors, spacing } from "../theme";
import { t } from "../i18n";
import { BottomSheet } from "./ui/BottomSheet";
import { Select } from "./ui/Select";
import { Textarea } from "./ui/Input";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";

const REASONS = ["spam", "inappropriate", "scam", "other"] as const;

/**
 * Report trigger + sheet (web `ReportDialog`) — files a report against any
 * target. Presentational: the caller's `onSubmit` does the backend write; this
 * owns the sheet, the reason Select, and the description.
 */
export function ReportDialog({ onSubmit }: { onSubmit?: (reason: string, description: string) => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await onSubmit?.(reason, description);
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Pressable
        onPress={() => {
          setDone(false);
          setOpen(true);
        }}
        accessibilityRole="button"
        style={styles.trigger}
      >
        <Icon icon={Flag} size={16} color={colors.textMuted} />
        <Text style={styles.triggerText}>{t("report.title")}</Text>
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={t("report.title")}>
        {done ? (
          <Text style={styles.success}>{t("report.success")}</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Select
              label={t("report.reason")}
              value={reason}
              onChange={setReason}
              options={REASONS.map((r) => ({ value: r, label: t(`report.reasons.${r}`) }))}
            />
            <Textarea
              label={t("report.description")}
              value={description}
              onChangeText={setDescription}
              placeholder={t("report.description")}
            />
            <Button label={t("report.submit")} onPress={submit} loading={busy} fullWidth />
          </ScrollView>
        )}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: spacing.xs },
  triggerText: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
  form: { gap: spacing.md, paddingBottom: spacing.md },
  success: { color: colors.green, fontSize: 15, fontWeight: "700", textAlign: "center", paddingVertical: spacing.xl },
});
