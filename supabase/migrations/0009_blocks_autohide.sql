-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0009 blocks + report auto-hide (Phase 4 trust & safety)
--
-- Two additive safety features:
--   1) blocks — a user may block another. Blocking (a) hides each party's
--      ACTIVE listings from the other (enforced in the listings + listing_images
--      RLS via the public.blocked_between() helper, since the web reads listings
--      directly through the RLS-protected client) and (b) prevents messaging
--      (the backend mutation paths, the messages INSERT RLS, and the
--      get_or_create_conversation RPC) and severs any follow edge both ways.
--      Mirrors the follows/saved_listings join-table shape; owner-only RLS
--      (a block list is private). No counter column, no notification — blocking
--      is silent (spec §3.8).
--   2) report auto-hide — an AFTER INSERT trigger on public.reports soft-hides a
--      listing (status active → hidden) once it accumulates >= the threshold of
--      PENDING 'listing' reports. A DB trigger is the single chokepoint that
--      covers EVERY report write path (backend service-role, the direct-RLS web
--      fallback, the proposal-dispute insert, and seed data) — same rationale as
--      the 0008 notification triggers. The feeds already exclude non-active
--      listings, so flipping status is a complete soft-hide (spec §3.8).
--
-- Run after 0008. Purely ADDITIVE + idempotent (create-if-not-exists /
-- create-or-replace / drop-…-if-exists), so it can be applied on its own to an
-- existing database without a full reset. No grants needed — reset.sql's
-- `alter default privileges` auto-grants new objects to anon/authenticated/
-- service_role.
-- ════════════════════════════════════════════════════════════════════════

-- ── blocks ───────────────────────────────────────────────────────────────
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
-- The PK covers blocker_id-lead lookups ("who have I blocked"); this covers the
-- reverse ("who has blocked me"), used by blocked_between().
create index if not exists blocks_blocked_idx on public.blocks(blocked_id);

alter table public.blocks enable row level security;

-- A block list is private — only the blocker reads/manages their own rows
-- (mirrors saved_listings' owner-only RLS, NOT follows' public read).
drop policy if exists "blocks read own" on public.blocks;
create policy "blocks read own" on public.blocks
  for select using (blocker_id = auth.uid());
drop policy if exists "blocks insert own" on public.blocks;
create policy "blocks insert own" on public.blocks
  for insert with check (blocker_id = auth.uid());
drop policy if exists "blocks delete own" on public.blocks;
create policy "blocks delete own" on public.blocks
  for delete using (blocker_id = auth.uid());
drop policy if exists "blocks admin manage" on public.blocks;
create policy "blocks admin manage" on public.blocks
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Blocking severs any follow edge in BOTH directions. A trigger (not app code)
-- so it fires for every write path — backend service-role insert AND the
-- direct-RLS web fallback. SECURITY DEFINER so it can delete the reverse edge
-- (the blocked user → blocker), which the "follows delete own" RLS would
-- otherwise forbid the client from removing. The follows_sync_counts trigger
-- keeps followers_count/following_count correct on these deletes.
create or replace function public.sever_follows_on_block()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.follows
   where (follower_id = new.blocker_id and following_id = new.blocked_id)
      or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return null;
end;
$$;
drop trigger if exists blocks_sever_follows on public.blocks;
create trigger blocks_sever_follows
  after insert on public.blocks
  for each row execute function public.sever_follows_on_block();

-- ── blocked_between(a, b): true if EITHER user has blocked the other ──────
-- SECURITY DEFINER so it can read public.blocks from inside the listings RLS
-- policy regardless of the viewer's own (owner-only) RLS on blocks. STABLE.
-- Null-safe: a null argument (logged-out viewer) matches no rows → false.
create or replace function public.blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;
-- This runs inside the listings RLS policy on EVERY feed read, so the querying
-- roles must be able to execute it (explicit + belt-and-suspenders alongside the
-- default privileges from reset.sql; mirrors how is_admin() is reached in RLS).
grant execute on function public.blocked_between(uuid, uuid) to anon, authenticated, service_role;

-- ── listings: exclude block-related listings from public reads ────────────
-- Re-defines the 0002 "listings public read active" policy to add the block
-- exclusion. Owner + admin visibility is unchanged.
drop policy if exists "listings public read active" on public.listings;
create policy "listings public read active" on public.listings
  for select using (
    (status = 'active' and not public.blocked_between(auth.uid(), owner_id))
    or owner_id = auth.uid()
    or public.is_admin(auth.uid())
  );

