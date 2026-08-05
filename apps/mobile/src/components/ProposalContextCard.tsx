import { useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowLeftRight } from "lucide-react-native";
import {
  getConfirmations,
  getMyRatingForProposal,
} from "@swap/api";
import type {
  ListingImage,
  ListingWithImages,
  ListingWithRelations,
  Rating,
  SwapConfirmationView,
  SwapProposalWithRelations,
} from "@swap/types";
import { api } from "../lib/api";
import { pickImages, type PickedImage, uploadSwapConfirmation } from "../lib/upload";
import { useTerms } from "../lib/terms";
import { supabase } from "../lib/supabase";
import { t } from "../i18n";
import { colors, radii, spacing } from "../theme";
import { Badge, BottomSheet, Button, Icon, PROPOSAL_STATUS_TONE, RatingStars, Textarea } from "./ui";
import { ItemArtwork } from "./ItemArtwork";
import { ListingPicker } from "./ListingPicker";
import { MAX_PROPOSAL_ITEMS } from "./ProposeSwapSheet";
import { SwapCompleteAnimation } from "./SwapCompleteAnimation";

type Item = ListingWithImages | ListingWithRelations;

const OPEN_STATUSES = ["pending", "countered"];
const CLOSING_STATUSES = ["agreed", "awaiting_confirmation"];
// Cancel (= withdraw) remains available while a physical handover is pending.
const CANCELLABLE = ["pending", "countered", "agreed", "awaiting_confirmation"];

function cover(item: Item): string | undefined {
  const images = (item.images ?? []) as ListingImage[];
  return [...images].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;
}

function catIcon(item: Item): string | null | undefined {
  return "category" in item ? item.category?.icon : null;
}

