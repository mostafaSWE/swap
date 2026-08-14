-- 0022_account_deletion.sql — user-initiated account deletion (Google Play User Data
-- policy + Apple 5.1.1(v) + GDPR erasure).
--
-- WHY THIS IS NOT A HARD DELETE
-- `profiles.id` is FK'd to `auth.users(id) ON DELETE CASCADE`, and 21 further FKs
-- cascade off `profiles`. Deleting the auth user therefore also destroys, for the
-- OTHER party, data that is not the deleting user's to erase:
--   • messages          (sender_id cascade) → the counterparty loses the thread
--   • ratings           (rater_id cascade)  → other users' aggregate scores change
--                                             (ratings_sync_aggregate fires on DELETE)
--   • reports           (reporter_id cascade) → moderation/legal evidence disappears,
--                                             letting a bad actor erase their own trail
--   • swap_proposals    (proposer/recipient) → the counterparty loses deal history
--   • admin_actions     (admin_id cascade)  → the audit log is destroyed
--
-- So we do the standard, policy-compliant thing: PURGE everything personal, ANONYMISE
-- the profile row into a tombstone so shared records keep a valid FK target, and DELETE
-- the login. Retention of de-identified transaction/safety records is expressly allowed
-- by Play ("security, fraud prevention, regulatory compliance") and is disclosed in the
-- privacy policy.
--
-- To let the login go away while the tombstone survives, we must drop the cascading FK
-- from profiles.id → auth.users(id). An orphan profile row IS the tombstone.
--
-- Additive apart from that one constraint drop. No existing row is modified.

-- ════════════════════════════════════════════════════════════════════════
-- 1. Tombstone marker
-- ════════════════════════════════════════════════════════════════════════
alter table public.profiles add column if not exists deleted_at timestamptz;

comment on column public.profiles.deleted_at is
  'Set when the user deleted their account. The row is an anonymised tombstone kept only so that other users'' messages, ratings, proposals and reports keep a valid FK target. Never expose these rows publicly.';

-- Partial index: the only queries are "is this profile a tombstone".
create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at) where deleted_at is not null;

-- ════════════════════════════════════════════════════════════════════════
-- 2. Break the auth.users → profiles cascade (see header)
-- ════════════════════════════════════════════════════════════════════════
-- handle_new_user() still populates profiles on signup; nothing else relied on this
-- constraint (RLS compares auth.uid() to profiles.id directly, not via the FK).
alter table public.profiles drop constraint if exists profiles_id_fkey;

-- ════════════════════════════════════════════════════════════════════════
-- 3. Public deletion requests (Play requires a web path that works WITHOUT the app,
--    including for people who can no longer sign in)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.account_deletion_requests (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  username    text,
  reason      text,
  user_id     uuid references public.profiles(id) on delete set null,
  status      text not null default 'pending'
              check (status in ('pending','completed','rejected')),
  created_at  timestamptz not null default now(),
  handled_at  timestamptz,
  handled_by  uuid references public.profiles(id) on delete set null,
  notes       text
);

create index if not exists account_deletion_requests_status_idx
  on public.account_deletion_requests (status, created_at desc);

alter table public.account_deletion_requests enable row level security;

-- Writes come only from the API (service role, which bypasses RLS) so the public form
-- cannot be used to enumerate or spam the table. Admins may read the queue.
drop policy if exists "deletion requests admin read" on public.account_deletion_requests;
create policy "deletion requests admin read"
  on public.account_deletion_requests for select
  using (public.is_admin(auth.uid()));

