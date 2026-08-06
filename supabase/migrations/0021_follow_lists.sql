-- 0021_follow_lists.sql — followers/following LIST support (M7 batch 2).
--
-- The `follows` table (0001) has public-read RLS and denormalized counts, but:
--   1. only the composite PK (follower_id, following_id) is indexed, so
--      "who follows X" (filter on following_id) has no supporting index; and
--   2. neither `follows` nor `profiles` RLS is block-filtered (both `using(true)`),
--      so a naive join would EXPOSE users in a block relationship with the viewer.
--
-- This migration adds the missing index and a single read function that both list
-- directions use. Block filtering + the viewer's per-row `is_following` are computed
-- from `auth.uid()` INSIDE the function (never a client-supplied id), so a caller
-- cannot spoof the viewer or bypass block filtering. Additive; no data change.

-- 1. Index for "followers of X" (following_id lookups). The reverse direction
--    ("following of X" = follower_id) is already covered by the PK's leading column.
create index if not exists follows_following_idx on public.follows (following_id, created_at desc);

-- 2. list_follows(target, direction, limit, offset) → public profile rows + is_following.
--    SECURITY INVOKER (default): relies on the public-read RLS of follows/profiles and
--    on `blocked_between` (SECURITY DEFINER) to see blocks in BOTH directions — which the
--    viewer otherwise cannot read. Returns ONLY public-profile columns (+ is_following);
--    never email/phone/admin/moderation fields. Excludes admins and banned users, and any
--    user in a block relationship with the caller. Stable ordering for keyset-style paging.
create or replace function public.list_follows(
  p_target uuid,
  p_direction text,               -- 'followers' | 'following'
  p_limit int default 30,
  p_offset int default 0
)
returns table (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  bio text,
  country_id uuid,
  city_id uuid,
  followers_count int,
  following_count int,
  listings_count int,
  completed_swaps_count int,
  rating numeric,
  ratings_count int,
  created_at timestamptz,
  is_following boolean
)
language sql
stable
set search_path = public
as $$
  select
    p.id, p.full_name, p.username, p.avatar_url, p.bio, p.country_id, p.city_id,
    p.followers_count, p.following_count, p.listings_count, p.completed_swaps_count,
    p.rating, p.ratings_count, p.created_at,
    (auth.uid() is not null
       and exists (
         select 1 from public.follows vf
          where vf.follower_id = auth.uid() and vf.following_id = p.id
       )) as is_following
  from public.follows f
  join public.profiles p
    on p.id = case when p_direction = 'followers' then f.follower_id else f.following_id end
  where (case when p_direction = 'followers' then f.following_id else f.follower_id end) = p_target
    and p.is_admin = false
    and p.is_banned = false
    and (auth.uid() is null or not public.blocked_between(auth.uid(), p.id))
  order by f.created_at desc, p.id
  limit least(greatest(coalesce(p_limit, 30), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.list_follows(uuid, text, int, int) to anon, authenticated, service_role;

-- 3. FIX: sync_follow_counts (0001) was SECURITY INVOKER, so a follow inserted via
--    the RLS client (how mobile follows) could only update the FOLLOWER's own row —
--    the profiles UPDATE on the FOLLOWED user's followers_count is blocked by the
--    "update own profile" RLS, silently under-counting followers_count. Recreate as
--    SECURITY DEFINER so the denormalized counts are maintained authoritatively
--    regardless of who performs the follow, then reconcile any drifted counts.
create or replace function public.sync_follow_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
  elsif (tg_op = 'DELETE') then
    update public.profiles set followers_count = greatest(followers_count - 1, 0) where id = old.following_id;
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
  end if;
  return null;
end;
$$;

-- one-time reconciliation of counts drifted by the pre-fix RLS behaviour (safe: recomputed from actual rows).
update public.profiles p set
  followers_count = (select count(*) from public.follows f where f.following_id = p.id),
  following_count = (select count(*) from public.follows f where f.follower_id = p.id)
where p.followers_count is distinct from (select count(*) from public.follows f where f.following_id = p.id)
   or p.following_count is distinct from (select count(*) from public.follows f where f.follower_id = p.id);