/**
 * The proposal pinned above a conversation. It mirrors the web state machine:
 * negotiation actions first, then a mutually visible two-photo confirmation
 * step, admin-visible disputes, and one rating per party after completion.
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
  const { ensureAccepted } = useTerms();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counterOpen, setCounterOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmImage, setConfirmImage] = useState<PickedImage | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [confirmations, setConfirmations] = useState<SwapConfirmationView[]>([]);
  const [myRating, setMyRating] = useState<Rating | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const previousStatus = useRef(proposal.status);
  const ratingRef = useRef<Rating | null>(null);

  const isProposer = proposal.proposer_id === currentUserId;
  const iAmLastActor = proposal.last_actor_id === currentUserId;
  const isOpen = OPEN_STATUSES.includes(proposal.status);
  const isClosing = CLOSING_STATUSES.includes(proposal.status);
  const isMyTurn = isOpen && !iAmLastActor;
  const iConfirmed = confirmations.some((confirmation) => confirmation.user_id === currentUserId);
  const otherName = (isProposer ? proposal.recipient : proposal.proposer)?.full_name ?? "";

  // Give/get flips by role; the recipient's target listing is proposal.listing.
  const give: Item[] = (isProposer ? proposal.offered_items : [proposal.listing]).filter(Boolean);
  const get: Item[] = (isProposer ? [proposal.listing] : proposal.offered_items).filter(Boolean);
  const showWithdraw = (isOpen && !isMyTurn) || (!isOpen && CANCELLABLE.includes(proposal.status));

  // Confirmation rows are RLS-scoped to the two swap parties. The signed URLs
  // intentionally expose both photos to both parties as agreed for this flow.
  useEffect(() => {
    let active = true;
    void getConfirmations(supabase, proposal.id)
      .then((rows) => {
        if (active) setConfirmations(rows);
      })
      .catch(() => {
        if (active) setConfirmations([]);
      });

    if (proposal.status === "completed") {
      void getMyRatingForProposal(supabase, proposal.id, currentUserId)
        .then((rating) => {
          if (active) setMyRating(rating);
        })
        .catch(() => {
          if (active) setMyRating(null);
        });
    } else {
      setMyRating(null);
    }

    return () => {
      active = false;
    };
  }, [proposal.id, proposal.status, currentUserId]);

  useEffect(() => {
    ratingRef.current = myRating;
  }, [myRating]);

  // Completion may happen after this user confirms or through Realtime when the
  // other party confirms. Match web: celebrate first, then invite each side to
  // leave its independent rating (unless it already has one).
  useEffect(() => {
    const justCompleted = previousStatus.current !== "completed" && proposal.status === "completed";
    previousStatus.current = proposal.status;
    if (justCompleted) {
      let active = true;
      void getMyRatingForProposal(supabase, proposal.id, currentUserId)
        .then((rating) => {
          if (active) {
            setMyRating(rating);
            setShowCelebration(true);
          }
        })
        .catch(() => active && setShowCelebration(true));
      return () => {
        active = false;
      };
    }
  }, [proposal.status]);

  async function refreshConfirmations() {
    try {
      setConfirmations(await getConfirmations(supabase, proposal.id));
    } catch {
      // The status subscription will retry this on the next proposal update.
    }
  }

  function banner(): string {
    if (isClosing) {
      if (proposal.status === "agreed") return t("proposal.agreed");
      return iConfirmed
        ? t("proposal.awaitingOther", { name: otherName })
        : t("proposal.awaitingYou");
    }
    if (isOpen) return isMyTurn ? t("proposal.yourTurn") : t("proposal.waiting", { name: otherName });
    switch (proposal.status) {
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

  async function chooseConfirmationPhoto() {
    if (busy) return;
    setError(null);
    try {
      setConfirmImage((await pickImages(1))[0] ?? null);
    } catch {
      setError(t("proposal.uploadError"));
    }
  }

  async function submitConfirmation() {
    if (!confirmImage || busy) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadSwapConfirmation(proposal.id, confirmImage));
      // A first confirmation keeps the proposal in awaiting_confirmation, so a
      // status subscription alone would not reliably refresh the gallery.
      void refreshConfirmations();
      setConfirmImage(null);
      setConfirmOpen(false);
    } catch {
      setError(t("proposal.confirmError"));
    } finally {
      setBusy(false);
    }
  }

  async function submitDispute() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await api.disputeSwap(proposal.id, { reason: disputeReason.trim() || null }));
      setDisputeReason("");
      setDisputeOpen(false);
    } catch {
      setError(t("proposal.error"));
    } finally {
      setBusy(false);
    }
  }

  function openRating() {
    setRatingError(null);
    setRatingStars(myRating?.stars ?? 0);
    setRatingComment(myRating?.comment ?? "");
    setRatingOpen(true);
  }

  async function submitRating() {
    if (!ratingStars || ratingBusy) return;
    if (!(await ensureAccepted())) return; // Apple 1.2 — a review is public UGC
    setRatingBusy(true);
    setRatingError(null);
    try {
      setMyRating(
        await api.rateProposal(proposal.id, {
          stars: ratingStars,
          comment: ratingComment.trim() || null,
        }),
      );
      setRatingOpen(false);
    } catch {
      setRatingError(t("proposal.rateError"));
    } finally {
      setRatingBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("proposal.contextTitle")}</Text>
        <Badge
          label={t("proposal.status." + proposal.status)}
          tone={PROPOSAL_STATUS_TONE[proposal.status] ?? "neutral"}
        />
      </View>

      <View style={styles.exchange}>
        <ItemColumn label={t("proposal.youGive")} items={give} />
        <Icon icon={ArrowLeftRight} size={18} color={colors.textMuted} mirror />
        <ItemColumn label={t("proposal.youGet")} items={get} accent />
      </View>

      {proposal.note ? <Text style={styles.note}>“{proposal.note}”</Text> : null}

      <ConfirmationPhotos
        confirmations={confirmations}
        currentUserId={currentUserId}
        otherName={otherName}
      />

      <Text style={styles.banner}>{banner()}</Text>
      {proposal.status === "disputed" ? <Text style={styles.muted}>{t("proposal.disputedNote")}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isOpen && isMyTurn ? (
        <View style={styles.actions}>
          <Button
            label={t("proposal.accept")}
            onPress={() => run(() => api.acceptProposal(proposal.id))}
            loading={busy}
            style={styles.flex}
          />
          <Button
            label={t("proposal.counter")}
            variant="secondary"
            onPress={() => setCounterOpen(true)}
            disabled={busy}
            style={styles.flex}
          />
          <Button
            label={t("proposal.decline")}
            variant="danger"
            onPress={() => run(() => api.declineProposal(proposal.id))}
            disabled={busy}
            style={styles.flex}
          />
        </View>
      ) : null}

      {isClosing ? (
        <View style={styles.actions}>
          {!iConfirmed ? (
            <Button
              label={t("proposal.confirmCta")}
              onPress={() => {
                setError(null);
                setConfirmImage(null);
                setConfirmOpen(true);
              }}
              disabled={busy}
              style={styles.flex}
            />
          ) : null}
          <Button
            label={t("proposal.dispute")}
            variant="danger"
            onPress={() => {
              setError(null);
              setDisputeReason("");
              setDisputeOpen(true);
            }}
            disabled={busy}
            style={styles.flex}
          />
        </View>
      ) : null}

      {showWithdraw ? (
        <Button
          label={t("proposal.withdraw")}
          variant="ghost"
          onPress={() => run(() => api.cancelProposal(proposal.id))}
          loading={busy}
          fullWidth
        />
      ) : null}

      {proposal.status === "completed" ? (
        <>
          <View style={styles.complete}>
            <Text style={styles.completeTitle}>{t("proposal.completeTitle")}</Text>
            <Text style={styles.completeBody}>{t("proposal.completeBody")}</Text>
          </View>
          {myRating ? (
            <View style={styles.rated}>
              <View style={styles.ratedHeader}>
                <Text style={styles.ratedTitle}>{t("proposal.ratedTitle", { name: otherName })}</Text>
                <Pressable onPress={openRating} accessibilityRole="button" accessibilityLabel={t("proposal.rateEdit")}>
                  <Text style={styles.edit}>{t("proposal.rateEdit")}</Text>
                </Pressable>
              </View>
              <RatingStars
                value={myRating.stars}
                size="sm"
                label={t("proposal.rateStarAria", { count: myRating.stars })}
              />
              {myRating.comment ? <Text style={styles.ratingComment}>“{myRating.comment}”</Text> : null}
            </View>
          ) : (
            <Button label={t("proposal.rateCta")} variant="secondary" onPress={openRating} fullWidth />
          )}
        </>
      ) : null}

      <CounterSheet
        visible={counterOpen}
        onClose={() => setCounterOpen(false)}
        proposal={proposal}
        onCountered={(updated) => {
          setCounterOpen(false);
          onChange(updated);
        }}
      />

      <BottomSheet
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t("proposal.confirmTitle")}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.hint}>{t("proposal.confirmHint")}</Text>
          <Text style={styles.fieldLabel}>{t("proposal.confirmPhoto")}</Text>
          {confirmImage ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: confirmImage.uri }} style={styles.preview} resizeMode="cover" />
              <Button
                label={t("proposal.removePhoto")}
                variant="ghost"
                onPress={() => setConfirmImage(null)}
                disabled={busy}
                fullWidth
              />
            </View>
          ) : (
            <Button label={t("proposal.addPhoto")} variant="secondary" onPress={chooseConfirmationPhoto} fullWidth />
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.sheetAction}>
            <Button
              label={t("proposal.confirmSubmit")}
              onPress={submitConfirmation}
              loading={busy}
              disabled={!confirmImage}
              fullWidth
            />
          </View>
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        visible={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        title={t("proposal.disputeTitle")}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.hint}>{t("proposal.disputeHint")}</Text>
          <Textarea
            label={t("proposal.disputeReason")}
            placeholder={t("proposal.disputeReason")}
            value={disputeReason}
            onChangeText={setDisputeReason}
            maxLength={1000}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.sheetAction}>
            <Button
              label={t("proposal.disputeSubmit")}
              variant="danger"
              onPress={submitDispute}
              loading={busy}
              fullWidth
            />
          </View>
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        visible={ratingOpen}
        onClose={() => setRatingOpen(false)}
        title={t("proposal.rateTitle")}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.hint}>{t("proposal.rateSubtitle", { name: otherName })}</Text>
          <Text style={styles.fieldLabel}>{t("proposal.rateStarsLabel")}</Text>
          <RatingStars
            value={ratingStars}
            onChange={setRatingStars}
            size="lg"
            label={t("proposal.rateStarAria", { count: ratingStars })}
          />
          <View style={styles.ratingText}>
            <Textarea
              label={t("proposal.rateCommentLabel")}
              placeholder={t("proposal.rateCommentPlaceholder")}
              value={ratingComment}
              onChangeText={setRatingComment}
              maxLength={1000}
            />
          </View>
          {ratingError ? <Text style={styles.error}>{ratingError}</Text> : null}
          <View style={styles.sheetAction}>
            <Button
              label={t("proposal.rateSubmit")}
              onPress={submitRating}
              loading={ratingBusy}
              disabled={!ratingStars}
              fullWidth
            />
            <Button
              label={t("proposal.rateLater")}
              variant="ghost"
              onPress={() => setRatingOpen(false)}
              disabled={ratingBusy}
              fullWidth
            />
          </View>
        </ScrollView>
      </BottomSheet>

      {showCelebration ? (
        <SwapCompleteAnimation
          onDone={() => {
            setShowCelebration(false);
            if (!ratingRef.current) openRating();
          }}
        />
      ) : null}
    </View>
  );
}

function ConfirmationPhotos({
  confirmations,
  currentUserId,
  otherName,
}: {
  confirmations: SwapConfirmationView[];
  currentUserId: string;
  otherName: string;
}) {
  if (!confirmations.length) return null;
  return (
    <View style={styles.confirmations}>
      {confirmations.map((confirmation) => {
        const mine = confirmation.user_id === currentUserId;
        return (
          <View key={confirmation.user_id} style={styles.confirmation}>
            <Image
              source={{ uri: confirmation.photo_url }}
              style={styles.confirmationImage}
              resizeMode="cover"
              accessibilityLabel={mine ? t("proposal.received") : t("proposal.theyReceived", { name: otherName })}
            />
            <Text style={styles.confirmationCaption}>
              {mine ? t("proposal.received") : t("proposal.theyReceived", { name: otherName })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ItemColumn({ label, items, accent }: { label: string; items: Item[]; accent?: boolean }) {
  return (
    <View style={styles.col}>
      <Text style={[styles.colLabel, accent && styles.colLabelAccent]}>{label}</Text>
      <View style={styles.thumbs}>
        {items.map((item) => (
          <View key={item.id} style={styles.thumbWrap}>
            <ItemArtwork imageUrl={cover(item)} title={item.title} categoryIcon={catIcon(item)} style={styles.thumb} />
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
  // Countering always re-selects the proposer's offered listings (backend rule).
  const [ids, setIds] = useState<string[]>(proposal.offered_items.map((item) => item.id));
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
        <View style={styles.sheetAction}>
          <Button
            label={t("proposal.sendCounter")}
            onPress={send}
            loading={busy}
            disabled={!ids.length}
            fullWidth
          />
        </View>
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
  muted: { color: colors.textMuted, fontSize: 12 },
  error: { color: colors.danger, fontSize: 13 },
  actions: { flexDirection: "row", gap: spacing.sm },
  flex: { flex: 1, paddingHorizontal: spacing.sm },
  confirmations: { flexDirection: "row", gap: spacing.sm },
  confirmation: { flex: 1, overflow: "hidden", borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border },
  confirmationImage: { width: "100%", aspectRatio: 1 },
  confirmationCaption: { color: colors.textMuted, fontSize: 11, fontWeight: "700", padding: spacing.sm },
  complete: { backgroundColor: colors.greenLight, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs },
  completeTitle: { color: colors.greenDark, fontSize: 14, fontWeight: "800" },
  completeBody: { color: colors.text, fontSize: 12, lineHeight: 18 },
  rated: { backgroundColor: colors.background, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.xs },
  ratedHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  ratedTitle: { color: colors.text, fontSize: 12, fontWeight: "800", flex: 1 },
  edit: { color: colors.green, fontSize: 12, fontWeight: "800" },
  ratingComment: { color: colors.textMuted, fontSize: 12, fontStyle: "italic", marginTop: spacing.xs },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: spacing.md },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: "700", marginBottom: spacing.sm },
  previewWrap: { gap: spacing.sm },
  preview: { width: "100%", aspectRatio: 1, borderRadius: radii.md, backgroundColor: colors.elevated },
  sheetAction: { marginTop: spacing.lg, gap: spacing.xs, paddingBottom: spacing.sm },
  noteWrap: { marginTop: spacing.lg },
  ratingText: { marginTop: spacing.lg },
});
