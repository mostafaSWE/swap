-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0007 ratings (post-swap reviews)
-- After a swap COMPLETES (0006), either party may leave the other a 1–5 star
-- rating + optional review text (spec §3.4 / §3.6 / §3.9). Ratings are opt-in
-- and the text is optional. Each rating keeps the RATEE's denormalised trust
-- signals on `profiles` in sync: `rating` (the average — the spec's storage)
-- and the new `ratings_count`. Those two columns are written ONLY by the trigger
-- below — never by hand and never by an admin (mirrors completed_swaps_count).
--
-- Run after 0006. Purely ADDITIVE + idempotent (create-if-not-exists /
-- create-or-replace / drop-policy-if-exists / add-column-if-not-exists), so it
-- can be applied on its own to an existing database without a full reset.
-- ════════════════════════════════════════════════════════════════════════

-- profiles.ratings_count — companion to the existing profiles.rating (avg).
alter table public.profiles
  add column if not exists ratings_count int not null default 0;

-- ── ratings (one row per rater per completed swap) ─────────────────────────
create table if not exists public.ratings (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.swap_proposals(id) on delete cascade,
  rater_id    uuid not null references public.profiles(id) on delete cascade,  -- who left it
  ratee_id    uuid not null references public.profiles(id) on delete cascade,  -- the other party
  stars       int  not null check (stars between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- One rating per rater per swap; re-rating is an UPDATE, not a second row.
  unique (proposal_id, rater_id),
  -- You can never rate yourself (the backend derives ratee = the OTHER party).
  check (rater_id <> ratee_id)
);
create index if not exists ratings_ratee_idx on public.ratings(ratee_id);

drop trigger if exists ratings_set_updated_at on public.ratings;
create trigger ratings_set_updated_at before update on public.ratings
  for each row execute function public.set_updated_at();

-- ── RLS — ratings are PUBLIC reviews (readable by anyone, like reviews on a
-- profile). All WRITES go through the backend (service role), which validates
-- the swap is completed + the caller is a participant. Admins may manage. ─────
alter table public.ratings enable row level security;

drop policy if exists "ratings readable" on public.ratings;
create policy "ratings readable" on public.ratings for select using (true);

drop policy if exists "ratings admin manage" on public.ratings;
create policy "ratings admin manage" on public.ratings
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ── Keep profiles.rating (avg, rounded to 1dp) + profiles.ratings_count in sync.
-- Recompute from the source rows on every change so the aggregate can never drift
-- (handles insert, re-rate/update, and delete — incl. cascade when a swap or user
-- is removed). 0 ratings ⇒ rating = null, ratings_count = 0. ───────────────────
create or replace function public.recompute_user_rating(p_user_id uuid)
returns void language plpgsql as $$
begin
  update public.profiles p
     set rating = sub.avg_stars,
         ratings_count = sub.cnt
    from (
      select round(avg(stars)::numeric, 1) as avg_stars, count(*)::int as cnt
        from public.ratings
       where ratee_id = p_user_id
    ) sub
   where p.id = p_user_id;
end;
$$;

create or replace function public.sync_rating_aggregate()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'DELETE') then
    perform public.recompute_user_rating(old.ratee_id);
    return null;
  end if;
  perform public.recompute_user_rating(new.ratee_id);
  -- ratee_id is immutable in practice, but recompute the old target too if it ever changes.
  if (tg_op = 'UPDATE' and old.ratee_id <> new.ratee_id) then
    perform public.recompute_user_rating(old.ratee_id);
  end if;
  return null;
end;
$$;

drop trigger if exists ratings_sync_aggregate on public.ratings;
create trigger ratings_sync_aggregate
  after insert or update or delete on public.ratings
  for each row execute function public.sync_rating_aggregate();

-- NOTE: ratings are intentionally NOT added to the supabase_realtime publication.
-- The UI updates the rater's own rating optimistically from the rate() API response,
-- and profile reviews + badges load server-side — there is no live subscriber, so
-- publishing would only add replication overhead (unlike swap_proposals/messages,
-- which have real subscribers).