-- Keep listing_images consistent with the listing visibility above.
drop policy if exists "listing_images read" on public.listing_images;
create policy "listing_images read" on public.listing_images
  for select using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (
          (l.status = 'active' and not public.blocked_between(auth.uid(), l.owner_id))
          or l.owner_id = auth.uid()
          or public.is_admin(auth.uid())
        )
    )
  );

-- ── messages: refuse to SEND across a block ──────────────────────────────
-- The backend ConversationsService.send already guards this, but the web can
-- send directly via RLS when the API isn't configured. Re-define the 0002
-- "messages send if participant" policy to also reject an insert if the sender
-- and any other participant of the conversation are in a block relationship —
-- so a block prevents messaging even in an EXISTING conversation, on every path.
-- (Reading old history is intentionally still allowed; only sending is blocked.)
drop policy if exists "messages send if participant" on public.messages;
create policy "messages send if participant" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = messages.conversation_id and p.user_id = auth.uid()
    )
    and not exists (
      select 1 from public.conversation_participants p2
      where p2.conversation_id = messages.conversation_id
        and p2.user_id <> auth.uid()
        and public.blocked_between(auth.uid(), p2.user_id)
    )
  );

-- ── get_or_create_conversation: refuse to start a chat across a block ─────
-- Re-defines the 0001 RPC, adding a block guard alongside the existing
-- "cannot message yourself" check. (The backend services bypass this RPC via
-- the service-role client and enforce the same guard in code; this covers any
-- direct-RLS caller.)
create or replace function public.get_or_create_conversation(other_user_id uuid, p_listing_id uuid default null)
returns public.conversations
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  existing public.conversations;
  created public.conversations;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if me = other_user_id then raise exception 'cannot message yourself'; end if;
  if public.blocked_between(me, other_user_id) then raise exception 'blocked'; end if;

  select c.* into existing
  from public.conversations c
  join public.conversation_participants p1 on p1.conversation_id = c.id and p1.user_id = me
  join public.conversation_participants p2 on p2.conversation_id = c.id and p2.user_id = other_user_id
  limit 1;

  if found then
    return existing;
  end if;

  insert into public.conversations (listing_id) values (p_listing_id) returning * into created;
  insert into public.conversation_participants (conversation_id, user_id)
  values (created.id, me), (created.id, other_user_id);
  return created;
end;
$$;

-- ── report auto-hide ─────────────────────────────────────────────────────
-- Soft-hide a listing once it gathers >= the threshold of PENDING 'listing'
-- reports. The constant mirrors the documented REPORT_AUTO_HIDE_THRESHOLD
-- (spec §3.8, default 5) — the DB trigger is the enforcement point (the env var
-- can't reach a trigger), so retune by editing this constant. Only PENDING
-- reports count, so an admin resolving/rejecting the reports relieves the
-- pressure; only ACTIVE listings are auto-hidden, so an admin un-hide is not
-- reverted unless NEW reports push it back over the line. User-target reports
-- are left to manual moderation (auto-suspending an account is heavier).
create or replace function public.auto_hide_reported_listing()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  threshold constant int := 5;  -- REPORT_AUTO_HIDE_THRESHOLD (spec §3.8)
  reporter_count int;
begin
  if new.target_type <> 'listing' then
    return null;
  end if;
  -- Count DISTINCT reporters so one user spamming reports can't unilaterally
  -- hide a listing — it takes `threshold` different people flagging it.
  select count(distinct reporter_id) into reporter_count
    from public.reports
   where target_type = 'listing'
     and target_id = new.target_id
     and status = 'pending';
  if reporter_count >= threshold then
    update public.listings
       set status = 'hidden'
     where id = new.target_id
       and status = 'active';
  end if;
  return null;
end;
$$;
drop trigger if exists reports_auto_hide on public.reports;
create trigger reports_auto_hide
  after insert on public.reports
  for each row execute function public.auto_hide_reported_listing();

-- NOTE: blocks is intentionally NOT added to the supabase_realtime publication —
-- there is no live subscriber (block state is read on profile load / settings).