-- ════════════════════════════════════════════════════════════════════════
-- 4. delete_account(uuid) — the atomic purge + anonymise
-- ════════════════════════════════════════════════════════════════════════
-- Runs as one transaction. The caller (the API, service role) is responsible for the
-- two things SQL cannot do: removing the Storage objects and deleting the auth user.
-- SECURITY DEFINER + an empty grant list: only the service role may execute it, so a
-- signed-in client can never delete somebody else's account by calling the RPC.
create or replace function public.delete_account(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_suffix   text;
  v_listings int;
  v_is_admin boolean;
begin
  if p_user_id is null then
    raise exception 'user_id_required' using errcode = '22023';
  end if;

  select is_admin into v_is_admin from public.profiles where id = p_user_id;
  if v_is_admin is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  -- Refuse to self-delete an admin: admin_actions is an audit log and an accidental
  -- self-delete could leave the platform without a moderator. Demote first.
  if v_is_admin then
    raise exception 'admin_cannot_self_delete' using errcode = '42501';
  end if;

  -- Idempotent: a second call on an already-deleted account is a no-op success.
  if exists (select 1 from public.profiles where id = p_user_id and deleted_at is not null) then
    return jsonb_build_object('ok', true, 'already_deleted', true);
  end if;

  v_suffix := substr(replace(p_user_id::text, '-', ''), 1, 12);

  -- ── a. Take every listing out of circulation ──────────────────────────
  -- Soft-remove (not delete): swap_proposal_items still reference these rows, and the
  -- counterparty's completed-swap history must keep rendering. 'removed' is already
  -- excluded from every public query (getListings defaults to status='active').
  update public.listings
     set status = 'removed'
   where owner_id = p_user_id and status <> 'removed';
  get diagnostics v_listings = row_count;

  -- Their listing photos are personal content: drop the rows here, the API removes the
  -- Storage objects. The listing shells stay for referential integrity.
  delete from public.listing_images
   where listing_id in (select id from public.listings where owner_id = p_user_id);

  -- ── b. Purge rows that are personal to this user alone ────────────────
  delete from public.saved_listings  where user_id = p_user_id;
  delete from public.device_tokens   where user_id = p_user_id;
  delete from public.push_outbox     where user_id = p_user_id;
  delete from public.notifications   where user_id = p_user_id;
  delete from public.listing_views   where user_id = p_user_id;
  -- follows: deleting these fires follows_sync_counts, which correctly decrements the
  -- OTHER users' followers_count/following_count.
  delete from public.follows where follower_id = p_user_id or following_id = p_user_id;
  -- blocks are meaningless once the account is gone (in both directions).
  delete from public.blocks  where blocker_id  = p_user_id or blocked_id   = p_user_id;

  -- ── c. Anonymise the profile into a tombstone ─────────────────────────
  -- RETAINED ON PURPOSE (still pointing here): messages, conversations,
  -- conversation_participants, swap_proposals, swap_proposal_items, swap_confirmations,
  -- ratings (both given and received), reports, admin_actions.
  update public.profiles
     set full_name              = 'Deleted user',
         username               = 'deleted_' || v_suffix,
         email                  = null,
         phone                  = null,
         avatar_url             = null,
         bio                    = null,
         country_id             = null,
         city_id                = null,
         is_suspended           = false,
         suspended_until        = null,
         suspension_reason      = null,
         followers_count        = 0,
         following_count        = 0,
         listings_count         = 0,
         completed_swaps_count  = 0,
         rating                 = null,
         ratings_count          = 0,
         terms_accepted_version = null,
         terms_accepted_at      = null,
         deleted_at             = now()
   where id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'listings_removed', v_listings,
    'deleted_at', now()
  );
end;
$$;

-- Only the service role (which bypasses grants) may run this.
revoke all on function public.delete_account(uuid) from public;
revoke all on function public.delete_account(uuid) from anon;
revoke all on function public.delete_account(uuid) from authenticated;

comment on function public.delete_account(uuid) is
  'Purges personal rows and anonymises the profile into a tombstone. Caller must also remove Storage objects and delete the auth.users row. Service-role only.';

-- ════════════════════════════════════════════════════════════════════════
-- 5. Keep tombstones out of the social graph
-- ════════════════════════════════════════════════════════════════════════
-- list_follows already excludes admins/banned; add deleted tombstones. Body is
-- otherwise byte-identical to 0021.
create or replace function public.list_follows(
  p_target uuid,
  p_direction text,
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
    and not p.is_admin
    and not p.is_banned
    and p.deleted_at is null
    and (auth.uid() is null or not public.blocked_between(auth.uid(), p.id))
  order by f.created_at desc, p.id
  limit least(coalesce(p_limit, 30), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;
