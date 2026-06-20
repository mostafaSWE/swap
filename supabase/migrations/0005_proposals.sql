-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0005 swap proposals (the core barter mechanic)
-- Adds swap_proposals + swap_proposal_items, links conversations to a
-- proposal, RLS, indexes, and the updated_at trigger. Run after 0001–0004.
--
-- A proposal: the PROPOSER offers 1..n of THEIR listings (swap_proposal_items)
-- in exchange for ONE target listing (listing_id, owned by the RECIPIENT).
--
-- Status lifecycle (text + CHECK, matching the rest of the schema):
--   pending → countered → agreed → awaiting_confirmation
--           → completed | disputed | cancelled
-- (awaiting_confirmation/completed/disputed are reserved for the later
--  deal-closing flow; this migration ships the negotiation states.)
-- ════════════════════════════════════════════════════════════════════════

-- ── swap_proposals ────────────────────────────────────────────────────────
create table if not exists public.swap_proposals (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings(id) on delete cascade,   -- target (recipient's item)
  proposer_id     uuid not null references public.profiles(id) on delete cascade,   -- User A (makes the offer)
  recipient_id    uuid not null references public.profiles(id) on delete cascade,   -- User B (owns the target)
  conversation_id uuid references public.conversations(id) on delete set null,
  status          text not null default 'pending'
                    check (status in ('pending','countered','agreed','awaiting_confirmation','completed','disputed','cancelled')),
  note            text,
  last_actor_id   uuid not null references public.profiles(id) on delete cascade,   -- who moved last (turn logic)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (proposer_id <> recipient_id)
);
create index if not exists swap_proposals_proposer_idx     on public.swap_proposals(proposer_id);
create index if not exists swap_proposals_recipient_idx    on public.swap_proposals(recipient_id);
create index if not exists swap_proposals_listing_idx      on public.swap_proposals(listing_id);
create index if not exists swap_proposals_conversation_idx on public.swap_proposals(conversation_id);
create index if not exists swap_proposals_status_idx       on public.swap_proposals(status);
create index if not exists swap_proposals_updated_idx      on public.swap_proposals(updated_at desc);
-- DB backstop for "one active proposal per (proposer, target listing)": the
-- service-side SELECT guard is racy and the service-role client bypasses RLS.
create unique index if not exists swap_proposals_one_active_per_target
  on public.swap_proposals (proposer_id, listing_id)
  where status in ('pending','countered','agreed','awaiting_confirmation');
drop trigger if exists swap_proposals_set_updated_at on public.swap_proposals;
create trigger swap_proposals_set_updated_at before update on public.swap_proposals
  for each row execute function public.set_updated_at();

-- ── swap_proposal_items (the proposer's offered listings — supports bundles) ──
create table if not exists public.swap_proposal_items (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.swap_proposals(id) on delete cascade,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (proposal_id, listing_id)
);
create index if not exists swap_proposal_items_proposal_idx on public.swap_proposal_items(proposal_id);
create index if not exists swap_proposal_items_listing_idx  on public.swap_proposal_items(listing_id);

-- ── conversations ↔ proposal link (spec §3.5: a conversation is tied to a proposal) ──
-- Nullable so existing chat-only conversations keep working.
alter table public.conversations
  add column if not exists proposal_id uuid references public.swap_proposals(id) on delete set null;
create index if not exists conversations_proposal_idx on public.conversations(proposal_id);

-- ════════════════════════════════════════════════════════════════════════
-- RLS — only the two parties (proposer/recipient) + admins may read. All
-- writes go through the backend API (service role), which owns the state
-- machine and per-column transition rules; these row-scoped policies are
-- defense-in-depth for any future direct PostgREST access. Idempotent
-- (drop-if-exists) so the file is safe to re-run in dev.
-- ════════════════════════════════════════════════════════════════════════
alter table public.swap_proposals      enable row level security;
alter table public.swap_proposal_items enable row level security;

drop policy if exists "proposals read if party" on public.swap_proposals;
create policy "proposals read if party" on public.swap_proposals
  for select using (
    proposer_id = auth.uid()
    or recipient_id = auth.uid()
    or public.is_admin(auth.uid())
  );

drop policy if exists "proposals insert own" on public.swap_proposals;
create policy "proposals insert own" on public.swap_proposals
  for insert with check (proposer_id = auth.uid() and last_actor_id = auth.uid());

drop policy if exists "proposals update if party" on public.swap_proposals;
create policy "proposals update if party" on public.swap_proposals
  for update using (proposer_id = auth.uid() or recipient_id = auth.uid())
  with check ((proposer_id = auth.uid() or recipient_id = auth.uid()) and last_actor_id = auth.uid());

drop policy if exists "proposals admin manage" on public.swap_proposals;
create policy "proposals admin manage" on public.swap_proposals
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "proposal_items read if party" on public.swap_proposal_items;
create policy "proposal_items read if party" on public.swap_proposal_items
  for select using (
    exists (
      select 1 from public.swap_proposals p
      where p.id = swap_proposal_items.proposal_id
        and (p.proposer_id = auth.uid() or p.recipient_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );

drop policy if exists "proposal_items write if proposer" on public.swap_proposal_items;
create policy "proposal_items write if proposer" on public.swap_proposal_items
  for all using (
    exists (
      select 1 from public.swap_proposals p
      where p.id = swap_proposal_items.proposal_id and p.proposer_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.swap_proposals p
      where p.id = swap_proposal_items.proposal_id and p.proposer_id = auth.uid()
    )
  );

-- ── Realtime: stream proposal status changes to participants (if the publication exists) ──
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.swap_proposals;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
