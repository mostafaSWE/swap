import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { Flag } from "lucide-react-native";
import { SwapApiError } from "@swap/api";
import type { ReportTargetType } from "@swap/types";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { colors, spacing } from "../theme";
import { t } from "../i18n";
import { BottomSheet } from "./ui/BottomSheet";
import { Select } from "./ui/Select";
import { Textarea } from "./ui/Input";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";

// The four user-selectable reasons (mirrors web ReportDialog). Sent as the
// free-text `reason` slug — NOT localized — so the admin queue reads consistently.
const REASONS = ["spam", "inappropriate", "scam", "other"] as const;

type State = "idle" | "saving" | "done" | "duplicate" | "error" | "unauth";

/**
 * Controlled report sheet — owns the reason Select, description, the auth gate,
 * and the backend write (Apple 1.2 in-app reporting). Files against ANY target:
 * a listing, a user, a message, or a whole conversation. Reused by both the
 * {@link ReportDialog} trigger (listing/profile) and the chat report actions.
 *
 * Listing reports use the dedicated `api.reportListing`; every other target uses
 * `api.createReport`. A 409 → "already reported" (the DB de-dupes pending reports
 * per reporter/target, 0018); a missing session → a sign-in prompt.
 */
export function ReportSheet({
  visible,
  onClose,
  targetType,
  targetId,
}: {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
}) {
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [description, setDescription] = useState("");
  const [state, setState] = useState<State>("idle");

  function close() {
    onClose();
    // Reset after the sheet animates out so the next open starts clean.
    setTimeout(() => {
      setState("idle");
      setReason(REASONS[0]);
      setDescription("");
    }, 250);
  }

  async function submit() {
    setState("saving");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setState("unauth");
      return;
    }
    const trimmed = description.trim();
    try {
      if (targetType === "listing") {
        await api.reportListing(targetId, { reason, description: trimmed || undefined });
      } else {
        await api.createReport({
          target_type: targetType,
          target_id: targetId,
          reason,
          description: trimmed || undefined,
        });
      }
      setState("done");
    } catch (error) {
      if (error instanceof SwapApiError && error.status === 409) setState("duplicate");
      else setState("error");
    }
  }

  const busy = state === "saving";
  const resolved = state === "done" || state === "duplicate";

  return (
    <BottomSheet visible={visible} onClose={close} title={t("report.title")}>
      {resolved ? (
        <Text style={styles.success}>
          {state === "duplicate" ? t("report.duplicate") : t("report.success")}
        </Text>
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
          {state === "error" ? <Text style={styles.error}>{t("common.error")}</Text> : null}
          {state === "unauth" ? <Text style={styles.error}>{t("report.signInRequired")}</Text> : null}
          <Button label={t("report.submit")} onPress={submit} loading={busy} fullWidth />
        </ScrollView>
      )}
    </BottomSheet>
  );
}

/**
 * The default report entry point: a "Report Issue" pill that opens {@link ReportSheet}.
 * Used on the listing-detail and public-profile screens (targetType listing/user).
 */
export function ReportDialog({ targetType, targetId }: { targetType: ReportTargetType; targetId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={styles.trigger}>
        <Icon icon={Flag} size={16} color={colors.textMuted} />
        <Text style={styles.triggerText}>{t("report.title")}</Text>
      </Pressable>
      <ReportSheet visible={open} onClose={() => setOpen(false)} targetType={targetType} targetId={targetId} />
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: spacing.xs },
  triggerText: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
  form: { gap: spacing.md, paddingBottom: spacing.md },
  success: { color: colors.green, fontSize: 15, fontWeight: "700", textAlign: "center", paddingVertical: spacing.xl },
  error: { color: colors.danger, fontSize: 13, textAlign: "center" },
});
