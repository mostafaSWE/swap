"use client";

import { useState } from "react";
import { Ban, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { blockUser, unblockUser } from "@swap/api";
import { createClient } from "@/lib/supabase/client";
import { getApi } from "@/lib/api";
import { useRouter } from "@/i18n/navigation";
import { FollowButton } from "./FollowButton";
import { ReportDialog } from "./ReportDialog";

/**
 * Viewer-facing actions on another user's public profile: follow, report, block.
 * Blocking hides the other user's listings from each other and prevents
 * messaging (spec §3.8); while blocked the follow button is replaced by a
 * notice (you can't follow someone you've blocked). Never rendered for self.
 */
export function ProfileActions({
  userId,
  initialFollowing,
  initialBlocked,
}: {
  userId: string;
  initialFollowing: boolean;
  initialBlocked: boolean;
}) {
  const t = useTranslations("block");
  const router = useRouter();
  const [blocked, setBlocked] = useState(initialBlocked);
  const [busy, setBusy] = useState(false);

  async function toggleBlock() {
    setBusy(true);
    const next = !blocked;
    setBlocked(next); // optimistic
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
      if (api) {
        await (next ? api.block(userId) : api.unblock(userId));
      } else {
        await (next ? blockUser(supabase, user.id, userId) : unblockUser(supabase, user.id, userId));
      }
      router.refresh(); // re-fetch listings (hidden while blocked) + follow state
    } catch {
      setBlocked(!next); // revert on failure
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {blocked ? (
        <p className="rounded-card bg-canvas px-3 py-2 text-center text-sm text-muted">
          {t("blockedNotice")}
        </p>
      ) : (
        <FollowButton userId={userId} initialFollowing={initialFollowing} />
      )}
      <div className="flex items-center justify-center gap-5">
        <ReportDialog targetType="user" targetId={userId} />
        <button
          type="button"
          onClick={toggleBlock}
          disabled={busy}
          aria-pressed={blocked}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-danger disabled:opacity-50"
        >
          {blocked ? <Undo2 className="h-4 w-4" aria-hidden /> : <Ban className="h-4 w-4" aria-hidden />}
          {blocked ? t("unblock") : t("block")}
        </button>
      </div>
    </div>
  );
}
