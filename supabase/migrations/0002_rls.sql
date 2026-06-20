-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0002 Row Level Security
-- Run after 0001_schema.sql.
--
-- Model:
--   • Reference data (countries/cities/categories) is world-readable; only
--     admins write it.
--   • Listings: anyone can read ACTIVE listings; owners manage their own;
--     admins manage all.
--   • Profiles: public-safe read for everyone; users update only their own.
--   • Conversations/messages: participants only. Cannot message yourself.
--   • Reports: any authenticated user can file; admins read/manage.
-- ════════════════════════════════════════════════════════════════════════

alter table public.countries              enable row level security;
alter table public.cities                 enable row level security;
alter table public.categories             enable row level security;
alter table public.profiles               enable row level security;
alter table public.listings               enable row level security;
alter table public.listing_images         enable row level security;
alter table public.conversations          enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages               enable row level security;
alter table public.follows                enable row level security;
alter table public.reports                enable row level security;
alter table public.saved_listings         enable row level security;
alter table public.listing_views          enable row level security;
alter table public.admin_actions          enable row level security;

-- ── Reference data: public read, admin write ────────────────────────────
drop policy if exists "countries readable" on public.countries;
create policy "countries readable" on public.countries  for select using (true);
drop policy if exists "cities readable" on public.cities;
create policy "cities readable" on public.cities      for select using (true);
drop policy if exists "categories readable" on public.categories;
create policy "categories readable" on public.categories  for select using (true);

drop policy if exists "countries admin write" on public.countries;
create policy "countries admin write" on public.countries
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "cities admin write" on public.cities;
create policy "cities admin write" on public.cities
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ── profiles ────────────────────────────────────────────────────────────
-- Public read is allowed. The app/api layer only SELECTs public-safe columns
-- for other users (see PublicProfile). Sensitive columns (email/phone) should
-- be requested only for your own row.
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles
  for select using (true);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles admin manage" on public.profiles;
create policy "profiles admin manage" on public.profiles
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
-- INSERT is handled by the handle_new_user() trigger (security definer); users
-- do not insert their own profile directly.

-- ── listings ────────────────────────────────────────────────────────────
drop policy if exists "listings public read active" on public.listings;
create policy "listings public read active" on public.listings
  for select using (
    status = 'active'
    or owner_id = auth.uid()
    or public.is_admin(auth.uid())
  );

drop policy if exists "listings insert own" on public.listings;
create policy "listings insert own" on public.listings
  for insert with check (owner_id = auth.uid());

drop policy if exists "listings update own" on public.listings;
create policy "listings update own" on public.listings
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "listings delete own" on public.listings;
create policy "listings delete own" on public.listings
  for delete using (owner_id = auth.uid());

drop policy if exists "listings admin manage" on public.listings;
create policy "listings admin manage" on public.listings
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ── listing_images ──────────────────────────────────────────────────────
drop policy if exists "listing_images read" on public.listing_images;
create policy "listing_images read" on public.listing_images
  for select using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'active' or l.owner_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );

drop policy if exists "listing_images write own" on public.listing_images;
create policy "listing_images write own" on public.listing_images
  for all using (
    exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())
  );

-- ── conversations & participants ────────────────────────────────────────
drop policy if exists "conversations read if participant" on public.conversations;
create policy "conversations read if participant" on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );
-- INSERT happens via get_or_create_conversation() (security definer).

drop policy if exists "participants read own rows" on public.conversation_participants;
create policy "participants read own rows" on public.conversation_participants
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = conversation_participants.conversation_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

-- ── messages ────────────────────────────────────────────────────────────
drop policy if exists "messages read if participant" on public.messages;
create policy "messages read if participant" on public.messages
  for select using (
    exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = messages.conversation_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())  -- admins only review when a report exists (enforced in app)
  );

drop policy if exists "messages send if participant" on public.messages;
create policy "messages send if participant" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = messages.conversation_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "messages update read flag" on public.messages;
create policy "messages update read flag" on public.messages
  for update using (
    exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = messages.conversation_id and p.user_id = auth.uid()
    )
  );

-- ── follows ─────────────────────────────────────────────────────────────
drop policy if exists "follows readable" on public.follows;
create policy "follows readable" on public.follows for select using (true);
drop policy if exists "follows insert own" on public.follows;
create policy "follows insert own" on public.follows
  for insert with check (follower_id = auth.uid());
drop policy if exists "follows delete own" on public.follows;
create policy "follows delete own" on public.follows
  for delete using (follower_id = auth.uid());

-- ── reports ─────────────────────────────────────────────────────────────
drop policy if exists "reports insert own" on public.reports;
create policy "reports insert own" on public.reports
  for insert with check (reporter_id = auth.uid());
drop policy if exists "reports read own or admin" on public.reports;
create policy "reports read own or admin" on public.reports
  for select using (reporter_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists "reports admin manage" on public.reports;
create policy "reports admin manage" on public.reports
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ── saved_listings ──────────────────────────────────────────────────────
drop policy if exists "saved read own" on public.saved_listings;
create policy "saved read own" on public.saved_listings
  for select using (user_id = auth.uid());
drop policy if exists "saved insert own" on public.saved_listings;
create policy "saved insert own" on public.saved_listings
  for insert with check (user_id = auth.uid());
drop policy if exists "saved delete own" on public.saved_listings;
create policy "saved delete own" on public.saved_listings
  for delete using (user_id = auth.uid());

-- ── listing_views ───────────────────────────────────────────────────────
drop policy if exists "views insert anyone" on public.listing_views;
create policy "views insert anyone" on public.listing_views
  for insert with check (user_id is null or user_id = auth.uid());
drop policy if exists "views read admin" on public.listing_views;
create policy "views read admin" on public.listing_views
  for select using (public.is_admin(auth.uid()));

-- ── admin_actions ───────────────────────────────────────────────────────
drop policy if exists "admin_actions admin only" on public.admin_actions;
create policy "admin_actions admin only" on public.admin_actions
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
