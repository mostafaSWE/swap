import type {
  ListingWithImages,
  SwapConfirmationView,
  SwapProposal,
  SwapProposalStatus,
  SwapProposalWithRelations,
} from "@swap/types";
import type { SwapClient } from "../client";

// Private deal-closing bucket (mirror of @swap/config STORAGE_BUCKETS.swapConfirmations);
// inlined to avoid a runtime dependency on @swap/config from this read layer.
const SWAP_CONFIRMATIONS_BUCKET = "swap-confirmations";

/**
 * Direct (RLS-protected) reads of swap proposals for the web/mobile UI. All
 * proposal MUTATIONS go through the NestJS backend (it owns the state machine);
 * these helpers exist so read pages and Realtime can hydrate without a round-trip
 * to the API. RLS limits every row to the two parties (proposer/recipient).
 */

const PUBLIC_PROFILE_COLUMNS =
  "id, full_name, username, avatar_url, bio, country_id, city_id, followers_count, following_count, listings_count, completed_swaps_count, rating, ratings_count, created_at";

// Mirrors apps/api PROPOSAL_SELECT: target listing (full relations), the
// proposer's offered listings (id + images), and both parties' public profiles.
const PROPOSAL_SELECT = `
  *,
  listing:listings!swap_proposals_listing_id_fkey(
    *,
    images:listing_images(*),
    owner:profiles!listings_owner_id_fkey(${PUBLIC_PROFILE_COLUMNS}),
    category:categories(*),
    country:countries(*),
    city:cities(*)
  ),
  proposer:profiles!swap_proposals_proposer_id_fkey(${PUBLIC_PROFILE_COLUMNS}),
  recipient:profiles!swap_proposals_recipient_id_fkey(${PUBLIC_PROFILE_COLUMNS}),
  offered_items:swap_proposal_items(
    listing:listings(*, images:listing_images(*))
  )
`;

/** Raw row before `offered_items` ([{ listing }]) is flattened to a listing[]. */
type ProposalRow = Omit<SwapProposalWithRelations, "offered_items"> & {
  offered_items: { listing: ListingWithImages }[];
};

function flattenProposal(row: ProposalRow): SwapProposalWithRelations {
  const { offered_items, ...rest } = row;
  // An offered listing the viewer can't read under RLS (e.g. it was hidden/removed
  // and isn't theirs) comes back as `{ listing: null }` — drop those so the UI
  // never renders a null item. (The backend service uses the service-role client
  // and never hits this, but these direct reads are RLS-scoped.)
  return {
    ...rest,
    offered_items: (offered_items ?? []).map((i) => i.listing).filter(Boolean) as SwapProposalWithRelations["offered_items"],
  };
}

/**
 * The swap proposal a conversation is tied to (via `conversations.proposal_id`),
 * with full relations — or null for a chat-only conversation. RLS: participants only.
 */
export async function getProposalByConversationId(
  supabase: SwapClient,
  conversationId: string,
): Promise<SwapProposalWithRelations | null> {
  const { data: convo, error: convoErr } = await supabase
    .from("conversations")
    .select("proposal_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (convoErr) throw convoErr;
  if (!convo?.proposal_id) return null;

  const { data, error } = await supabase
    .from("swap_proposals")
    .select(PROPOSAL_SELECT)
    .eq("id", convo.proposal_id)
    .maybeSingle<ProposalRow>();
  if (error) throw error;
  return data ? flattenProposal(data) : null;
}

/** Map of proposal id → status for a set of proposal ids (inbox status badges). */
export async function getProposalStatuses(
  supabase: SwapClient,
  proposalIds: (string | null | undefined)[],
): Promise<Record<string, SwapProposalStatus>> {
  const ids = [...new Set(proposalIds.filter((id): id is string => Boolean(id)))];
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from("swap_proposals")
    .select("id, status")
    .in("id", ids);
  if (error) throw error;
  const map: Record<string, SwapProposalStatus> = {};
  for (const row of data ?? []) map[row.id] = row.status;
  return map;
}

/**
 * Deal-closing confirmation photos for a proposal, resolved to time-limited
 * signed URLs for display. RLS limits the rows to the two parties (+ admins),
 * and the private bucket's SELECT policy lets a party sign the other's photo —
 * so both sides see both photos once uploaded (spec §3.4). Order: oldest first.
 */
export async function getConfirmations(
  supabase: SwapClient,
  proposalId: string,
): Promise<SwapConfirmationView[]> {
  const { data, error } = await supabase
    .from("swap_confirmations")
    .select("user_id, photo_path, created_at")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const signed = await Promise.all(
    (data ?? []).map(async (row) => {
      const { data: url } = await supabase.storage
        .from(SWAP_CONFIRMATIONS_BUCKET)
        .createSignedUrl(row.photo_path, 60 * 60);
      return url?.signedUrl
        ? { user_id: row.user_id, photo_url: url.signedUrl, created_at: row.created_at }
        : null;
    }),
  );
  return signed.filter(Boolean) as SwapConfirmationView[];
}

/** Subscribe to status changes on a single proposal via Supabase Realtime. */
export function subscribeToProposal(
  supabase: SwapClient,
  proposalId: string,
  onChange: (proposal: SwapProposal) => void,
) {
  const channel = supabase
    .channel(`proposal:${proposalId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "swap_proposals",
        filter: `id=eq.${proposalId}`,
      },
      (payload) => onChange(payload.new as SwapProposal),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
