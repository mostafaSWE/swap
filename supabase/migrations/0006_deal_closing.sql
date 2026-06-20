-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0006 deal closing (the swap completes)
-- Adds the confirmation step that turns an `agreed` proposal into a `completed`
-- one. Each party uploads a photo of the item THEY received; when both have,
-- the swap completes and each party's completed_swaps_count is incremented
-- (the trust signal — only ever set here, never by an admin). Run after 0005.
--
-- Status transitions this migration enables (the service drives them):
--   agreed → awaiting_confirmation   (first party confirms)
--   awaiting_confirmation → completed (second party confirms)
--   agreed | awaiting_confirmation → disputed  (either party flags a problem)
--   agreed | awaiting_confirmation → cancelled (either party withdraws)
--
-- This file is purely ADDITIVE + idempotent (create-if-not-exists /
-- create-or-replace / drop-policy-if-exists), so it can be applied on its own
-- to an existing database without a full reset.
-- ════════════════════════════════════════════════════════════════════════

-- ── swap_confirmations (one row per party) ─────────────────────────────────
create table if not exists public.swap_confirmations (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.swap_proposals(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,   -- the uploader
  photo_path  text not null,                                                    -- {proposal_id}/{user_id}.{ext} in swap-confirmations
  created_at  timestamptz not null default now(),
  unique (proposal_id, user_id)
);
create index if not exists swap_confirmations_proposal_idx on public.swap_confirmations(proposal_id);

-- ── RLS — both parties (+ admins) may read; all writes go through the backend
-- (service role), which owns the state machine. Idempotent (drop-if-exists). ──
alter table public.swap_confirmations enable row level security;

drop policy if exists "confirmations read if party" on public.swap_confirmations;
create policy "confirmations read if party" on public.swap_confirmations
  for select using (
    exists (
      select 1 from public.swap_proposals p
      where p.id = swap_confirmations.proposal_id
        and (p.proposer_id = auth.uid() or p.recipient_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );

drop policy if exists "confirmations admin manage" on public.swap_confirmations;
create policy "confirmations admin manage" on public.swap_confirmations
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ── record_swap_confirmation: atomic confirm + (when both done) complete ────
-- Locks the proposal row (FOR UPDATE) so two parties confirming concurrently
-- can't both observe a single-confirmation count and leave the swap stranded
-- in `awaiting_confirmation`. Returns the resulting proposal status.
create or replace function public.record_swap_confirmation(
  p_proposal_id uuid,
  p_user_id     uuid,
  p_photo_path  text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status    text;
  v_proposer  uuid;
  v_recipient uuid;
  v_count     int;
begin
  select status, proposer_id, recipient_id
    into v_status, v_proposer, v_recipient
    from public.swap_proposals
   where id = p_proposal_id
   for update;

  if v_status is null then
    raise exception 'proposal not found' using errcode = 'no_data_found';
  end if;
  if p_user_id <> v_proposer and p_user_id <> v_recipient then
    raise exception 'not a participant' using errcode = 'insufficient_privilege';
  end if;
  if v_status not in ('agreed', 'awaiting_confirmation') then
    raise exception 'cannot confirm a % proposal', v_status using errcode = 'check_violation';
  end if;

  insert into public.swap_confirmations (proposal_id, user_id, photo_path)
  values (p_proposal_id, p_user_id, p_photo_path)
  on conflict (proposal_id, user_id)
    do update set photo_path = excluded.photo_path, created_at = now();

  select count(*) into v_count from public.swap_confirmations where proposal_id = p_proposal_id;

  if v_count >= 2 then
    update public.swap_proposals
       set status = 'completed', last_actor_id = p_user_id
     where id = p_proposal_id;
    -- The ONLY place completed_swaps_count changes: +1 per party on completion.
    update public.profiles
       set completed_swaps_count = completed_swaps_count + 1
     where id in (v_proposer, v_recipient);
    return 'completed';
  end if;

  update public.swap_proposals
     set status = 'awaiting_confirmation', last_actor_id = p_user_id
   where id = p_proposal_id;
  return 'awaiting_confirmation';
end;
$$;

-- Lock the mutating RPC to the backend (service role) only. It is SECURITY
-- DEFINER and trusts its p_user_id argument, so it must NOT be directly callable
-- by anon/authenticated — otherwise a user could pass the OTHER party's id and
-- forge their confirmation, force-completing a swap and inflating swap counts.
revoke all on function public.record_swap_confirmation(uuid, uuid, text) from public;
revoke all on function public.record_swap_confirmation(uuid, uuid, text) from anon, authenticated;
grant execute on function public.record_swap_confirmation(uuid, uuid, text) to service_role;

-- ════════════════════════════════════════════════════════════════════════
-- Storage — swap-confirmations bucket (private). Path: {proposal_id}/{user_id}.{ext}
-- so the first path segment is the proposal id. Both parties + admins may read;
-- writes happen through backend-signed upload URLs (service role).
-- ════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('swap-confirmations', 'swap-confirmations', false)
on conflict (id) do nothing;

drop policy if exists "swap-confirmations participant read" on storage.objects;
create policy "swap-confirmations participant read" on storage.objects
  for select using (
    bucket_id = 'swap-confirmations'
    and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.swap_proposals p
        where p.id::text = (storage.foldername(name))[1]
          and (p.proposer_id = auth.uid() or p.recipient_id = auth.uid())
      )
    )
  );

drop policy if exists "swap-confirmations participant write" on storage.objects;
create policy "swap-confirmations participant write" on storage.objects
  for insert with check (
    bucket_id = 'swap-confirmations'
    and exists (
      select 1 from public.swap_proposals p
      where p.id::text = (storage.foldername(name))[1]
        and (p.proposer_id = auth.uid() or p.recipient_id = auth.uid())
    )
  );

-- ── Realtime: stream confirmation inserts to participants (if the publication exists) ──
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.swap_confirmations;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
