"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { getFollowers, getFollowing } from "@swap/api";
import type { PublicProfileWithFollow } from "@swap/types";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { ProfileAvatar } from "./ProfileAvatar";
import { FollowButton } from "./FollowButton";
import { EmptyState } from "./primitives";

/**
 * Followers / Following list with "load more" pagination. The first page is
 * rendered on the server (SSR) and passed as `initial`; subsequent pages are
 * fetched through the browser Supabase client using the same block-safe
 * `list_follows` RPC (getFollowers / getFollowing). Each row links to the
 * person's profile and — for signed-in viewers, excluding their own row —
 * offers a Follow/Unfollow toggle seeded from the row's `is_following`.
 */
export function ConnectionsList({
  targetId,
  direction,
  initial,
  viewerId,
  pageSize,
}: {
  targetId: string;
  direction: "followers" | "following";
  initial: PublicProfileWithFollow[];
  viewerId: string | null;
  pageSize: number;
}) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const [rows, setRows] = useState<PublicProfileWithFollow[]>(initial);
  const [hasMore, setHasMore] = useState(initial.length === pageSize);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const fetchPage = direction === "followers" ? getFollowers : getFollowing;
      const page = await fetchPage(createClient(), targetId, { limit: pageSize, offset: rows.length });
      setRows((cur) => [...cur, ...page]);
      setHasMore(page.length === pageSize);
    } catch {
      /* keep what we have */
    } finally {
      setLoading(false);
    }
  }

  if (rows.length === 0) {
    return <EmptyState title={direction === "followers" ? t("followersEmpty") : t("followingEmpty")} />;
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {rows.map((u) => (
          <li key={u.id} className="card flex items-center gap-3 p-3">
            <Link href={`/users/${u.username}`} className="flex min-w-0 flex-1 items-center gap-3">
              <ProfileAvatar src={u.avatar_url} name={u.full_name} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{u.full_name}</p>
                <p className="truncate text-sm text-muted">@{u.username}</p>
              </div>
            </Link>
            {viewerId && viewerId !== u.id ? (
              <FollowButton userId={u.id} initialFollowing={u.is_following} fullWidth={false} className="shrink-0" />
            ) : null}
          </li>
        ))}
      </ul>
      {hasMore ? (
        <button type="button" onClick={loadMore} disabled={loading} className="btn-secondary w-full">
          {loading ? tc("loading") : tc("loadMore")}
        </button>
      ) : null}
    </div>
  );
}
