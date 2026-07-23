import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { t } from "../i18n";
import { colors, spacing } from "../theme";
import { BottomSheet, Button, Textarea } from "./ui";
import { ListingPicker } from "./ListingPicker";

// Mirror of @swap/validation MAX_PROPOSAL_ITEMS (not a mobile dep; backend enforces the real cap).
export const MAX_PROPOSAL_ITEMS = 8;

/**
 * Propose-a-swap bottom sheet (web `ProposeSwapDrawer`). Pick 1..N of your own
 * items to offer against the target listing, add an optional note, and submit →
 * `api.createProposal`. On success the backend finds-or-creates the 1:1
 * conversation; we hand the caller its id to route into the thread.
 */
export function ProposeSwapSheet({
  visible,
  onClose,
  targetListingId,
  currentUserId,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  targetListingId: string;
  currentUserId: string;
  onCreated: (conversationId: string | null) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!selected.length || busy) return;
    setBusy(true);
    setError(null);
    try {
      const proposal = await api.createProposal({
        listing_id: targetListingId,
        offered_listing_ids: selected,
        note: note.trim() || null,
      });
      onCreated(proposal.conversation_id);
    } catch {
      setError(t("proposal.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t("proposal.title")}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.safety}>{t("safety.points.meetPublic")}</Text>

        <Text style={styles.section}>{t("proposal.chooseItems")}</Text>
        <Text style={styles.hint}>{t("proposal.chooseItemsHint")}</Text>
        <ListingPicker
          ownerId={currentUserId}
          excludeListingId={targetListingId}
          value={selected}
          onChange={setSelected}
          max={MAX_PROPOSAL_ITEMS}
        />
        {selected.length ? <Text style={styles.count}>{t("proposal.selected", { count: selected.length })}</Text> : null}

        <View style={styles.noteWrap}>
          <Textarea
            label={t("proposal.note")}
            placeholder={t("proposal.notePlaceholder")}
            value={note}
            onChangeText={setNote}
            maxLength={1000}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={busy ? t("proposal.sending") : t("proposal.send")}
          onPress={submit}
          loading={busy}
          disabled={!selected.length}
          fullWidth
        />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  safety: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: spacing.md },
  section: { color: colors.text, fontSize: 15, fontWeight: "700" },
  hint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md },
  count: { color: colors.green, fontSize: 13, fontWeight: "600", marginTop: spacing.sm },
  noteWrap: { marginTop: spacing.lg },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.md },
});
