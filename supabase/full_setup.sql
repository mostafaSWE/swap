-- ════════════════════════════════════════════════════════════════════════
-- Swap — FULL SETUP (generated): migrations 0001-0005 + seed, in order.
-- Paste this whole file into the Supabase SQL Editor and Run once.
-- Idempotent: safe to re-run. Demo password: Swap1234! (dev only).
-- ════════════════════════════════════════════════════════════════════════


-- ░░░░░░░░░░░░░░░░░░░░ migrations/0001_schema.sql ░░░░░░░░░░░░░░░░░░░░

-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0001 schema
-- Tables, constraints, indexes, triggers, and helper functions.
-- Run order: 0001_schema → 0002_rls → 0003_storage → seed.sql
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ── updated_at helper ───────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── countries ───────────────────────────────────────────────────────────
create table if not exists public.countries (
  id            uuid primary key default gen_random_uuid(),
  name_ar       text not null,
  name_en       text not null,
  iso_code      text not null unique,
  phone_code    text not null,
  currency_code text not null,      -- for FUTURE premium pricing (no payment now)
  timezone      text not null,
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- ── cities ──────────────────────────────────────────────────────────────
create table if not exists public.cities (
  id          uuid primary key default gen_random_uuid(),
  country_id  uuid not null references public.countries(id) on delete cascade,
  name_ar     text not null,
  name_en     text not null,
  slug        text not null,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (country_id, slug)
);
create index if not exists cities_country_idx on public.cities(country_id);

-- ── categories ──────────────────────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name_ar     text not null,
  name_en     text not null,
  slug        text not null unique,
  icon        text not null default 'other',
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── profiles (1:1 with auth.users) ──────────────────────────────────────
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  full_name          text not null default '',
  username           text not null unique,
  email              text,
  phone              text,                         -- stored with country code, e.g. +9665…
  country_id         uuid references public.countries(id),
  city_id            uuid references public.cities(id),
  avatar_url         text,
  bio                text,
  preferred_language text not null default 'ar' check (preferred_language in ('ar','en')),
  is_admin           boolean not null default false,
  is_suspended       boolean not null default false,
  -- moderation (0010): permanent ban + temporary-suspension window + reason.
  is_banned          boolean not null default false,
  suspended_until    timestamptz,
  suspension_reason  text,
  followers_count    int not null default 0,
  following_count    int not null default 0,
  listings_count     int not null default 0,
  -- trust signal: completed, undisputed swaps (each party +1 when a swap completes).
  -- Swap does not verify identity, so this replaces any "verified account" concept.
  completed_swaps_count int not null default 0,
  -- post-swap reputation (maintained by the ratings trigger, never by hand — see 0007).
  rating             numeric(2,1),
  ratings_count      int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── listings ────────────────────────────────────────────────────────────
create table if not exists public.listings (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles(id) on delete cascade,
  category_id      uuid not null references public.categories(id),
  country_id       uuid not null references public.countries(id),
  city_id          uuid not null references public.cities(id),
  title            text not null,
  description      text not null default '',
  condition        text not null check (condition in ('new','used')),
  wanted_exchange  text not null default '',  -- what the owner wants in exchange
  status           text not null default 'active' check (status in ('active','hidden','removed','completed')),
  is_featured      boolean not null default false,  -- featured ad (paid later)
  view_count       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists listings_status_idx   on public.listings(status);
create index if not exists listings_owner_idx     on public.listings(owner_id);
create index if not exists listings_category_idx  on public.listings(category_id);
create index if not exists listings_country_idx   on public.listings(country_id);
create index if not exists listings_city_idx      on public.listings(city_id);
create index if not exists listings_created_idx   on public.listings(created_at desc);
drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at before update on public.listings
  for each row execute function public.set_updated_at();

-- ── listing_images ──────────────────────────────────────────────────────
create table if not exists public.listing_images (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  image_url  text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists listing_images_listing_idx on public.listing_images(listing_id);
-- NOTE: free plan = max 4 images/listing. Enforced in the app + (optionally) a trigger.
-- TODO (Phase 2 — premium): raise to 10–15 for paid plans.

-- ── conversations ───────────────────────────────────────────────────────
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();

-- ── conversation_participants ───────────────────────────────────────────
create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conv_participants_user_idx on public.conversation_participants(user_id);

-- ── messages ────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null default '',
  image_url       text,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);

-- ── follows ─────────────────────────────────────────────────────────────
create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- ── reports ─────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('listing','user','message','conversation')),
  target_id   uuid not null,
  reason      text not null,
  description text,
  status      text not null default 'pending' check (status in ('pending','reviewed','resolved','rejected')),
  created_at  timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports(status);

-- ── saved_listings ──────────────────────────────────────────────────────
create table if not exists public.saved_listings (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ── listing_views ───────────────────────────────────────────────────────
create table if not exists public.listing_views (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete set null,
  ip_hash    text,
  created_at timestamptz not null default now()
);
create index if not exists listing_views_listing_idx on public.listing_views(listing_id);

-- ── admin_actions (audit log) ───────────────────────────────────────────
create table if not exists public.admin_actions (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references public.profiles(id) on delete cascade,
  action_type text not null,
  target_type text not null,
  target_id   uuid not null,
  notes       text,
  ip          text,                  -- actor IP at action time (spec §4.1)
  created_at  timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════
-- Denormalised counters maintained by triggers
-- ════════════════════════════════════════════════════════════════════════

-- follows → followers_count / following_count
create or replace function public.sync_follow_counts()
returns trigger language plpgsql as $$
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
drop trigger if exists follows_sync_counts on public.follows;
create trigger follows_sync_counts
  after insert or delete on public.follows
  for each row execute function public.sync_follow_counts();

-- listings → owner listings_count (active/hidden/completed count toward total; removed does not)
create or replace function public.sync_listing_counts()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles set listings_count = listings_count + 1 where id = new.owner_id;
  elsif (tg_op = 'DELETE') then
    update public.profiles set listings_count = greatest(listings_count - 1, 0) where id = old.owner_id;
  end if;
  return null;
end;
$$;
drop trigger if exists listings_sync_counts on public.listings;
create trigger listings_sync_counts
  after insert or delete on public.listings
  for each row execute function public.sync_listing_counts();

-- listing_views → listings.view_count
create or replace function public.bump_listing_view_count()
returns trigger language plpgsql as $$
begin
  update public.listings set view_count = view_count + 1 where id = new.listing_id;
  return null;
end;
$$;
drop trigger if exists listing_views_bump on public.listing_views;
create trigger listing_views_bump
  after insert on public.listing_views
  for each row execute function public.bump_listing_view_count();

-- ════════════════════════════════════════════════════════════════════════
-- New auth user → create a profile row automatically
-- Username/full_name/etc. come from auth metadata set at sign-up.
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, username, phone, preferred_language)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'preferred_language', 'ar')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════════════
-- get_or_create_conversation(other_user_id, p_listing_id)
-- Returns a 1:1 conversation between the caller and other_user, creating it
-- (with both participant rows) if needed. Enforces "cannot message yourself".
-- ════════════════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════════════════
-- is_admin(uid) — helper used by RLS policies
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

-- ░░░░░░░░░░░░░░░░░░░░ migrations/0002_rls.sql ░░░░░░░░░░░░░░░░░░░░

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
create or replace function public.is_conversation_participant(conversation_id uuid, user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = $1 and user_id = $2
  );
$$;

drop policy if exists "conversations read if participant" on public.conversations;
create policy "conversations read if participant" on public.conversations
  for select using (
    public.is_conversation_participant(id, auth.uid())
    or public.is_admin(auth.uid())
  );
-- INSERT happens via get_or_create_conversation() (security definer).

drop policy if exists "participants read own rows" on public.conversation_participants;
create policy "participants read own rows" on public.conversation_participants
  for select using (
    user_id = auth.uid()
    or public.is_conversation_participant(conversation_id, auth.uid())
    or public.is_admin(auth.uid())
  );

-- ── messages ────────────────────────────────────────────────────────────
drop policy if exists "messages read if participant" on public.messages;
create policy "messages read if participant" on public.messages
  for select using (
    public.is_conversation_participant(conversation_id, auth.uid())
    or public.is_admin(auth.uid())  -- admins only review when a report exists (enforced in app)
  );

drop policy if exists "messages send if participant" on public.messages;
create policy "messages send if participant" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id, auth.uid())
  );

