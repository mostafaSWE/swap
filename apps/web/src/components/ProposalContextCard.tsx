"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Camera, Check, PackageCheck, Star, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  getConfirmations,
  SwapApiError,
  subscribeToProposal,
  type SwapApiClient,
} from "@swap/api";
import { MAX_PROPOSAL_ITEMS } from "@swap/validation";
import { STORAGE_BUCKETS } from "@swap/config";
import type {
  ListingWithImages,
  Rating,
  SwapConfirmationView,
  SwapProposalStatus,
  SwapProposalWithRelations,
} from "@swap/types";
import { createClient } from "@/lib/supabase/client";
import { getApi } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { ItemArtwork } from "./ItemArtwork";
import { ListingPicker } from "./ListingPicker";
import { ProposalStatusBadge } from "./badges";
import { FormTextarea } from "./forms";
import { CTAButton } from "./CTAButton";
import { RatingStars } from "./RatingStars";
import { Sheet } from "./Sheet";
import { SwapRatingPrompt } from "./SwapRatingPrompt";
import { SwapCompleteAnimation } from "./SwapCompleteAnimation";
import { cn } from "@/lib/utils";

/** Statuses where the negotiation is still open to accept/counter/decline. */
const OPEN_STATUSES: SwapProposalStatus[] = ["pending", "countered"];
/** Statuses where the deal is closing — confirm receipt / dispute. */
const CLOSING_STATUSES: SwapProposalStatus[] = ["agreed", "awaiting_confirmation"];

type Action = "accept" | "decline" | "cancel" | "counter" | "confirm" | "dispute";

/**
 * Proposal context card pinned at the top of a swap conversation (spec §3.4/§3.5):
 * shows the deal from the current user's perspective (give ⇄ get), a status
 * banner, and the stage-aware actions — Accept / Counter / Decline / Withdraw
 * during negotiation, then "We've exchanged" / "Something went wrong" during
 * deal-closing. Both parties upload a photo of what they received; when both
 * confirm, the swap completes (celebration + each party's swap count +1).
 * Mutations go through the backend; Realtime keeps both cards in sync.
 */
