"use client";

import { useState } from "react";
import { UserCheck, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { followUser, unfollowUser } from "@swap/api";
import { createClient } from "@/lib/supabase/client";
import { getApi } from "@/lib/api";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Follow / unfollow a user. Two-way, optimistic, with revert-on-error — mirrors
 * SaveButton. Writes through the backend API (with a direct-Supabase fallback).
 * Redirects to /login when signed out.
 */
export function FollowButton({
  userId,
  initialFollowing = false,
  fullWidth = true,
  className,
}: {
  userId: string;
  initialFollowing?: boolean;
  fullWidth?: boolean;
  className?: string;
}) {
  const t = useTranslations("listing");
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const next = !following;
    setFollowing(next); // optimistic
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
        await (next ? api.follow(userId) : api.unfollow(userId));
      } else {
        await (next ? followUser(supabase, user.id, userId) : unfollowUser(supabase, user.id, userId));
      }
      router.refresh();
    } catch {
      setFollowing(!next); // revert on failure
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={following}
      className={cn("btn-secondary", fullWidth && "w-full", className)}
    >
      {following ? (
        <UserCheck className="h-5 w-5 text-green" aria-hidden />
      ) : (
        <UserPlus className="h-5 w-5" aria-hidden />
      )}
      {following ? t("following") : t("follow")}
    </button>
  );
}
