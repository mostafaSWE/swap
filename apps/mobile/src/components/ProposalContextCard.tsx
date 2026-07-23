import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowLeftRight } from "lucide-react-native";
import type { ListingImage, ListingWithImages, ListingWithRelations, SwapProposalWithRelations } from "@swap/types";
import { api } from "../lib/api";
import { t } from "../i18n";
import { colors, radii, spacing } from "../theme";
import { Badge, BottomSheet, Button, Icon, PROPOSAL_STATUS_TONE, Textarea } from "./ui";
import { ItemArtwork } from "./ItemArtwork";
import { ListingPicker } from "./ListingPicker";
import { MAX_PROPOSAL_ITEMS } from "./ProposeSwapSheet";

type Item = ListingWithImages | ListingWithRelations;

const OPEN_STATUSES = ["pending", "countered"];
// cancel (= withdraw) is allowed while the deal is still live, per the backend state machine.
const CANCELLABLE = ["pending", "countered", "agreed", "awaiting_confirmation"];

function cover(item: Item): string | undefined {
  const images = (item.images ?? []) as ListingImage[];
  return [...images].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;
}
function catIcon(item: Item): string | null | undefined {
  return "category" in item ? item.category?.icon : null;
}

/**
 * The proposal pinned above a conversation (web `ProposalContextCard`) — the
 * negotiation slice of the swap loop. Shows what each side gives/gets, a status
 * badge + turn banner, and the actions available *to this user right now*:
 * Accept / Counter / Decline when it's their turn, Withdraw while the proposal
 * is still live. Deal-closing (photo confirm / dispute / rating) needs the
 * image picker and lands with M5 — see the plan doc.
 */
export function ProposalContextCard({
  proposal,
  currentUserId,
  onChange,
}: {
  proposal: SwapProposalWithRelations;
  currentUserId: string;
  onChange: (updated: SwapProposalWithRelations) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counterOpen, setCounterOpen] = useState(false);

  const isProposer = proposal.proposer_id === currentUserId;
  const iAmLastActor = proposal.last_actor_id === currentUserId;
  const isOpen = OPEN_STATUSES.includes(proposal.status);
  const isMyTurn = isOpen && !iAmLastActor;
  const otherName = (isProposer ? proposal.recipient : proposal.proposer)?.full_name ?? "";

  // give/get flip by role; the recipient's target listing is `proposal.listing`.
  const give: Item[] = (isProposer ? proposal.offered_items : [proposal.listing]).filter(Boolean);
  const get: Item[] = (isProposer ? [proposal.listing] : proposal.offered_items).filter(Boolean);

  function banner(): string {
    switch (proposal.status) {
      case "pending":
      case "countered":
        return isMyTurn ? t("proposal.yourTurn") : t("proposal.waiting", { name: otherName });
      case "agreed":
        return t("proposal.agreed");
      case "awaiting_confirmation":
        return t("proposal.awaitingConfirmation");
      case "completed":
        return t("proposal.completed");
      case "disputed":
        return t("proposal.disputed");
      default:
        return t("proposal.cancelled");
    }
  }

  async function run(fn: () => Promise<SwapProposalWithRelations>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await fn());
    } catch {
      setError(t("proposal.error"));
    } finally {
      setBusy(false);
    }
  }

  const showWithdraw = (isOpen && !isMyTurn) || (!isOpen && CANCELLABLE.includes(proposal.status));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("proposal.contextTitle")}</Text>
        <Badge label={t(`proposal.status.${proposal.status}`)} tone={PROPOSAL_STATUS_TONE[proposal.status] ?? "neutral"} />
      </View>

      <View style={styles.exchange}>
        <ItemColumn label={t("proposal.youGive")} items={give} />
        <Icon icon={ArrowLeftRight} size={18} color={colors.textMuted} mirror />
        <ItemColumn label={t("proposal.youGet")} items={get} accent />
      </View>

      {proposal.note ? <Text style={styles.note}>“{proposal.note}”</Text> : null}

      <Text style={styles.banner}>{banner()}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isOpen && isMyTurn ? (
        <View style={styles.actions}>
          <Button label={t("proposal.accept")} onPress={() => run(() => api.acceptProposal(proposal.id))} loading={busy} style={styles.flex} />
          <Button label={t("proposal.counter")} variant="secondary" onPress={() => setCounterOpen(true)} disabled={busy} style={styles.flex} />
          <Button label={t("proposal.decline")} variant="danger" onPress={() => run(() => api.declineProposal(proposal.id))} disabled={busy} style={styles.flex} />
        </View>
      ) : null}

      {showWithdraw ? (
        <Button label={t("proposal.withdraw")} variant="ghost" onPress={() => run(() => api.cancelProposal(proposal.id))} loading={busy} fullWidth />
      ) : null}

      <CounterSheet
        visible={counterOpen}
        onClose={() => setCounterOpen(false)}
        proposal={proposal}
        onCountered={(p) => {
          setCounterOpen(false);
          onChange(p);
        }}
      />
    </View>
  );
}

function ItemColumn({ label, items, accent }: { label: string; items: Item[]; accent?: boolean }) {
  return (
    <View style={styles.col}>
      <Text style={[styles.colLabel, accent && styles.colLabelAccent]}>{label}</Text>
      <View style={styles.thumbs}>
        {items.map((it) => (
          <View key={it.id} style={styles.thumbWrap}>
            <ItemArtwork imageUrl={cover(it)} title={it.title} categoryIcon={catIcon(it)} style={styles.thumb} />
          </View>
        ))}
      </View>
    </View>
  );
}

function CounterSheet({
  visible,
  onClose,
  proposal,
  onCountered,
}: {
  visible: boolean;
  onClose: () => void;
  proposal: SwapProposalWithRelations;
  onCountered: (updated: SwapProposalWithRelations) => void;
}) {
  // Countering re-selects the *proposer's* items (backend rule), whoever counters.
  const [ids, setIds] = useState<string[]>(proposal.offered_items.map((i) => i.id));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!ids.length || busy) return;
    setBusy(true);
    setError(null);
    try {
      onCountered(await api.counterProposal(proposal.id, { offered_listing_ids: ids, note: note.trim() || null }));
    } catch {
      setError(t("proposal.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t("proposal.counterTitle")}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>{t("proposal.counterHint")}</Text>
        <ListingPicker ownerId={proposal.proposer_id} value={ids} onChange={setIds} max={MAX_PROPOSAL_ITEMS} />
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
          label={busy ? t("proposal.sending") : t("proposal.sendCounter")}
          onPress={send}
          loading={busy}
          disabled={!ids.length}
          fullWidth
        />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  title: { color: colors.text, fontSize: 14, fontWeight: "800" },
  exchange: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  col: { flex: 1, gap: spacing.xs },
  colLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  colLabelAccent: { color: colors.green },
  thumbs: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  thumbWrap: { width: 44 },
  thumb: { width: 44, height: 44, borderRadius: radii.sm },
  note: { color: colors.textMuted, fontSize: 13, fontStyle: "italic" },
  banner: { color: colors.text, fontSize: 13, fontWeight: "600" },
  error: { color: colors.danger, fontSize: 13 },
  actions: { flexDirection: "row", gap: spacing.sm },
  flex: { flex: 1, paddingHorizontal: spacing.sm },
  hint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md },
  noteWrap: { marginTop: spacing.lg },
});