export function ProposalContextCard({
  initialProposal,
  initialConfirmations,
  initialMyRating,
  currentUserId,
}: {
  initialProposal: SwapProposalWithRelations;
  initialConfirmations: SwapConfirmationView[];
  initialMyRating: Rating | null;
  currentUserId: string;
}) {
  const t = useTranslations("proposal");
  const tc = useTranslations("common");
  const [proposal, setProposal] = useState(initialProposal);
  const [confirmations, setConfirmations] = useState(initialConfirmations);
  const [busy, setBusy] = useState<Action | "">("");
  const [error, setError] = useState<string | null>(null);
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterIds, setCounterIds] = useState<string[]>([]);
  const [counterNote, setCounterNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmFile, setConfirmFile] = useState<File | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [myRating, setMyRating] = useState(initialMyRating);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const supabase = useRef(createClient());

  // Refs let the (once-only) Realtime subscription read live state without re-subscribing.
  const inFlightRef = useRef(false);
  inFlightRef.current =
    busy !== "" || counterOpen || confirmOpen || disputeOpen || ratingOpen;

  // Keep the card live: when the other party acts, refetch the proposal + the
  // confirmation photos — but never yank state out from under a local action.
  useEffect(() => {
    const api = getApi();
    const unsubscribe = subscribeToProposal(supabase.current, initialProposal.id, () => {
      if (inFlightRef.current) return;
      if (api) api.proposal(initialProposal.id).then(setProposal).catch(() => {});
      getConfirmations(supabase.current, initialProposal.id).then(setConfirmations).catch(() => {});
    });
    return unsubscribe;
  }, [initialProposal.id]);

  // Local confirm-photo preview as an object URL — memoized + revoked so we don't
  // leak a fresh blob URL on every re-render while the confirm sheet is open.
  const previewUrl = useMemo(
    () => (confirmFile ? URL.createObjectURL(confirmFile) : null),
    [confirmFile],
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Fire the celebration once, when the swap actually transitions to completed
  // (whether this user closed it or the other party did, via Realtime).
  const prevStatus = useRef(initialProposal.status);
  useEffect(() => {
    if (prevStatus.current !== "completed" && proposal.status === "completed") {
      setShowCelebration(true);
    }
    prevStatus.current = proposal.status;
  }, [proposal.status]);

  const isProposer = proposal.proposer_id === currentUserId;
  const iAmLastActor = proposal.last_actor_id === currentUserId;
  const isOpen = OPEN_STATUSES.includes(proposal.status);
  const isMyTurn = isOpen && !iAmLastActor;
  const isClosing = CLOSING_STATUSES.includes(proposal.status);
  const iConfirmed = confirmations.some((c) => c.user_id === currentUserId);
  const otherName = (isProposer ? proposal.recipient : proposal.proposer)?.full_name ?? "";

  // What the current user gives vs. gets (proposer offers their items for the target).
  // Relations can be null at runtime if a listing was hidden/removed (RLS-filtered),
  // so drop nulls defensively — the card must never crash the chat route.
  const give = (isProposer ? proposal.offered_items : [proposal.listing]).filter(
    Boolean,
  ) as ListingWithImages[];
  const get = (isProposer ? [proposal.listing] : proposal.offered_items).filter(
    Boolean,
  ) as ListingWithImages[];

  async function run(
    action: Action,
    fn: (api: SwapApiClient) => Promise<SwapProposalWithRelations>,
  ) {
    if (busy) return;
    const api = getApi();
    if (!api) {
      setError(t("apiRequired"));
      return;
    }
    setBusy(action);
    setError(null);
    try {
      setProposal(await fn(api));
      if (action === "counter") setCounterOpen(false);
      if (action === "dispute") {
        setDisputeOpen(false);
        setDisputeReason("");
      }
    } catch (e) {
      setError(e instanceof SwapApiError ? e.message : t("error"));
    } finally {
      setBusy("");
    }
  }

  function openCounter() {
    // Seed with current offered items; the picker prunes any that are no longer
    // active+selectable via onLoaded (otherwise they'd be stuck & unremovable).
    setCounterIds(proposal.offered_items.map((i) => i.id));
    setCounterNote("");
    setError(null);
    setCounterOpen(true);
  }

  // Confirm receipt: sign → upload the photo → register. Completes the swap once
  // both parties have confirmed (the backend handles the state machine + counters).
  async function submitConfirmation() {
    if (!confirmFile || busy) return;
    const api = getApi();
    if (!api) {
      setError(t("apiRequired"));
      return;
    }
    setBusy("confirm");
    setError(null);
    try {
      const { path, token } = await api.signConfirmationUpload(proposal.id, confirmFile.name);
      const { error: upErr } = await supabase.current.storage
        .from(STORAGE_BUCKETS.swapConfirmations)
        .uploadToSignedUrl(path, token, confirmFile);
      if (upErr) {
        setError(t("uploadError"));
        return;
      }
      const updated = await api.confirmSwap(proposal.id, { photo_path: path });
      setProposal(updated);
      setConfirmOpen(false);
      setConfirmFile(null);
      getConfirmations(supabase.current, proposal.id).then(setConfirmations).catch(() => {});
    } catch (e) {
      setError(e instanceof SwapApiError ? e.message : t("confirmError"));
    } finally {
      setBusy("");
    }
  }

  // Post-swap rating (opt-in): rate the other party after completion. Upserts,
  // so this covers both leaving and editing a rating.
  async function submitRating(stars: number, comment: string) {
    const api = getApi();
    if (!api) {
      setRatingError(t("apiRequired"));
      return;
    }
    setRatingBusy(true);
    setRatingError(null);
    try {
      const saved = await api.rateProposal(proposal.id, {
        stars,
        comment: comment.trim() || null,
      });
      setMyRating(saved);
      setRatingOpen(false);
    } catch (e) {
      setRatingError(e instanceof SwapApiError ? e.message : t("rateError"));
    } finally {
      setRatingBusy(false);
    }
  }

  let banner: string;
  if (isClosing) {
    if (proposal.status === "agreed") banner = t("agreed");
    else banner = iConfirmed ? t("awaitingOther", { name: otherName }) : t("awaitingYou");
  } else if (isMyTurn) {
    banner = t("yourTurn");
  } else if (isOpen) {
    banner = t("waiting", { name: otherName });
  } else {
    banner = t(BANNER_KEY[proposal.status]);
  }

  return (
    <div className="border-b border-line bg-surface px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-ink">{t("contextTitle")}</span>
        <ProposalStatusBadge status={proposal.status} label={t(`status.${proposal.status}`)} />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ItemColumn label={t("youGive")} items={give} />
        <ItemColumn label={t("youGet")} items={get} accent />
      </div>

      {proposal.note ? (
        <p className="mt-2 rounded-card bg-canvas px-3 py-2 text-xs text-ink/80">“{proposal.note}”</p>
      ) : null}

      {confirmations.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {confirmations.map((c) => (
            <figure key={c.user_id} className="overflow-hidden rounded-card border border-line">
              {/* Signed URLs (private bucket) — plain <img>, not next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.photo_url}
                alt={c.user_id === currentUserId ? t("received") : t("theyReceived", { name: otherName })}
                className="aspect-square w-full object-cover"
              />
              <figcaption className="px-2 py-1 text-[11px] font-semibold text-muted">
                {c.user_id === currentUserId ? t("received") : t("theyReceived", { name: otherName })}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      <p className="mt-2 text-xs font-medium text-muted">{banner}</p>
      {proposal.status === "disputed" ? (
        <p className="mt-1 text-xs text-muted">{t("disputedNote")}</p>
      ) : null}

      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}

      {/* Negotiation actions */}
      {isOpen && (isMyTurn || iAmLastActor) ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {isMyTurn ? (
            <>
              <button
                type="button"
                onClick={() => run("accept", (api) => api.acceptProposal(proposal.id))}
                disabled={!!busy}
                className="btn-primary !py-2 text-sm"
              >
                <Check className="h-4 w-4" aria-hidden />
                {t("accept")}
              </button>
              <button
                type="button"
                onClick={openCounter}
                disabled={!!busy}
                className="btn-secondary !py-2 text-sm"
              >
                {t("counter")}
              </button>
              <button
                type="button"
                onClick={() => run("decline", (api) => api.declineProposal(proposal.id))}
                disabled={!!busy}
                className="rounded-pill px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
              >
                {t("decline")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => run("cancel", (api) => api.cancelProposal(proposal.id))}
              disabled={!!busy}
              className="rounded-pill px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
            >
              {t("withdraw")}
            </button>
          )}
        </div>
      ) : null}

      {/* Deal-closing actions */}
      {isClosing ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {!iConfirmed ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setConfirmFile(null);
                  setConfirmOpen(true);
                }}
                disabled={!!busy}
                className="btn-primary !py-2 text-sm"
              >
                <PackageCheck className="h-4 w-4" aria-hidden />
                {t("confirmCta")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setDisputeReason("");
                  setDisputeOpen(true);
                }}
                disabled={!!busy}
                className="rounded-pill px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
              >
                {t("dispute")}
              </button>
              <button
                type="button"
                onClick={() => run("cancel", (api) => api.cancelProposal(proposal.id))}
                disabled={!!busy}
                className="rounded-pill px-3 py-2 text-sm font-semibold text-muted hover:bg-canvas"
              >
                {t("withdraw")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setDisputeReason("");
                  setDisputeOpen(true);
                }}
                disabled={!!busy}
                className="rounded-pill px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
              >
                {t("dispute")}
              </button>
              <button
                type="button"
                onClick={() => run("cancel", (api) => api.cancelProposal(proposal.id))}
                disabled={!!busy}
                className="rounded-pill px-3 py-2 text-sm font-semibold text-muted hover:bg-canvas"
              >
                {t("withdraw")}
              </button>
            </>
          )}
        </div>
      ) : null}

      {/* Post-swap rating (completed only) — leave or edit your rating */}
      {proposal.status === "completed" ? (
        <div className="mt-3">
          {myRating ? (
            <div className="rounded-card border border-line bg-canvas p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-ink">{t("ratedTitle", { name: otherName })}</span>
                <button
                  type="button"
                  onClick={() => {
                    setRatingError(null);
                    setRatingOpen(true);
                  }}
                  className="text-xs font-semibold text-green-dark hover:underline"
                >
                  {t("rateEdit")}
                </button>
              </div>
              <RatingStars
                value={myRating.stars}
                size="sm"
                className="mt-1.5"
                groupLabel={t("rateStarAria", { count: myRating.stars })}
              />
              {myRating.comment ? (
                <p className="mt-1.5 text-xs text-ink/80">“{myRating.comment}”</p>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setRatingError(null);
                setRatingOpen(true);
              }}
              className="btn-secondary !py-2 text-sm"
            >
              <Star className="h-4 w-4" aria-hidden />
              {t("rateCta")}
            </button>
          )}
        </div>
      ) : null}

      {/* Counter-offer sheet */}
      {counterOpen ? (
        <Sheet title={t("counterTitle")} onClose={() => setCounterOpen(false)} closeLabel={tc("close")}>
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <p className="text-xs text-muted">{t("counterHint")}</p>
            <ListingPicker
              ownerId={proposal.proposer_id}
              value={counterIds}
              onChange={setCounterIds}
              max={MAX_PROPOSAL_ITEMS}
              onLoaded={(ids) => setCounterIds((prev) => prev.filter((id) => ids.includes(id)))}
            />
            <FormTextarea
              label={t("note")}
              placeholder={t("notePlaceholder")}
              value={counterNote}
              onChange={(e) => setCounterNote(e.target.value)}
              maxLength={1000}
            />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
          <div className="border-t border-line px-5 py-4">
            <CTAButton
              onClick={() =>
                run("counter", (api) =>
                  api.counterProposal(proposal.id, {
                    offered_listing_ids: counterIds,
                    note: counterNote.trim() || null,
                  }),
                )
              }
              disabled={!counterIds.length || busy === "counter"}
              className="w-full"
            >
              {busy === "counter" ? t("sending") : t("sendCounter")}
            </CTAButton>
          </div>
        </Sheet>
      ) : null}

      {/* Confirm-exchange sheet */}
      {confirmOpen ? (
        <Sheet title={t("confirmTitle")} onClose={() => setConfirmOpen(false)} closeLabel={tc("close")}>
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <p className="text-xs text-muted">{t("confirmHint")}</p>
            <span className="block text-xs font-semibold text-ink">{t("confirmPhoto")}</span>
            {confirmFile ? (
              <div className="relative aspect-square w-full overflow-hidden rounded-card border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl ?? ""}
                  alt={t("confirmPhoto")}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setConfirmFile(null)}
                  className="absolute end-2 top-2 rounded-full bg-black/60 p-1 text-white"
                  aria-label={t("removePhoto")}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : (
              <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-line text-muted transition-colors hover:border-green hover:text-green">
                <Camera className="h-8 w-8" aria-hidden />
                <span className="text-sm font-semibold">{t("addPhoto")}</span>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setConfirmFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
          <div className="border-t border-line px-5 py-4">
            <CTAButton
              onClick={submitConfirmation}
              disabled={!confirmFile || busy === "confirm"}
              className="w-full"
            >
              {busy === "confirm" ? t("confirming") : t("confirmSubmit")}
            </CTAButton>
          </div>
        </Sheet>
      ) : null}

      {/* Dispute sheet */}
      {disputeOpen ? (
        <Sheet title={t("disputeTitle")} onClose={() => setDisputeOpen(false)} closeLabel={tc("close")}>
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <p className="flex items-start gap-2 text-xs text-muted">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
              {t("disputeHint")}
            </p>
            <FormTextarea
              label={t("disputeReason")}
              placeholder={t("disputeReason")}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              maxLength={1000}
            />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
          <div className="border-t border-line px-5 py-4">
            <CTAButton
              onClick={() =>
                run("dispute", (api) =>
                  api.disputeSwap(proposal.id, { reason: disputeReason.trim() || null }),
                )
              }
              disabled={busy === "dispute"}
              className="w-full"
            >
              {busy === "dispute" ? t("disputing") : t("disputeSubmit")}
            </CTAButton>
          </div>
        </Sheet>
      ) : null}

      {showCelebration ? (
        <SwapCompleteAnimation
          onDone={() => {
            setShowCelebration(false);
            // Opt-in prompt: invite a rating right after the celebration, only if
            // this user hasn't rated yet. Dismissible ("Maybe later").
            if (!myRating) {
              setRatingError(null);
              setRatingOpen(true);
            }
          }}
        />
      ) : null}

      {ratingOpen ? (
        <SwapRatingPrompt
          otherName={otherName}
          initial={myRating}
          busy={ratingBusy}
          error={ratingError}
          onSubmit={submitRating}
          onClose={() => setRatingOpen(false)}
        />
      ) : null}
    </div>
  );
}

const BANNER_KEY: Record<SwapProposalStatus, string> = {
  pending: "yourTurn",
  countered: "yourTurn",
  agreed: "agreed",
  awaiting_confirmation: "awaitingConfirmation",
  completed: "completed",
  disputed: "disputed",
  cancelled: "cancelled",
};

function ItemColumn({
  label,
  items,
  accent,
}: {
  label: string;
  items: ListingWithImages[];
  accent?: boolean;
}) {
  return (
    <div className="rounded-card border border-line p-2">
      <span className={cn("mb-1.5 block text-[11px] font-bold", accent ? "text-green-dark" : "text-muted")}>
        {label}
      </span>
      <div className="space-y-1.5">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/listings/${item.id}`}
            className="flex items-center gap-2 rounded-lg p-0.5 transition-colors hover:bg-canvas"
          >
            <ItemArtwork listing={item} className="h-9 w-9 shrink-0 rounded-lg" sizes="36px" />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{item.title}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted rtl:rotate-180" aria-hidden />
          </Link>
        ))}
      </div>
    </div>
  );
}
