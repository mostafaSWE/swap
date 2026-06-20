"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { getOrCreateConversation } from "@swap/api";
import { createClient } from "@/lib/supabase/client";
import { getApi } from "@/lib/api";
import { useRouter } from "@/i18n/navigation";
import { CTAButton } from "./CTAButton";
import { FollowButton } from "./FollowButton";
import { ProposeSwapDrawer } from "./ProposeSwapDrawer";

/**
 * Viewer-facing actions on a listing detail page: message the owner, propose a
 * swap (the core barter loop — NEVER processes payment), and follow. Hidden for
 * the owner viewing their own listing.
 */
export function ListingActions({
  ownerId,
  listingId,
  isOwner = false,
  initialFollowing = false,
}: {
  ownerId: string;
  listingId: string;
  isOwner?: boolean;
  initialFollowing?: boolean;
}) {
  const t = useTranslations("listing");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function startChat() {
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      // Prefer the backend API (business logic lives there); fall back to the
      // Supabase RPC when the API isn't configured.
      const api = getApi();
      const conversation = api
        ? await api.startConversation(listingId, { other_user_id: ownerId })
        : await getOrCreateConversation(supabase, {
            currentUserId: user.id,
            otherUserId: ownerId,
            listingId,
          });
      router.push(`/messages/${conversation.id}`);
    } catch {
      router.push("/login");
    } finally {
      setBusy(false);
    }
  }

  if (isOwner) return null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <CTAButton onClick={startChat} disabled={busy}>
          <MessageCircle className="h-5 w-5" aria-hidden />
          {t("message")}
        </CTAButton>
        <ProposeSwapDrawer targetListingId={listingId} />
      </div>
      <FollowButton userId={ownerId} initialFollowing={initialFollowing} />
    </div>
  );
}
