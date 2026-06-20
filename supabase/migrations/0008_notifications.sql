-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0008 notifications (in-app notification center)
-- A single `notifications` table fed by DB triggers on the source tables, so a
-- notification fires no matter which code path made the change (backend service
-- OR a direct RLS write OR the completion RPC). Each row stores a `type`, the
-- `actor` who triggered it, and optional proposal/conversation links; the UI
-- renders localized text from the type + actor (spec §3.7). Triggers:
--   • swap_proposals INSERT  → recipient gets `proposal_received`
--   • swap_proposals UPDATE  → the other party gets a state-change notice
--                              (completed → BOTH parties)
--   • messages INSERT        → the other participant gets `new_message`
--                              (unread chat notices collapse to one/conversation)
--   • follows INSERT         → the followed user gets `new_follower`
--   • ratings INSERT         → the ratee gets `new_rating`
--
-- The trigger functions are SECURITY DEFINER on purpose: follows (and others) can
-- be written directly by `authenticated` (web falls back to a direct Supabase
-- write when the API isn't configured), and the notification INSERT must still
-- succeed under that role. They only ever insert a notification DERIVED from the
-- source row, so there is nothing to forge. Reads + mark-as-read go directly via
-- RLS (owner-only), mirroring how messages.is_read already works.
--
-- Run after 0007. Purely ADDITIVE + idempotent.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,   -- recipient
  type            text not null check (type in (
                    'proposal_received','proposal_countered','proposal_accepted',
                    'proposal_cancelled','swap_confirm_pending','swap_completed',
                    'swap_disputed','new_message','new_follower','new_rating')),
  actor_id        uuid references public.profiles(id) on delete set null,           -- who triggered it
  proposal_id     uuid references public.swap_proposals(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists notifications_user_idx        on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx  on public.notifications(user_id) where is_read = false;
-- Collapse repeated UNREAD chat-message notices into one row per conversation so
-- the bell isn't flooded by a busy thread (the inbox already shows per-message counts).
create unique index if not exists notifications_unread_message_uq
  on public.notifications(user_id, conversation_id)
  where type = 'new_message' and is_read = false;

-- ── RLS — recipients read + mark their own read; inserts come from the triggers
-- below (SECURITY DEFINER); admins may manage. No INSERT policy for authenticated. ──
alter table public.notifications enable row level security;

drop policy if exists "notifications read own" on public.notifications;
create policy "notifications read own" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications admin manage" on public.notifications;
create policy "notifications admin manage" on public.notifications
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ── swap_proposals INSERT → notify the recipient (a new proposal arrived) ──────
create or replace function public.notify_proposal_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, actor_id, proposal_id, conversation_id)
  values (new.recipient_id, 'proposal_received', new.proposer_id, new.id, new.conversation_id);
  return null;
end;
$$;
drop trigger if exists notify_proposal_created on public.swap_proposals;
create trigger notify_proposal_created after insert on public.swap_proposals
  for each row execute function public.notify_proposal_created();

-- ── swap_proposals UPDATE → notify the other party on a status change ──────────
-- (completed notifies BOTH parties). The actor is last_actor_id; the recipient is
-- whichever party is NOT the actor.
create or replace function public.notify_proposal_updated()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_other uuid;
  v_type  text;
begin
  if new.status is not distinct from old.status then
    return null;
  end if;

  if new.status = 'completed' then
    -- Each party's notification names the OTHER party (actor = the counterparty),
    -- NOT last_actor_id — otherwise the second confirmer would see their own name.
    insert into public.notifications (user_id, type, actor_id, proposal_id, conversation_id)
    values (new.proposer_id,  'swap_completed', new.recipient_id, new.id, new.conversation_id),
           (new.recipient_id, 'swap_completed', new.proposer_id,  new.id, new.conversation_id);
    return null;
  end if;

  v_type := case new.status
    when 'countered'             then 'proposal_countered'
    when 'agreed'                then 'proposal_accepted'
    when 'awaiting_confirmation' then 'swap_confirm_pending'
    when 'disputed'              then 'swap_disputed'
    when 'cancelled'             then 'proposal_cancelled'
    else null
  end;
  if v_type is null then
    return null;
  end if;

  v_other := case when new.last_actor_id = new.proposer_id
                  then new.recipient_id else new.proposer_id end;
  insert into public.notifications (user_id, type, actor_id, proposal_id, conversation_id)
  values (v_other, v_type, new.last_actor_id, new.id, new.conversation_id);
  return null;
end;
$$;
drop trigger if exists notify_proposal_updated on public.swap_proposals;
create trigger notify_proposal_updated after update on public.swap_proposals
  for each row execute function public.notify_proposal_updated();

-- ── messages INSERT → notify the other participant(s); collapse unread per convo ──
create or replace function public.notify_message_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, actor_id, conversation_id)
  select cp.user_id, 'new_message', new.sender_id, new.conversation_id
    from public.conversation_participants cp
   where cp.conversation_id = new.conversation_id
     and cp.user_id <> new.sender_id
  on conflict (user_id, conversation_id) where (type = 'new_message' and is_read = false)
    do update set actor_id = excluded.actor_id, created_at = now();
  return null;
end;
$$;
drop trigger if exists notify_message_created on public.messages;
create trigger notify_message_created after insert on public.messages
  for each row execute function public.notify_message_created();

-- ── follows INSERT → notify the followed user ──────────────────────────────────
create or replace function public.notify_follow_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, actor_id)
  values (new.following_id, 'new_follower', new.follower_id);
  return null;
end;
$$;
drop trigger if exists notify_follow_created on public.follows;
create trigger notify_follow_created after insert on public.follows
  for each row execute function public.notify_follow_created();

-- ── ratings INSERT → notify the ratee (someone reviewed their swap) ────────────
create or replace function public.notify_rating_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_conv uuid;
begin
  select conversation_id into v_conv from public.swap_proposals where id = new.proposal_id;
  insert into public.notifications (user_id, type, actor_id, proposal_id, conversation_id)
  values (new.ratee_id, 'new_rating', new.rater_id, new.proposal_id, v_conv);
  return null;
end;
$$;
drop trigger if exists notify_rating_created on public.ratings;
create trigger notify_rating_created after insert on public.ratings
  for each row execute function public.notify_rating_created();

-- ── Realtime: the bell subscribes to its own notifications (a real consumer) ──
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