drop policy if exists "messages update read flag" on public.messages;
create policy "messages update read flag" on public.messages
  for update using (
    public.is_conversation_participant(conversation_id, auth.uid())
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

-- ── realtime publications ────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- ░░░░░░░░░░░░░░░░░░░░ migrations/0003_storage.sql ░░░░░░░░░░░░░░░░░░░░

-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0003 storage buckets & policies
-- Run after 0002_rls.sql.
--
-- Buckets:
--   avatars         public read,  owner-write (path: {user_id}/...)
--   listing-images  public read,  owner-write (path: {user_id}/{listing_id}/...)
--   chat-images     private,      participant-read (MVP: owner-write only)
-- ════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values
  ('avatars',        'avatars',        true),
  ('listing-images', 'listing-images', true),
  ('chat-images',    'chat-images',    false)
on conflict (id) do nothing;

-- Server-side caps (defense-in-depth; clients also validate). Images only, ≤5 MB.
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id in ('avatars', 'listing-images', 'chat-images');

-- Convention: the first path segment is the uploader's user id, e.g.
--   avatars/{auth.uid}/avatar.jpg
--   listing-images/{auth.uid}/{listing_id}/0.jpg
--   chat-images/{auth.uid}/{conversation_id}/0.jpg
-- so we authorise writes by comparing (storage.foldername(name))[1] to auth.uid().

-- ── avatars ─────────────────────────────────────────────────────────────
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars owner write" on storage.objects;
create policy "avatars owner write" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── listing-images ──────────────────────────────────────────────────────
drop policy if exists "listing-images public read" on storage.objects;
create policy "listing-images public read" on storage.objects
  for select using (bucket_id = 'listing-images');

drop policy if exists "listing-images owner write" on storage.objects;
create policy "listing-images owner write" on storage.objects
  for insert with check (
    bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "listing-images owner update" on storage.objects;
create policy "listing-images owner update" on storage.objects
  for update using (
    bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "listing-images owner delete" on storage.objects;
create policy "listing-images owner delete" on storage.objects
  for delete using (
    bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── chat-images (private) ───────────────────────────────────────────────
-- Write/delete: only the uploader, under their own {auth.uid}/ folder.
-- Read: ANY participant of the conversation. Path is {auth.uid}/{conversation_id}/…
-- so segment [2] is the conversation id — join conversation_participants on it.
drop policy if exists "chat-images owner read" on storage.objects;
drop policy if exists "chat-images participant read" on storage.objects;
create policy "chat-images participant read" on storage.objects
  for select using (
    bucket_id = 'chat-images'
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id::text = (storage.foldername(name))[2]
        and cp.user_id = auth.uid()
    )
  );
drop policy if exists "chat-images owner write" on storage.objects;
create policy "chat-images owner write" on storage.objects
  for insert with check (
    bucket_id = 'chat-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "chat-images owner delete" on storage.objects;
create policy "chat-images owner delete" on storage.objects
  for delete using (
    bucket_id = 'chat-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ░░░░░░░░░░░░░░░░░░░░ migrations/0004_catalog_expansion.sql ░░░░░░░░░░░░░░░░░░░░

-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0004 catalog expansion
-- • categories: add parent/child support + inclusive 26-category taxonomy
--   (+ a few example subcategories), keeping the original Phase-1 UUIDs so
--   existing demo listings keep valid foreign keys.
-- • cities: append a broader curated bilingual GCC city set.
-- Idempotent (ON CONFLICT). Run after 0001-0003, BEFORE seed.sql.
-- Mirrors packages/config (categories.ts / cities.ts).
-- ════════════════════════════════════════════════════════════════════════

-- ── Countries (idempotent) ───────────────────────────────────────────────
-- Seeded here because this migration's city rows reference them via FK and
-- migrations run BEFORE seed.sql. seed.sql re-inserts the same rows as a no-op.
insert into public.countries (id, name_ar, name_en, iso_code, phone_code, currency_code, timezone, sort_order) values
  ('11111111-1111-4111-8111-000000000001','السعودية','Saudi Arabia','SA','+966','SAR','Asia/Riyadh',1),
  ('11111111-1111-4111-8111-000000000002','الإمارات العربية المتحدة','United Arab Emirates','AE','+971','AED','Asia/Dubai',2),
  ('11111111-1111-4111-8111-000000000003','قطر','Qatar','QA','+974','QAR','Asia/Qatar',3),
  ('11111111-1111-4111-8111-000000000004','الكويت','Kuwait','KW','+965','KWD','Asia/Kuwait',4),
  ('11111111-1111-4111-8111-000000000005','البحرين','Bahrain','BH','+973','BHD','Asia/Bahrain',5),
  ('11111111-1111-4111-8111-000000000006','عُمان','Oman','OM','+968','OMR','Asia/Muscat',6)
on conflict (id) do nothing;

-- ── categories.parent_id ─────────────────────────────────────────────────
alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete set null;
create index if not exists categories_parent_idx on public.categories(parent_id);

-- ── Authoritative 26 top-level categories (+ 4 example subcategories) ─────
insert into public.categories (id, parent_id, name_ar, name_en, slug, icon, sort_order) values
  ('33333333-3333-4333-8333-000000000001', null, 'إلكترونيات', 'Electronics', 'electronics', 'electronics', 1),
  ('33333333-3333-4333-8333-000000000010', null, 'جوالات وأجهزة لوحية', 'Mobiles & Tablets', 'mobiles-tablets', 'mobiles', 2),
  ('33333333-3333-4333-8333-000000000011', null, 'كمبيوترات ولابتوبات', 'Computers & Laptops', 'computers-laptops', 'computers', 3),
  ('33333333-3333-4333-8333-000000000012', null, 'ألعاب إلكترونية وأجهزة ألعاب', 'Gaming & Consoles', 'gaming-consoles', 'gaming', 4),
  ('33333333-3333-4333-8333-000000000004', null, 'أجهزة منزلية', 'Home Appliances', 'home-appliances', 'appliances', 5),
  ('33333333-3333-4333-8333-000000000002', null, 'أثاث', 'Furniture', 'furniture', 'furniture', 6),
  ('33333333-3333-4333-8333-000000000013', null, 'المنزل والحديقة', 'Home & Garden', 'home-garden', 'home-garden', 7),
  ('33333333-3333-4333-8333-000000000003', null, 'سيارات', 'Cars', 'cars', 'cars', 8),
  ('33333333-3333-4333-8333-000000000014', null, 'دراجات نارية', 'Motorcycles', 'motorcycles', 'motorcycles', 9),
  ('33333333-3333-4333-8333-000000000015', null, 'قطع غيار وإكسسوارات سيارات', 'Auto Parts & Accessories', 'auto-parts', 'auto-parts', 10),
  ('33333333-3333-4333-8333-000000000005', null, 'أزياء وملابس', 'Fashion', 'fashion', 'fashion', 11),
  ('33333333-3333-4333-8333-000000000006', null, 'ساعات ومجوهرات', 'Watches & Jewelry', 'watches-jewelry', 'watches', 12),
  ('33333333-3333-4333-8333-000000000016', null, 'أطفال ومواليد', 'Baby & Kids', 'baby-kids', 'baby', 13),
  ('33333333-3333-4333-8333-000000000007', null, 'ألعاب', 'Toys & Games', 'toys', 'toys', 14),
  ('33333333-3333-4333-8333-000000000008', null, 'رياضة ولياقة', 'Sports & Fitness', 'sports', 'sports', 15),
  ('33333333-3333-4333-8333-000000000017', null, 'كتب وقرطاسية', 'Books & Stationery', 'books-stationery', 'books', 16),
  ('33333333-3333-4333-8333-000000000018', null, 'أدوات ومعدات', 'Tools & Equipment', 'tools-equipment', 'tools', 17),
  ('33333333-3333-4333-8333-000000000019', null, 'صحة وجمال', 'Health & Beauty', 'health-beauty', 'health', 18),
  ('33333333-3333-4333-8333-000000000020', null, 'حيوانات أليفة ومستلزماتها', 'Pets & Pet Supplies', 'pets', 'pets', 19),
  ('33333333-3333-4333-8333-000000000021', null, 'آلات موسيقية', 'Musical Instruments', 'musical-instruments', 'music', 20),
  ('33333333-3333-4333-8333-000000000022', null, 'كاميرات وتصوير', 'Cameras & Photography', 'cameras-photography', 'cameras', 21),
  ('33333333-3333-4333-8333-000000000023', null, 'مواد ومستلزمات منزلية', 'Home Materials', 'home-materials', 'materials', 22),
  ('33333333-3333-4333-8333-000000000024', null, 'معدات مكتبية وتجارية', 'Office & Business Equipment', 'office-business', 'office', 23),
  ('33333333-3333-4333-8333-000000000025', null, 'مقتنيات وتحف', 'Collectibles & Antiques', 'collectibles-antiques', 'collectibles', 24),
  ('33333333-3333-4333-8333-000000000026', null, 'مفتوح لأي عرض مناسب', 'Open to Any Exchange', 'open-exchange', 'open-exchange', 25),
  ('33333333-3333-4333-8333-000000000009', null, 'أخرى', 'Other', 'other', 'other', 26),
  -- Example subcategories (prove the parent/child model)
  ('33333333-3333-4333-8333-000000000027', '33333333-3333-4333-8333-000000000010', 'آيفون', 'iPhone', 'iphone', 'mobiles', 27),
  ('33333333-3333-4333-8333-000000000028', '33333333-3333-4333-8333-000000000010', 'أندرويد', 'Android Phones', 'android-phones', 'mobiles', 28),
  ('33333333-3333-4333-8333-000000000029', '33333333-3333-4333-8333-000000000012', 'بلايستيشن', 'PlayStation', 'playstation', 'gaming', 29),
  ('33333333-3333-4333-8333-000000000030', '33333333-3333-4333-8333-000000000012', 'إكس بوكس', 'Xbox', 'xbox', 'gaming', 30)
on conflict (id) do update set
  parent_id = excluded.parent_id,
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  slug = excluded.slug,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

update public.categories set is_active = false where slug = 'open-exchange';


-- ── Additional curated GCC cities (IDs 32+; originals 1-31 come from seed) ─
insert into public.cities (id, country_id, name_ar, name_en, slug, sort_order) values
  -- Saudi Arabia
  ('22222222-2222-4222-8222-000000000032','11111111-1111-4111-8111-000000000001','الخرج','Al Kharj','al-kharj',32),
  ('22222222-2222-4222-8222-000000000033','11111111-1111-4111-8111-000000000001','بريدة','Buraidah','buraidah',33),
  ('22222222-2222-4222-8222-000000000034','11111111-1111-4111-8111-000000000001','عنيزة','Unaizah','unaizah',34),
  ('22222222-2222-4222-8222-000000000035','11111111-1111-4111-8111-000000000001','حائل','Hail','hail',35),
  ('22222222-2222-4222-8222-000000000036','11111111-1111-4111-8111-000000000001','تبوك','Tabuk','tabuk',36),
  ('22222222-2222-4222-8222-000000000037','11111111-1111-4111-8111-000000000001','الجبيل','Jubail','jubail',37),
  ('22222222-2222-4222-8222-000000000038','11111111-1111-4111-8111-000000000001','ينبع','Yanbu','yanbu',38),
  ('22222222-2222-4222-8222-000000000039','11111111-1111-4111-8111-000000000001','نجران','Najran','najran',39),
  ('22222222-2222-4222-8222-000000000040','11111111-1111-4111-8111-000000000001','جازان','Jazan','jazan',40),
  ('22222222-2222-4222-8222-000000000041','11111111-1111-4111-8111-000000000001','الأحساء','Al Ahsa','al-ahsa',41),
  ('22222222-2222-4222-8222-000000000042','11111111-1111-4111-8111-000000000001','القطيف','Qatif','qatif',42),
  ('22222222-2222-4222-8222-000000000043','11111111-1111-4111-8111-000000000001','عرعر','Arar','arar',43),
  ('22222222-2222-4222-8222-000000000044','11111111-1111-4111-8111-000000000001','سكاكا','Sakaka','sakaka',44),
  ('22222222-2222-4222-8222-000000000045','11111111-1111-4111-8111-000000000001','الباحة','Al Baha','al-baha',45),
  ('22222222-2222-4222-8222-000000000046','11111111-1111-4111-8111-000000000001','خميس مشيط','Khamis Mushait','khamis-mushait',46),
  ('22222222-2222-4222-8222-000000000047','11111111-1111-4111-8111-000000000001','بيشة','Bisha','bisha',47),
  ('22222222-2222-4222-8222-000000000048','11111111-1111-4111-8111-000000000001','حفر الباطن','Hafar Al-Batin','hafar-al-batin',48),
  ('22222222-2222-4222-8222-000000000049','11111111-1111-4111-8111-000000000001','القريات','Qurayyat','qurayyat',49),
  ('22222222-2222-4222-8222-000000000050','11111111-1111-4111-8111-000000000001','رابغ','Rabigh','rabigh',50),
  ('22222222-2222-4222-8222-000000000051','11111111-1111-4111-8111-000000000001','الزلفي','Zulfi','zulfi',51),
  ('22222222-2222-4222-8222-000000000052','11111111-1111-4111-8111-000000000001','الدوادمي','Dawadmi','dawadmi',52),
  ('22222222-2222-4222-8222-000000000053','11111111-1111-4111-8111-000000000001','القنفذة','Al Qunfudhah','al-qunfudhah',53),
  -- United Arab Emirates
  ('22222222-2222-4222-8222-000000000054','11111111-1111-4111-8111-000000000002','العين','Al Ain','al-ain',54),
  ('22222222-2222-4222-8222-000000000055','11111111-1111-4111-8111-000000000002','خورفكان','Khor Fakkan','khor-fakkan',55),
  ('22222222-2222-4222-8222-000000000056','11111111-1111-4111-8111-000000000002','دبا الفجيرة','Dibba Al-Fujairah','dibba-al-fujairah',56),
  ('22222222-2222-4222-8222-000000000057','11111111-1111-4111-8111-000000000002','كلباء','Kalba','kalba',57),
  ('22222222-2222-4222-8222-000000000058','11111111-1111-4111-8111-000000000002','مدينة زايد','Madinat Zayed','madinat-zayed',58),
  ('22222222-2222-4222-8222-000000000059','11111111-1111-4111-8111-000000000002','الرويس','Ar-Ruways','ar-ruways',59),
  ('22222222-2222-4222-8222-000000000060','11111111-1111-4111-8111-000000000002','جبل علي','Jebel Ali','jebel-ali',60),
  ('22222222-2222-4222-8222-000000000061','11111111-1111-4111-8111-000000000002','دبا الحصن','Dibba Al-Hisn','dibba-al-hisn',61),
  ('22222222-2222-4222-8222-000000000062','11111111-1111-4111-8111-000000000002','حتا','Hatta','hatta',62),
  ('22222222-2222-4222-8222-000000000063','11111111-1111-4111-8111-000000000002','ليوا','Liwa','liwa',63),
  ('22222222-2222-4222-8222-000000000064','11111111-1111-4111-8111-000000000002','الذيد','Al Dhaid','al-dhaid',64),
  ('22222222-2222-4222-8222-000000000065','11111111-1111-4111-8111-000000000002','غياثي','Ghayathi','ghayathi',65),
  ('22222222-2222-4222-8222-000000000066','11111111-1111-4111-8111-000000000002','مصفي','Masafi','masafi',66),
  -- Qatar
  ('22222222-2222-4222-8222-000000000067','11111111-1111-4111-8111-000000000003','الخور','Al Khor','al-khor',67),
  ('22222222-2222-4222-8222-000000000068','11111111-1111-4111-8111-000000000003','أم صلال','Umm Salal','umm-salal',68),
  ('22222222-2222-4222-8222-000000000069','11111111-1111-4111-8111-000000000003','دخان','Dukhan','dukhan',69),
  ('22222222-2222-4222-8222-000000000070','11111111-1111-4111-8111-000000000003','مسيعيد','Mesaieed','mesaieed',70),
  ('22222222-2222-4222-8222-000000000071','11111111-1111-4111-8111-000000000003','الشمال','Al Shamal','al-shamal',71),
  ('22222222-2222-4222-8222-000000000072','11111111-1111-4111-8111-000000000003','الذخيرة','Al Dhakhira','al-dhakhira',72),
  -- Kuwait
  ('22222222-2222-4222-8222-000000000073','11111111-1111-4111-8111-000000000004','الجهراء','Al Jahra','al-jahra',73),
  ('22222222-2222-4222-8222-000000000074','11111111-1111-4111-8111-000000000004','الأحمدي','Al Ahmadi','al-ahmadi',74),
  ('22222222-2222-4222-8222-000000000075','11111111-1111-4111-8111-000000000004','الفحيحيل','Fahaheel','fahaheel',75),
  ('22222222-2222-4222-8222-000000000076','11111111-1111-4111-8111-000000000004','المنقف','Mangaf','mangaf',76),
  ('22222222-2222-4222-8222-000000000077','11111111-1111-4111-8111-000000000004','صباح السالم','Sabah Al-Salem','sabah-al-salem',77),
  ('22222222-2222-4222-8222-000000000078','11111111-1111-4111-8111-000000000004','الجابرية','Jabriya','jabriya',78),
  -- Bahrain
  ('22222222-2222-4222-8222-000000000079','11111111-1111-4111-8111-000000000005','سترة','Sitra','sitra',79),
  ('22222222-2222-4222-8222-000000000080','11111111-1111-4111-8111-000000000005','مدينة حمد','Hamad Town','hamad-town',80),
  ('22222222-2222-4222-8222-000000000081','11111111-1111-4111-8111-000000000005','البديع','Budaiya','budaiya',81),
  ('22222222-2222-4222-8222-000000000082','11111111-1111-4111-8111-000000000005','جدحفص','Jidhafs','jidhafs',82),
  ('22222222-2222-4222-8222-000000000083','11111111-1111-4111-8111-000000000005','عالي','A''ali','aali',83),
  ('22222222-2222-4222-8222-000000000084','11111111-1111-4111-8111-000000000005','سار','Saar','saar',84),
  -- Oman
  ('22222222-2222-4222-8222-000000000085','11111111-1111-4111-8111-000000000006','صور','Sur','sur',85),
  ('22222222-2222-4222-8222-000000000086','11111111-1111-4111-8111-000000000006','بهلاء','Bahla','bahla',86),
  ('22222222-2222-4222-8222-000000000087','11111111-1111-4111-8111-000000000006','عبري','Ibri','ibri',87),
  ('22222222-2222-4222-8222-000000000088','11111111-1111-4111-8111-000000000006','إبراء','Ibra','ibra',88),
  ('22222222-2222-4222-8222-000000000089','11111111-1111-4111-8111-000000000006','الرستاق','Rustaq','rustaq',89),
  ('22222222-2222-4222-8222-000000000090','11111111-1111-4111-8111-000000000006','السيب','Seeb','seeb',90),
  ('22222222-2222-4222-8222-000000000091','11111111-1111-4111-8111-000000000006','بركاء','Barka','barka',91),
  ('22222222-2222-4222-8222-000000000092','11111111-1111-4111-8111-000000000006','خصب','Khasab','khasab',92),
  ('22222222-2222-4222-8222-000000000093','11111111-1111-4111-8111-000000000006','صحم','Saham','saham',93),
  ('22222222-2222-4222-8222-000000000094','11111111-1111-4111-8111-000000000006','الخابورة','Al Khaburah','al-khaburah',94),
  ('22222222-2222-4222-8222-000000000095','11111111-1111-4111-8111-000000000006','البريمي','Al Buraimi','al-buraimi',95),
  ('22222222-2222-4222-8222-000000000096','11111111-1111-4111-8111-000000000006','مطرح','Muttrah','muttrah',96),
  ('22222222-2222-4222-8222-000000000097','11111111-1111-4111-8111-000000000006','العامرات','Al Amrat','al-amrat',97),
  ('22222222-2222-4222-8222-000000000098','11111111-1111-4111-8111-000000000006','قريات','Quriyat','quriyat',98)
on conflict (id) do nothing;

-- ── Egypt & Syria (mirrors migrations/0016_egypt_syria.sql) ──────────────
insert into public.countries (id, name_ar, name_en, iso_code, phone_code, currency_code, timezone, sort_order) values
  ('11111111-1111-4111-8111-000000000007','مصر','Egypt','EG','+20','EGP','Africa/Cairo',7),
  ('11111111-1111-4111-8111-000000000008','سوريا','Syria','SY','+963','SYP','Asia/Damascus',8)
on conflict (id) do nothing;

insert into public.cities (id, country_id, name_ar, name_en, slug, sort_order) values
  ('22222222-2222-4222-8222-000000000099','11111111-1111-4111-8111-000000000007','القاهرة','Cairo','cairo',99),
  ('22222222-2222-4222-8222-000000000100','11111111-1111-4111-8111-000000000007','الإسكندرية','Alexandria','alexandria',100),
  ('22222222-2222-4222-8222-000000000101','11111111-1111-4111-8111-000000000007','الجيزة','Giza','giza',101),
  ('22222222-2222-4222-8222-000000000102','11111111-1111-4111-8111-000000000007','شبرا الخيمة','Shubra El Kheima','shubra-el-kheima',102),
  ('22222222-2222-4222-8222-000000000103','11111111-1111-4111-8111-000000000007','بورسعيد','Port Said','port-said',103),
  ('22222222-2222-4222-8222-000000000104','11111111-1111-4111-8111-000000000007','السويس','Suez','suez',104),
  ('22222222-2222-4222-8222-000000000105','11111111-1111-4111-8111-000000000007','المحلة الكبرى','El Mahalla El Kubra','el-mahalla-el-kubra',105),
  ('22222222-2222-4222-8222-000000000106','11111111-1111-4111-8111-000000000007','المنصورة','Mansoura','mansoura',106),
  ('22222222-2222-4222-8222-000000000107','11111111-1111-4111-8111-000000000007','طنطا','Tanta','tanta',107),
  ('22222222-2222-4222-8222-000000000108','11111111-1111-4111-8111-000000000007','أسيوط','Asyut','asyut',108),
  ('22222222-2222-4222-8222-000000000109','11111111-1111-4111-8111-000000000007','الإسماعيلية','Ismailia','ismailia',109),
  ('22222222-2222-4222-8222-000000000110','11111111-1111-4111-8111-000000000007','الفيوم','Fayoum','fayoum',110),
  ('22222222-2222-4222-8222-000000000111','11111111-1111-4111-8111-000000000007','الزقازيق','Zagazig','zagazig',111),
  ('22222222-2222-4222-8222-000000000112','11111111-1111-4111-8111-000000000007','أسوان','Aswan','aswan',112),
  ('22222222-2222-4222-8222-000000000113','11111111-1111-4111-8111-000000000007','دمنهور','Damanhur','damanhur',113),
  ('22222222-2222-4222-8222-000000000114','11111111-1111-4111-8111-000000000007','الأقصر','Luxor','luxor',114),
  ('22222222-2222-4222-8222-000000000115','11111111-1111-4111-8111-000000000008','دمشق','Damascus','damascus',115),
  ('22222222-2222-4222-8222-000000000116','11111111-1111-4111-8111-000000000008','حلب','Aleppo','aleppo',116),
  ('22222222-2222-4222-8222-000000000117','11111111-1111-4111-8111-000000000008','حمص','Homs','homs',117),
  ('22222222-2222-4222-8222-000000000118','11111111-1111-4111-8111-000000000008','اللاذقية','Latakia','latakia',118),
  ('22222222-2222-4222-8222-000000000119','11111111-1111-4111-8111-000000000008','حماة','Hama','hama',119),
  ('22222222-2222-4222-8222-000000000120','11111111-1111-4111-8111-000000000008','الرقة','Raqqa','raqqa',120),
  ('22222222-2222-4222-8222-000000000121','11111111-1111-4111-8111-000000000008','دير الزور','Deir ez-Zor','deir-ez-zor',121),
  ('22222222-2222-4222-8222-000000000122','11111111-1111-4111-8111-000000000008','الحسكة','Al-Hasakah','al-hasakah',122),
  ('22222222-2222-4222-8222-000000000123','11111111-1111-4111-8111-000000000008','القامشلي','Qamishli','qamishli',123),
  ('22222222-2222-4222-8222-000000000124','11111111-1111-4111-8111-000000000008','طرطوس','Tartus','tartus',124),
  ('22222222-2222-4222-8222-000000000125','11111111-1111-4111-8111-000000000008','منبج','Manbij','manbij',125),
  ('22222222-2222-4222-8222-000000000126','11111111-1111-4111-8111-000000000008','إدلب','Idlib','idlib',126),
  ('22222222-2222-4222-8222-000000000127','11111111-1111-4111-8111-000000000008','درعا','Daraa','daraa',127)
on conflict (id) do nothing;

-- ░░░░░░░░░░░░░░░░░░░░ migrations/0005_proposals.sql ░░░░░░░░░░░░░░░░░░░░

-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0005 swap proposals (the core barter mechanic)
-- swap_proposals + swap_proposal_items, conversations.proposal_id, RLS,
-- indexes, updated_at trigger. Run after 0001–0004, BEFORE seed.sql.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.swap_proposals (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings(id) on delete cascade,
  proposer_id     uuid not null references public.profiles(id) on delete cascade,
  recipient_id    uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  status          text not null default 'pending'
                    check (status in ('pending','countered','agreed','awaiting_confirmation','completed','disputed','cancelled')),
  note            text,
  last_actor_id   uuid not null references public.profiles(id) on delete cascade,
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
create unique index if not exists swap_proposals_one_active_per_target
  on public.swap_proposals (proposer_id, listing_id)
  where status in ('pending','countered','agreed','awaiting_confirmation');
drop trigger if exists swap_proposals_set_updated_at on public.swap_proposals;
create trigger swap_proposals_set_updated_at before update on public.swap_proposals
  for each row execute function public.set_updated_at();

create table if not exists public.swap_proposal_items (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.swap_proposals(id) on delete cascade,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (proposal_id, listing_id)
);
create index if not exists swap_proposal_items_proposal_idx on public.swap_proposal_items(proposal_id);
create index if not exists swap_proposal_items_listing_idx  on public.swap_proposal_items(listing_id);

alter table public.conversations
  add column if not exists proposal_id uuid references public.swap_proposals(id) on delete set null;
create index if not exists conversations_proposal_idx on public.conversations(proposal_id);

alter table public.swap_proposals      enable row level security;
alter table public.swap_proposal_items enable row level security;

drop policy if exists "proposals read if party" on public.swap_proposals;
create policy "proposals read if party" on public.swap_proposals
  for select using (
    proposer_id = auth.uid() or recipient_id = auth.uid() or public.is_admin(auth.uid())
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
    exists (select 1 from public.swap_proposals p where p.id = swap_proposal_items.proposal_id and p.proposer_id = auth.uid())
  ) with check (
    exists (select 1 from public.swap_proposals p where p.id = swap_proposal_items.proposal_id and p.proposer_id = auth.uid())
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.swap_proposals;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- ░░░░░░░░░░░░░░░░░░░░ migrations/0006_deal_closing.sql ░░░░░░░░░░░░░░░░░░░░

-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0006 deal closing (the swap completes)
-- Each party uploads a photo of the item THEY received; when both have, the
-- swap completes and each party's completed_swaps_count is incremented (the
-- trust signal — only ever set here, never by an admin). Run after 0005.
-- Purely additive + idempotent.
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

-- ── Storage — swap-confirmations bucket (private) ──────────────────────────
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

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.swap_confirmations;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- ░░░░░░░░░░░░░░░░░░░░ migrations/0007_ratings.sql ░░░░░░░░░░░░░░░░░░░░

-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0007 ratings (post-swap reviews)
-- After a swap COMPLETES (0006), either party may leave the other a 1–5 star
-- rating + optional review text. Ratings are opt-in / text-optional. Each rating
-- keeps the RATEE's denormalised trust signals on `profiles` in sync: `rating`
-- (the average) and `ratings_count` — written ONLY by the trigger below.
-- ════════════════════════════════════════════════════════════════════════

-- profiles.ratings_count is created in the profiles table above on a fresh build;
-- this keeps an existing database in sync when 0007 is applied on its own.
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
  unique (proposal_id, rater_id),
  check (rater_id <> ratee_id)
);
create index if not exists ratings_ratee_idx on public.ratings(ratee_id);

drop trigger if exists ratings_set_updated_at on public.ratings;
create trigger ratings_set_updated_at before update on public.ratings
  for each row execute function public.set_updated_at();

alter table public.ratings enable row level security;

drop policy if exists "ratings readable" on public.ratings;
create policy "ratings readable" on public.ratings for select using (true);

drop policy if exists "ratings admin manage" on public.ratings;
create policy "ratings admin manage" on public.ratings
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

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

-- ratings are intentionally NOT published to supabase_realtime (no live subscriber;
-- the UI updates optimistically + loads reviews server-side). See 0007_ratings.sql.

-- ░░░░░░░░░░░░░░░░░░░░ migrations/0008_notifications.sql ░░░░░░░░░░░░░░░░░░░░

-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0008 notifications (in-app notification center)
-- A `notifications` table fed by SECURITY DEFINER triggers on the source tables
-- (swap_proposals / messages / follows / ratings), so a notification fires no
-- matter which path made the change. Reads + mark-as-read go directly via RLS
-- (owner-only). See 0008_notifications.sql for the full rationale.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  type            text not null check (type in (
                    'proposal_received','proposal_countered','proposal_accepted',
                    'proposal_cancelled','swap_confirm_pending','swap_completed',
                    'swap_disputed','new_message','new_follower','new_rating')),
  actor_id        uuid references public.profiles(id) on delete set null,
  proposal_id     uuid references public.swap_proposals(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists notifications_user_idx        on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx  on public.notifications(user_id) where is_read = false;
create unique index if not exists notifications_unread_message_uq
  on public.notifications(user_id, conversation_id)
  where type = 'new_message' and is_read = false;

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

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- ░░░░░░░░░░░░░░░░░░░░ migrations/0009_blocks_autohide.sql ░░░░░░░░░░░░░░░░░░░░

-- blocks (private join table) + report auto-hide trigger. See the standalone
-- migration for the full rationale. Additive + idempotent.

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocked_idx on public.blocks(blocked_id);

alter table public.blocks enable row level security;

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

create or replace function public.blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;
grant execute on function public.blocked_between(uuid, uuid) to anon, authenticated, service_role;

drop policy if exists "listings public read active" on public.listings;
create policy "listings public read active" on public.listings
  for select using (
    (status = 'active' and not public.blocked_between(auth.uid(), owner_id))
    or owner_id = auth.uid()
    or public.is_admin(auth.uid())
  );

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

create or replace function public.auto_hide_reported_listing()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  threshold constant int := 5;  -- REPORT_AUTO_HIDE_THRESHOLD (spec §3.8)
  reporter_count int;
begin
  if new.target_type <> 'listing' then
    return null;
  end if;
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

-- ░░░░░░░░░░░░░░░░░░░░ seed.sql ░░░░░░░░░░░░░░░░░░░░

-- ════════════════════════════════════════════════════════════════════════
-- Swap — seed data
-- Run AFTER 0001_schema, 0002_rls, 0003_storage.
--
-- Idempotent: safe to run multiple times (ON CONFLICT DO NOTHING).
-- The fixed UUIDs here MATCH packages/config (countries/cities/categories),
-- so the app constants and the database never drift.
--
-- Contents: 12 demo users across the GCC, 44 listings
-- (active/hidden/completed/removed, some featured) with images, follows,
-- saved listings, 8 conversations + messages, reports, and admin-action
-- audit examples. Trust is shown via each user's completed-swaps count.
--
-- Demo auth users are created with password:  Swap1234!  (DEVELOPMENT ONLY —
-- emails are *.demo; never use these credentials in production).
-- ════════════════════════════════════════════════════════════════════════

-- ── Countries ───────────────────────────────────────────────────────────
insert into public.countries (id, name_ar, name_en, iso_code, phone_code, currency_code, timezone, sort_order) values
  ('11111111-1111-4111-8111-000000000001','السعودية','Saudi Arabia','SA','+966','SAR','Asia/Riyadh',1),
  ('11111111-1111-4111-8111-000000000002','الإمارات العربية المتحدة','United Arab Emirates','AE','+971','AED','Asia/Dubai',2),
  ('11111111-1111-4111-8111-000000000003','قطر','Qatar','QA','+974','QAR','Asia/Qatar',3),
  ('11111111-1111-4111-8111-000000000004','الكويت','Kuwait','KW','+965','KWD','Asia/Kuwait',4),
  ('11111111-1111-4111-8111-000000000005','البحرين','Bahrain','BH','+973','BHD','Asia/Bahrain',5),
  ('11111111-1111-4111-8111-000000000006','عُمان','Oman','OM','+968','OMR','Asia/Muscat',6)
on conflict (id) do nothing;

-- ── Cities ──────────────────────────────────────────────────────────────
insert into public.cities (id, country_id, name_ar, name_en, slug, sort_order) values
  ('22222222-2222-4222-8222-000000000001','11111111-1111-4111-8111-000000000001','الرياض','Riyadh','riyadh',1),
  ('22222222-2222-4222-8222-000000000002','11111111-1111-4111-8111-000000000001','جدة','Jeddah','jeddah',2),
  ('22222222-2222-4222-8222-000000000003','11111111-1111-4111-8111-000000000001','مكة المكرمة','Makkah','makkah',3),
  ('22222222-2222-4222-8222-000000000004','11111111-1111-4111-8111-000000000001','المدينة المنورة','Madinah','madinah',4),
  ('22222222-2222-4222-8222-000000000005','11111111-1111-4111-8111-000000000001','الدمام','Dammam','dammam',5),
  ('22222222-2222-4222-8222-000000000006','11111111-1111-4111-8111-000000000001','الخبر','Khobar','khobar',6),
  ('22222222-2222-4222-8222-000000000007','11111111-1111-4111-8111-000000000001','الطائف','Taif','taif',7),
  ('22222222-2222-4222-8222-000000000008','11111111-1111-4111-8111-000000000001','أبها','Abha','abha',8),
  ('22222222-2222-4222-8222-000000000009','11111111-1111-4111-8111-000000000002','دبي','Dubai','dubai',9),
  ('22222222-2222-4222-8222-000000000010','11111111-1111-4111-8111-000000000002','أبوظبي','Abu Dhabi','abu-dhabi',10),
  ('22222222-2222-4222-8222-000000000011','11111111-1111-4111-8111-000000000002','الشارقة','Sharjah','sharjah',11),
  ('22222222-2222-4222-8222-000000000012','11111111-1111-4111-8111-000000000002','عجمان','Ajman','ajman',12),
  ('22222222-2222-4222-8222-000000000013','11111111-1111-4111-8111-000000000002','رأس الخيمة','Ras Al Khaimah','ras-al-khaimah',13),
  ('22222222-2222-4222-8222-000000000014','11111111-1111-4111-8111-000000000002','الفجيرة','Fujairah','fujairah',14),
  ('22222222-2222-4222-8222-000000000015','11111111-1111-4111-8111-000000000002','أم القيوين','Umm Al Quwain','umm-al-quwain',15),
  ('22222222-2222-4222-8222-000000000016','11111111-1111-4111-8111-000000000003','الدوحة','Doha','doha',16),
  ('22222222-2222-4222-8222-000000000017','11111111-1111-4111-8111-000000000003','الريان','Al Rayyan','al-rayyan',17),
  ('22222222-2222-4222-8222-000000000018','11111111-1111-4111-8111-000000000003','الوكرة','Al Wakrah','al-wakrah',18),
  ('22222222-2222-4222-8222-000000000019','11111111-1111-4111-8111-000000000003','لوسيل','Lusail','lusail',19),
  ('22222222-2222-4222-8222-000000000020','11111111-1111-4111-8111-000000000004','مدينة الكويت','Kuwait City','kuwait-city',20),
  ('22222222-2222-4222-8222-000000000021','11111111-1111-4111-8111-000000000004','حولي','Hawalli','hawalli',21),
  ('22222222-2222-4222-8222-000000000022','11111111-1111-4111-8111-000000000004','السالمية','Salmiya','salmiya',22),
  ('22222222-2222-4222-8222-000000000023','11111111-1111-4111-8111-000000000004','الفروانية','Farwaniya','farwaniya',23),
  ('22222222-2222-4222-8222-000000000024','11111111-1111-4111-8111-000000000005','المنامة','Manama','manama',24),
  ('22222222-2222-4222-8222-000000000025','11111111-1111-4111-8111-000000000005','المحرق','Muharraq','muharraq',25),
  ('22222222-2222-4222-8222-000000000026','11111111-1111-4111-8111-000000000005','الرفاع','Riffa','riffa',26),
  ('22222222-2222-4222-8222-000000000027','11111111-1111-4111-8111-000000000005','مدينة عيسى','Isa Town','isa-town',27),
  ('22222222-2222-4222-8222-000000000028','11111111-1111-4111-8111-000000000006','مسقط','Muscat','muscat',28),
  ('22222222-2222-4222-8222-000000000029','11111111-1111-4111-8111-000000000006','صلالة','Salalah','salalah',29),
  ('22222222-2222-4222-8222-000000000030','11111111-1111-4111-8111-000000000006','صحار','Sohar','sohar',30),
  ('22222222-2222-4222-8222-000000000031','11111111-1111-4111-8111-000000000006','نزوى','Nizwa','nizwa',31)
on conflict (id) do nothing;

-- ── Categories ──────────────────────────────────────────────────────────
insert into public.categories (id, name_ar, name_en, slug, icon, sort_order) values
  ('33333333-3333-4333-8333-000000000001','إلكترونيات','Electronics','electronics','electronics',1),
  ('33333333-3333-4333-8333-000000000002','أثاث','Furniture','furniture','furniture',2),
  ('33333333-3333-4333-8333-000000000003','سيارات','Cars','cars','cars',3),
  ('33333333-3333-4333-8333-000000000004','أجهزة منزلية','Home appliances','home-appliances','appliances',4),
  ('33333333-3333-4333-8333-000000000005','ملابس','Clothing','clothing','clothing',5),
  ('33333333-3333-4333-8333-000000000006','ساعات','Watches','watches','watches',6),
  ('33333333-3333-4333-8333-000000000007','ألعاب','Toys','toys','toys',7),
  ('33333333-3333-4333-8333-000000000008','معدات رياضية','Sports equipment','sports','sports',8),
  ('33333333-3333-4333-8333-000000000009','أخرى','Other','other','other',9)
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════
-- Demo auth users  (password for all: Swap1234!)
-- Inserting into auth.users fires handle_new_user() which creates the profile.
-- ════════════════════════════════════════════════════════════════════════
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
   confirmation_token, recovery_token, email_change_token_new, email_change)
values
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','authenticated','authenticated','ahmed@swap.demo', crypt('Swap1234!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"أحمد العتيبي","username":"ahmed","phone":"+966500000001","preferred_language":"ar"}','','','',''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','authenticated','authenticated','sara@swap.demo',  crypt('Swap1234!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"سارة القحطاني","username":"sara","phone":"+966500000002","preferred_language":"ar"}','','','',''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','authenticated','authenticated','khalid@swap.demo',crypt('Swap1234!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"خالد المنصوري","username":"khalid","phone":"+971500000003","preferred_language":"ar"}','','','',''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-4aaa-8aaa-000000000004','authenticated','authenticated','fatima@swap.demo',crypt('Swap1234!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"فاطمة آل ثاني","username":"fatima","phone":"+974500000004","preferred_language":"ar"}','','','',''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','authenticated','authenticated','omar@swap.demo',  crypt('Swap1234!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"عمر الصباح","username":"omar","phone":"+965500000005","preferred_language":"en"}','','','',''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-4aaa-8aaa-000000000006','authenticated','authenticated','noura@swap.demo', crypt('Swap1234!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"نورة الدوسري","username":"noura","phone":"+966500000006","preferred_language":"ar"}','','','',''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-4aaa-8aaa-000000000007','authenticated','authenticated','yousef@swap.demo',crypt('Swap1234!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"يوسف النعيمي","username":"yousef","phone":"+971500000007","preferred_language":"en"}','','','',''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-4aaa-8aaa-000000000008','authenticated','authenticated','mariam@swap.demo',crypt('Swap1234!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"مريم الخليفة","username":"mariam","phone":"+973500000008","preferred_language":"ar"}','','','',''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-4aaa-8aaa-000000000009','authenticated','authenticated','salem@swap.demo', crypt('Swap1234!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"سالم البلوشي","username":"salem","phone":"+968500000009","preferred_language":"en"}','','','',''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-4aaa-8aaa-000000000010','authenticated','authenticated','huda@swap.demo',  crypt('Swap1234!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"هدى آل ثاني","username":"huda","phone":"+974500000010","preferred_language":"ar"}','','','',''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-4aaa-8aaa-000000000011','authenticated','authenticated','tariq@swap.demo', crypt('Swap1234!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"طارق العنزي","username":"tariq","phone":"+965500000011","preferred_language":"en"}','','','',''),
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-4aaa-8aaa-000000000012','authenticated','authenticated','layla@swap.demo', crypt('Swap1234!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"full_name":"ليلى المرر","username":"layla","phone":"+971500000012","preferred_language":"ar"}','','','','')
on conflict (id) do nothing;

-- Backfill profiles directly from auth.users. On a FRESH auth user the
-- on_auth_user_created trigger already created the row; but on a re-run where
-- these demo users already exist in auth.users (e.g. after `drop schema public
-- cascade`, which drops the trigger but NOT auth.users), the insert above is a
-- no-op and the trigger never fires — so we recreate the profile rows here.
-- Mirrors handle_new_user(); on conflict makes it a no-op when already present.
insert into public.profiles (id, email, full_name, username, phone, preferred_language)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', ''),
  coalesce(u.raw_user_meta_data->>'username', 'user_' || substr(u.id::text, 1, 8)),
  u.raw_user_meta_data->>'phone',
  coalesce(u.raw_user_meta_data->>'preferred_language', 'ar')
from auth.users u
where u.email like '%@swap.demo'
on conflict (id) do nothing;

-- Enrich the profiles with country/city/admin/bio.
update public.profiles set country_id='11111111-1111-4111-8111-000000000001', city_id='22222222-2222-4222-8222-000000000001', is_admin=true,  bio='مهتم بتبادل الإلكترونيات والساعات.', avatar_url='https://i.pravatar.cc/150?img=12' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000001';
update public.profiles set country_id='11111111-1111-4111-8111-000000000001', city_id='22222222-2222-4222-8222-000000000002', is_admin=false, bio='أبادل الأثاث والأجهزة المنزلية.',      avatar_url='https://i.pravatar.cc/150?img=45' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000002';
update public.profiles set country_id='11111111-1111-4111-8111-000000000002', city_id='22222222-2222-4222-8222-000000000009', is_admin=false, bio='Furniture and home items in Dubai.',   avatar_url='https://i.pravatar.cc/150?img=33' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000003';
update public.profiles set country_id='11111111-1111-4111-8111-000000000003', city_id='22222222-2222-4222-8222-000000000016', is_admin=false, bio='تبادل الأجهزة والإلكترونيات في الدوحة.', avatar_url='https://i.pravatar.cc/150?img=47' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000004';
update public.profiles set country_id='11111111-1111-4111-8111-000000000004', city_id='22222222-2222-4222-8222-000000000020', is_admin=false, bio='Electronics and appliances in Kuwait.', avatar_url='https://i.pravatar.cc/150?img=14' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000005';
update public.profiles set country_id='11111111-1111-4111-8111-000000000001', city_id='22222222-2222-4222-8222-000000000005', is_admin=false, bio='مهتمة بالكاميرات والكتب.',               avatar_url='https://i.pravatar.cc/150?img=5'  where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000006';
update public.profiles set country_id='11111111-1111-4111-8111-000000000002', city_id='22222222-2222-4222-8222-000000000010', is_admin=false, bio='Tools and car parts in Abu Dhabi.',     avatar_url='https://i.pravatar.cc/150?img=8'  where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000007';
update public.profiles set country_id='11111111-1111-4111-8111-000000000005', city_id='22222222-2222-4222-8222-000000000024', is_admin=false, bio='أبادل مستلزمات المنزل والعناية.',         avatar_url='https://i.pravatar.cc/150?img=20' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000008';
update public.profiles set country_id='11111111-1111-4111-8111-000000000006', city_id='22222222-2222-4222-8222-000000000028', is_admin=false, bio='Pets, office gear and more in Muscat.',  avatar_url='https://i.pravatar.cc/150?img=51' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000009';
update public.profiles set country_id='11111111-1111-4111-8111-000000000003', city_id='22222222-2222-4222-8222-000000000017', is_admin=false, bio='أثاث وأجهزة في الريان.',                 avatar_url='https://i.pravatar.cc/150?img=32' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000010';
update public.profiles set country_id='11111111-1111-4111-8111-000000000004', city_id='22222222-2222-4222-8222-000000000021', is_admin=false, bio='Gaming and auto parts in Hawalli.',     avatar_url='https://i.pravatar.cc/150?img=60' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000011';
update public.profiles set country_id='11111111-1111-4111-8111-000000000002', city_id='22222222-2222-4222-8222-000000000011', is_admin=false, bio='أزياء وإكسسوارات وآلات موسيقية.',         avatar_url='https://i.pravatar.cc/150?img=48' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000012';

-- ════════════════════════════════════════════════════════════════════════
-- Demo listings (12)
-- ════════════════════════════════════════════════════════════════════════
insert into public.listings (id, owner_id, category_id, country_id, city_id, title, description, condition, wanted_exchange, status, is_featured, view_count) values
  ('44444444-4444-4444-8444-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','33333333-3333-4333-8333-000000000001','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001','آيفون 14 برو','آيفون 14 برو 256 جيجابايت بحالة ممتازة مع العلبة.','used','جهاز سامسونج S23 أو لابتوب','active',true,142),
  ('44444444-4444-4444-8444-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','33333333-3333-4333-8333-000000000004','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000002','غسالة أوتوماتيك','غسالة 8 كيلو تعمل بكفاءة، نظيفة جدًا.','used','ثلاجة أو مايكروويف','active',false,58),
  ('44444444-4444-4444-8444-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','33333333-3333-4333-8333-000000000002','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000009','طقم غرفة نوم','طقم غرفة نوم خشب كامل بحالة جيدة.','used','أثاث مجلس أو طاولة طعام','active',true,77),
  ('44444444-4444-4444-8444-000000000004','aaaaaaaa-aaaa-4aaa-8aaa-000000000004','33333333-3333-4333-8333-000000000004','11111111-1111-4111-8111-000000000003','22222222-2222-4222-8222-000000000016','مكيف سبليت','مكيف سبليت 18000 وحدة بارد، شغال بكفاءة عالية.','used','غسالة فل أوتوماتيك','active',false,91),
  ('44444444-4444-4444-8444-000000000005','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','33333333-3333-4333-8333-000000000001','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000020','لابتوب','Dell XPS 13 laptop, 16GB RAM, great condition.','used','iPad Pro or gaming console','active',false,64),
  ('44444444-4444-4444-8444-000000000006','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','33333333-3333-4333-8333-000000000006','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001','ساعة يد فاخرة','ساعة يد بحالة الجديد مع الضمان.','new','ساعة أخرى أو سماعات','active',false,39),
  ('44444444-4444-4444-8444-000000000007','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','33333333-3333-4333-8333-000000000008','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000002','دراجة هوائية','دراجة جبلية مقاس 27.5، استخدام خفيف.','used','دراجة كهربائية أو معدات رياضية','active',false,27),
  ('44444444-4444-4444-8444-000000000008','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','33333333-3333-4333-8333-000000000002','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000009','كنبة مجلس','كنبة 3 مقاعد لون رمادي، مريحة ونظيفة.','used','طاولة طعام أو مكتب','active',false,45),
  ('44444444-4444-4444-8444-000000000009','aaaaaaaa-aaaa-4aaa-8aaa-000000000004','33333333-3333-4333-8333-000000000001','11111111-1111-4111-8111-000000000003','22222222-2222-4222-8222-000000000016','بلايستيشن 5','جهاز بلايستيشن 5 مع يدين وألعاب.','used','إكس بوكس أو لابتوب','active',true,118),
  ('44444444-4444-4444-8444-000000000010','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','33333333-3333-4333-8333-000000000004','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000020','ماكينة قهوة','Espresso coffee machine, barely used.','used','Air fryer or blender','active',false,33),
  ('44444444-4444-4444-8444-000000000011','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','33333333-3333-4333-8333-000000000007','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001','عربة أطفال','عربة أطفال قابلة للطي، بحالة ممتازة.','used','كرسي سيارة للأطفال','active',false,21),
  ('44444444-4444-4444-8444-000000000012','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','33333333-3333-4333-8333-000000000002','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000002','كرسي مكتب','كرسي مكتب طبي مريح للظهر.','new','كرسي قيمنق أو مكتب','active',false,52),
  ('44444444-4444-4444-8444-000000000013','aaaaaaaa-aaaa-4aaa-8aaa-000000000006','33333333-3333-4333-8333-000000000010','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000005','سامسونج جالكسي S23','جهاز نظيف مع كامل ملحقاته.','used','آيفون أو فرق','active',false,73),
  ('44444444-4444-4444-8444-000000000014','aaaaaaaa-aaaa-4aaa-8aaa-000000000007','33333333-3333-4333-8333-000000000011','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000010','ماك بوك اير M2','MacBook Air M2, like new, with charger.','used','Gaming laptop','active',true,156),
  ('44444444-4444-4444-8444-000000000015','aaaaaaaa-aaaa-4aaa-8aaa-000000000008','33333333-3333-4333-8333-000000000004','11111111-1111-4111-8111-000000000005','22222222-2222-4222-8222-000000000024','ثلاجة إل جي','ثلاجة بابين، بحالة جيدة.','used','غسالة أوتوماتيك','active',false,41),
  ('44444444-4444-4444-8444-000000000016','aaaaaaaa-aaaa-4aaa-8aaa-000000000009','33333333-3333-4333-8333-000000000003','11111111-1111-4111-8111-000000000006','22222222-2222-4222-8222-000000000028','تويوتا كامري 2018','Toyota Camry 2018, well maintained.','used','Smaller car + cash','hidden',false,210),
  ('44444444-4444-4444-8444-000000000017','aaaaaaaa-aaaa-4aaa-8aaa-000000000010','33333333-3333-4333-8333-000000000002','11111111-1111-4111-8111-000000000003','22222222-2222-4222-8222-000000000017','طاولة طعام','طاولة طعام 6 كراسي خشب زان.','used','مكتب دراسة','active',false,33),
  ('44444444-4444-4444-8444-000000000018','aaaaaaaa-aaaa-4aaa-8aaa-000000000011','33333333-3333-4333-8333-000000000012','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000021','إكس بوكس سيريس X','Xbox Series X with 2 controllers.','used','PlayStation 5','active',true,98),
  ('44444444-4444-4444-8444-000000000019','aaaaaaaa-aaaa-4aaa-8aaa-000000000012','33333333-3333-4333-8333-000000000005','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000011','حقيبة وساعة','طقم حقيبة يد وساعة جديد.','new','إكسسوارات','active',false,27),
  ('44444444-4444-4444-8444-000000000020','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','33333333-3333-4333-8333-000000000022','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001','كاميرا كانون','Canon DSLR with kit lens.','used','عدسة أو درون','active',false,64),
  ('44444444-4444-4444-8444-000000000021','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','33333333-3333-4333-8333-000000000013','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000002','طقم جلسة حديقة','طاولة و4 كراسي للحديقة.','used','أثاث داخلي','active',false,19),
  ('44444444-4444-4444-8444-000000000022','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','33333333-3333-4333-8333-000000000006','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000009','ساعة فاخرة','ساعة سويسرية أصلية بالكرت.','new','ساعة أخرى','active',false,88),
  ('44444444-4444-4444-8444-000000000023','aaaaaaaa-aaaa-4aaa-8aaa-000000000004','33333333-3333-4333-8333-000000000016','11111111-1111-4111-8111-000000000003','22222222-2222-4222-8222-000000000016','سرير أطفال','سرير أطفال خشب مع مرتبة.','used','عربة أطفال','active',false,22),
  ('44444444-4444-4444-8444-000000000024','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','33333333-3333-4333-8333-000000000008','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000020','جهاز مشي كهربائي','Treadmill, foldable, barely used.','used','دراجة ثابتة','active',false,45),
  ('44444444-4444-4444-8444-000000000025','aaaaaaaa-aaaa-4aaa-8aaa-000000000006','33333333-3333-4333-8333-000000000017','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000005','مجموعة كتب','مجموعة روايات عربية وإنجليزية.','used','كتب أخرى','active',false,12),
  ('44444444-4444-4444-8444-000000000026','aaaaaaaa-aaaa-4aaa-8aaa-000000000007','33333333-3333-4333-8333-000000000018','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000054','عدة أدوات','Tool set with drill.','used','منشار كهربائي','active',false,30),
  ('44444444-4444-4444-8444-000000000027','aaaaaaaa-aaaa-4aaa-8aaa-000000000008','33333333-3333-4333-8333-000000000019','11111111-1111-4111-8111-000000000005','22222222-2222-4222-8222-000000000026','جهاز عناية بالبشرة','جهاز جديد لم يستخدم.','new','منتجات عناية','active',false,15),
  ('44444444-4444-4444-8444-000000000028','aaaaaaaa-aaaa-4aaa-8aaa-000000000009','33333333-3333-4333-8333-000000000020','11111111-1111-4111-8111-000000000006','22222222-2222-4222-8222-000000000029','قفص طيور كبير','قفص واسع مع ملحقات.','used','مستلزمات حيوانات','active',false,9),
  ('44444444-4444-4444-8444-000000000029','aaaaaaaa-aaaa-4aaa-8aaa-000000000010','33333333-3333-4333-8333-000000000014','11111111-1111-4111-8111-000000000003','22222222-2222-4222-8222-000000000018','دباب سياحي','دباب بحالة ممتازة.','used','دراجة كهربائية','active',false,132),
  ('44444444-4444-4444-8444-000000000030','aaaaaaaa-aaaa-4aaa-8aaa-000000000011','33333333-3333-4333-8333-000000000015','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000022','جنوط رياضية','مقاس 18 بحالة جيدة.','used','إطارات','active',false,28),
  ('44444444-4444-4444-8444-000000000031','aaaaaaaa-aaaa-4aaa-8aaa-000000000012','33333333-3333-4333-8333-000000000021','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000011','جيتار كلاسيكي','جيتار بحالة ممتازة مع الشنطة.','used','بيانو رقمي','active',false,24),
  ('44444444-4444-4444-8444-000000000032','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','33333333-3333-4333-8333-000000000007','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001','مجموعة ليغو','مجموعة ليغو كبيرة كاملة.','used','ألعاب أخرى','active',false,18),
  ('44444444-4444-4444-8444-000000000033','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','33333333-3333-4333-8333-000000000001','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000002','سماعات سوني WH-1000XM5','سماعات عازلة للضوضاء، جديدة.','new','سماعات أخرى','active',false,51),
  ('44444444-4444-4444-8444-000000000034','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','33333333-3333-4333-8333-000000000004','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000009','مكنسة دايسون','Dyson vacuum, completed swap demo.','used','مكواة بخار','completed',false,67),
  ('44444444-4444-4444-8444-000000000035','aaaaaaaa-aaaa-4aaa-8aaa-000000000004','33333333-3333-4333-8333-000000000002','11111111-1111-4111-8111-000000000003','22222222-2222-4222-8222-000000000016','مكتبة خشب','مكتبة كتب خشب 5 أرفف.','used','خزانة ملابس','active',false,20),
  ('44444444-4444-4444-8444-000000000036','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','33333333-3333-4333-8333-000000000010','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000020','آيباد برو 11','iPad Pro 11, 128GB, with pencil.','used','لابتوب','active',true,140),
  ('44444444-4444-4444-8444-000000000037','aaaaaaaa-aaaa-4aaa-8aaa-000000000006','33333333-3333-4333-8333-000000000003','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000005','نيسان باترول 2016','بحالة ممتازة، فل كامل.','used','GMC أو فرق','active',true,305),
  ('44444444-4444-4444-8444-000000000038','aaaaaaaa-aaaa-4aaa-8aaa-000000000007','33333333-3333-4333-8333-000000000025','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000010','عملات قديمة','Old coins collection.','used','طوابع نادرة','active',false,14),
  ('44444444-4444-4444-8444-000000000039','aaaaaaaa-aaaa-4aaa-8aaa-000000000008','33333333-3333-4333-8333-000000000005','11111111-1111-4111-8111-000000000005','22222222-2222-4222-8222-000000000025','عبايات جديدة','مجموعة عبايات بأحجام مختلفة.','new','ملابس','hidden',false,8),
  ('44444444-4444-4444-8444-000000000040','aaaaaaaa-aaaa-4aaa-8aaa-000000000009','33333333-3333-4333-8333-000000000024','11111111-1111-4111-8111-000000000006','22222222-2222-4222-8222-000000000030','طابعة ليزر','HP laser printer, works well.','used','سكانر','active',false,17),
  ('44444444-4444-4444-8444-000000000041','aaaaaaaa-aaaa-4aaa-8aaa-000000000010','33333333-3333-4333-8333-000000000023','11111111-1111-4111-8111-000000000003','22222222-2222-4222-8222-000000000017','أدوات سباكة','مجموعة أدوات سباكة جديدة.','new','دهانات','active',false,11),
  ('44444444-4444-4444-8444-000000000042','aaaaaaaa-aaaa-4aaa-8aaa-000000000011','33333333-3333-4333-8333-000000000012','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000021','نينتندو سويتش','Nintendo Switch OLED with games.','used','بلايستيشن أو ألعاب','active',false,72),
  ('44444444-4444-4444-8444-000000000043','aaaaaaaa-aaaa-4aaa-8aaa-000000000012','33333333-3333-4333-8333-000000000011','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000011','شاشة ألعاب 27 بوصة','Gaming monitor 144Hz (removed demo).','used','كيبورد وماوس','removed',false,39),
  ('44444444-4444-4444-8444-000000000044','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','33333333-3333-4333-8333-000000000006','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001','خاتم ذهب','خاتم ذهب عيار 21 بوزن جيد.','new','ساعة فاخرة','active',false,60)
on conflict (id) do nothing;

-- ── Listing images (placeholder URLs; replace with Storage URLs later) ───
insert into public.listing_images (id, listing_id, image_url, sort_order)
select
  ('55555555-5555-4555-8555-' || lpad(((l.n - 1) * 2 + img)::text, 12, '0'))::uuid,
  l.id,
  'https://picsum.photos/seed/swap-' || l.n || '-' || img || '/600/600',
  img
from (
  select id, row_number() over (order by created_at) as n
  from public.listings
  where id::text like '44444444-4444-4444-8444-%'
) l
cross join generate_series(0, 1) as img
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════
-- Follows
-- ════════════════════════════════════════════════════════════════════════
insert into public.follows (follower_id, following_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-000000000001'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000005','aaaaaaaa-aaaa-4aaa-8aaa-000000000001'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000006','aaaaaaaa-aaaa-4aaa-8aaa-000000000001'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000007','aaaaaaaa-aaaa-4aaa-8aaa-000000000001'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000004'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000010','aaaaaaaa-aaaa-4aaa-8aaa-000000000004'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000002'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-000000000002'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000009','aaaaaaaa-aaaa-4aaa-8aaa-000000000008'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000012','aaaaaaaa-aaaa-4aaa-8aaa-000000000008'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000005','aaaaaaaa-aaaa-4aaa-8aaa-000000000012'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000007','aaaaaaaa-aaaa-4aaa-8aaa-000000000012'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000006'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000004','aaaaaaaa-aaaa-4aaa-8aaa-000000000006'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000011','aaaaaaaa-aaaa-4aaa-8aaa-000000000009')
on conflict do nothing;

-- ════════════════════════════════════════════════════════════════════════
-- Saved listings (bookmarks)
-- ════════════════════════════════════════════════════════════════════════
insert into public.saved_listings (user_id, listing_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000003','44444444-4444-4444-8444-000000000001'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000005','44444444-4444-4444-8444-000000000001'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000002','44444444-4444-4444-8444-000000000009'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000006','44444444-4444-4444-8444-000000000014'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000007','44444444-4444-4444-8444-000000000036'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000001','44444444-4444-4444-8444-000000000037'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000012','44444444-4444-4444-8444-000000000022'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000004','44444444-4444-4444-8444-000000000018'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000009','44444444-4444-4444-8444-000000000042'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000010','44444444-4444-4444-8444-000000000020'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000011','44444444-4444-4444-8444-000000000005'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-000000000008','44444444-4444-4444-8444-000000000033')
on conflict do nothing;

-- ════════════════════════════════════════════════════════════════════════
-- Conversations + participants + messages (3 demo threads)
-- ════════════════════════════════════════════════════════════════════════
insert into public.conversations (id, listing_id) values
  ('66666666-6666-4666-8666-000000000001','44444444-4444-4444-8444-000000000001'),
  ('66666666-6666-4666-8666-000000000002','44444444-4444-4444-8444-000000000004'),
  ('66666666-6666-4666-8666-000000000003','44444444-4444-4444-8444-000000000003'),
  ('66666666-6666-4666-8666-000000000004','44444444-4444-4444-8444-000000000014'),
  ('66666666-6666-4666-8666-000000000005','44444444-4444-4444-8444-000000000018'),
  ('66666666-6666-4666-8666-000000000006','44444444-4444-4444-8444-000000000036'),
  ('66666666-6666-4666-8666-000000000007','44444444-4444-4444-8444-000000000022'),
  ('66666666-6666-4666-8666-000000000008','44444444-4444-4444-8444-000000000037')
on conflict (id) do nothing;

insert into public.conversation_participants (conversation_id, user_id) values
  ('66666666-6666-4666-8666-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000003'),
  ('66666666-6666-4666-8666-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000001'),
  ('66666666-6666-4666-8666-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000005'),
  ('66666666-6666-4666-8666-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000004'),
  ('66666666-6666-4666-8666-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-000000000002'),
  ('66666666-6666-4666-8666-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-000000000003'),
  ('66666666-6666-4666-8666-000000000004','aaaaaaaa-aaaa-4aaa-8aaa-000000000006'),
  ('66666666-6666-4666-8666-000000000004','aaaaaaaa-aaaa-4aaa-8aaa-000000000007'),
  ('66666666-6666-4666-8666-000000000005','aaaaaaaa-aaaa-4aaa-8aaa-000000000009'),
  ('66666666-6666-4666-8666-000000000005','aaaaaaaa-aaaa-4aaa-8aaa-000000000011'),
  ('66666666-6666-4666-8666-000000000006','aaaaaaaa-aaaa-4aaa-8aaa-000000000010'),
  ('66666666-6666-4666-8666-000000000006','aaaaaaaa-aaaa-4aaa-8aaa-000000000005'),
  ('66666666-6666-4666-8666-000000000007','aaaaaaaa-aaaa-4aaa-8aaa-000000000012'),
  ('66666666-6666-4666-8666-000000000007','aaaaaaaa-aaaa-4aaa-8aaa-000000000003'),
  ('66666666-6666-4666-8666-000000000008','aaaaaaaa-aaaa-4aaa-8aaa-000000000001'),
  ('66666666-6666-4666-8666-000000000008','aaaaaaaa-aaaa-4aaa-8aaa-000000000006')
on conflict do nothing;

insert into public.messages (id, conversation_id, sender_id, body, is_read) values
  ('77777777-7777-4777-8777-000000000001','66666666-6666-4666-8666-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','السلام عليكم، هل الآيفون متاح للتبادل؟',true),
  ('77777777-7777-4777-8777-000000000002','66666666-6666-4666-8666-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','وعليكم السلام، نعم متاح. وش عندك للمبادلة؟',true),
  ('77777777-7777-4777-8777-000000000003','66666666-6666-4666-8666-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','عندي سامسونج S23 بحالة ممتازة.',false),
  ('77777777-7777-4777-8777-000000000004','66666666-6666-4666-8666-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','Is the AC still available?',true),
  ('77777777-7777-4777-8777-000000000005','66666666-6666-4666-8666-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000004','نعم متاح، تبغى تبادله بإيش؟',false),
  ('77777777-7777-4777-8777-000000000006','66666666-6666-4666-8666-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','هل طقم غرفة النوم ما زال متوفر؟',false),
  ('77777777-7777-4777-8777-000000000007','66666666-6666-4666-8666-000000000004','aaaaaaaa-aaaa-4aaa-8aaa-000000000006','Hi, is the MacBook still available to swap?',true),
  ('77777777-7777-4777-8777-000000000008','66666666-6666-4666-8666-000000000004','aaaaaaaa-aaaa-4aaa-8aaa-000000000007','Yes! What do you have to offer?',false),
  ('77777777-7777-4777-8777-000000000009','66666666-6666-4666-8666-000000000005','aaaaaaaa-aaaa-4aaa-8aaa-000000000009','أبي أبادل البلايستيشن باكس بوكس، يناسبك؟',false),
  ('77777777-7777-4777-8777-000000000010','66666666-6666-4666-8666-000000000006','aaaaaaaa-aaaa-4aaa-8aaa-000000000010','هل الآيباد مع القلم؟',true),
  ('77777777-7777-4777-8777-000000000011','66666666-6666-4666-8666-000000000006','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','Yes, Apple Pencil included.',false),
  ('77777777-7777-4777-8777-000000000012','66666666-6666-4666-8666-000000000007','aaaaaaaa-aaaa-4aaa-8aaa-000000000012','السلام عليكم، الساعة أصلية؟',false),
  ('77777777-7777-4777-8777-000000000013','66666666-6666-4666-8666-000000000008','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','مهتم بالباترول، نتفاهم على الفرق؟',true),
  ('77777777-7777-4777-8777-000000000014','66666666-6666-4666-8666-000000000008','aaaaaaaa-aaaa-4aaa-8aaa-000000000006','أهلاً، أرسل عرضك وأشوف.',false)
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════
-- Reports (demo moderation queue)
-- ════════════════════════════════════════════════════════════════════════
insert into public.reports (id, reporter_id, target_type, target_id, reason, description, status) values
  ('88888888-8888-4888-8888-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','listing','44444444-4444-4444-8444-000000000007','spam','يبدو إعلان مكرر.','pending'),
  ('88888888-8888-4888-8888-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','user','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','inappropriate','سلوك غير لائق في المحادثة.','pending'),
  ('88888888-8888-4888-8888-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-000000000010','message','77777777-7777-4777-8777-000000000009','scam','محاولة احتيال محتملة.','reviewed'),
  ('88888888-8888-4888-8888-000000000004','aaaaaaaa-aaaa-4aaa-8aaa-000000000008','listing','44444444-4444-4444-8444-000000000039','inappropriate','محتوى غير مناسب.','resolved')
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════
-- Admin actions (audit log examples — admin = ahmed)
-- ════════════════════════════════════════════════════════════════════════
insert into public.admin_actions (id, admin_id, action_type, target_type, target_id, notes) values
  ('aaaa0000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','update_report','report','88888888-8888-4888-8888-000000000004','resolved'),
  ('aaaa0000-0000-4000-8000-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','update_listing','listing','44444444-4444-4444-8444-000000000039','hidden')
on conflict (id) do nothing;
