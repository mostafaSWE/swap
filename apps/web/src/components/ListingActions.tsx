"use client";

import { useState } from "react";
import { MessageCircle, Repeat2, UserPlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { followUser, getOrCreateConversation } from "@swap/api";
import type { Locale } from "@swap/types";
import { createClient } from "@/lib/supabase/client";
import { getApi } from "@/lib/api";
import { useRouter } from "@/i18n/navigation";
import { CTAButton } from "./CTAButton";

/**
 * Owner-facing actions on the listing details page: message, mark interest
 * (starts a chat — NEVER processes payment), and follow.
 */
export function ListingActions({
  ownerId,
  listingId,
}: {
  ownerId: string;
  listingId: string;
}) {
  const t = useTranslations("listing");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [following, setFollowing] = useState(false);

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

  async function toggleFollow() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const api = getApi();
      if (api) await api.follow(ownerId);
      else await followUser(supabase, user.id, ownerId);
      setFollowing(true);
    } catch {
      router.push("/login");
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <CTAButton onClick={startChat} disabled={busy}>
          <MessageCircle className="h-5 w-5" aria-hidden />
          {t("message")}
        </CTAButton>
        {/* "Interested in Exchange" only starts a chat / marks interest — no payment. */}
        <CTAButton variant="secondary" onClick={startChat} disabled={busy}>
          <Repeat2 className="h-5 w-5" aria-hidden />
          {t("interested")}
        </CTAButton>
      </div>
      <button
        type="button"
        onClick={toggleFollow}
        className="btn-secondary w-full"
        disabled={following}
      >
        <UserPlus className="h-5 w-5" aria-hidden />
        {following ? t("following") : t("follow")}
      </button>
    </div>
  );
}
