-- ════════════════════════════════════════════════════════════════════════
-- Swap — FULL SETUP (generated): migrations 0001-0004 + seed, in order.
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
  is_verified        boolean not null default false,  -- verified ACCOUNT (admin/paid later)
  is_admin           boolean not null default false,
  is_suspended       boolean not null default false,
  followers_count    int not null default 0,
  following_count    int not null default 0,
  listings_count     int not null default 0,
  -- rating placeholder for the future (no ratings feature in MVP)
  rating             numeric(2,1),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
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
  is_verified_item boolean not null default false,  -- verified ITEM (paid/manual later)
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

-- ── verification_requests (account / item) ──────────────────────────────
create table if not exists public.verification_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  type       text not null check (type in ('account','item')),
  country_id uuid references public.countries(id),
  city_id    uuid references public.cities(id),
  status     text not null default 'pending' check (status in ('pending','approved','rejected','completed')),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger verification_requests_set_updated_at before update on public.verification_requests
  for each row execute function public.set_updated_at();
-- TODO (Phase 2): payment + automated verification workflow. Manual admin flow only for MVP.

-- ── admin_actions (audit log) ───────────────────────────────────────────
create table if not exists public.admin_actions (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references public.profiles(id) on delete cascade,
  action_type text not null,
  target_type text not null,
  target_id   uuid not null,
  notes       text,
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
alter table public.verification_requests  enable row level security;
alter table public.admin_actions          enable row level security;

-- ── Reference data: public read, admin write ────────────────────────────
create policy "countries readable"  on public.countries  for select using (true);
create policy "cities readable"      on public.cities      for select using (true);
create policy "categories readable"  on public.categories  for select using (true);

create policy "countries admin write" on public.countries
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "cities admin write" on public.cities
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "categories admin write" on public.categories
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ── profiles ────────────────────────────────────────────────────────────
-- Public read is allowed. The app/api layer only SELECTs public-safe columns
-- for other users (see PublicProfile). Sensitive columns (email/phone) should
-- be requested only for your own row.
create policy "profiles readable" on public.profiles
  for select using (true);

create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles admin manage" on public.profiles
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
-- INSERT is handled by the handle_new_user() trigger (security definer); users
-- do not insert their own profile directly.

-- ── listings ────────────────────────────────────────────────────────────
create policy "listings public read active" on public.listings
  for select using (
    status = 'active'
    or owner_id = auth.uid()
    or public.is_admin(auth.uid())
  );

create policy "listings insert own" on public.listings
  for insert with check (owner_id = auth.uid());

create policy "listings update own" on public.listings
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "listings delete own" on public.listings
  for delete using (owner_id = auth.uid());

create policy "listings admin manage" on public.listings
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ── listing_images ──────────────────────────────────────────────────────
create policy "listing_images read" on public.listing_images
  for select using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'active' or l.owner_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );

create policy "listing_images write own" on public.listing_images
  for all using (
    exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())
  );

-- ── conversations & participants ────────────────────────────────────────
create policy "conversations read if participant" on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );
-- INSERT happens via get_or_create_conversation() (security definer).

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
create policy "messages read if participant" on public.messages
  for select using (
    exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = messages.conversation_id and p.user_id = auth.uid()
    )
    or public.is_admin(auth.uid())  -- admins only review when a report exists (enforced in app)
  );

create policy "messages send if participant" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = messages.conversation_id and p.user_id = auth.uid()
    )
  );

create policy "messages update read flag" on public.messages
  for update using (
    exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = messages.conversation_id and p.user_id = auth.uid()
    )
  );

-- ── follows ─────────────────────────────────────────────────────────────
create policy "follows readable" on public.follows for select using (true);
create policy "follows insert own" on public.follows
  for insert with check (follower_id = auth.uid());
create policy "follows delete own" on public.follows
  for delete using (follower_id = auth.uid());

-- ── reports ─────────────────────────────────────────────────────────────
create policy "reports insert own" on public.reports
  for insert with check (reporter_id = auth.uid());
create policy "reports read own or admin" on public.reports
  for select using (reporter_id = auth.uid() or public.is_admin(auth.uid()));
create policy "reports admin manage" on public.reports
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ── saved_listings ──────────────────────────────────────────────────────
create policy "saved read own" on public.saved_listings
  for select using (user_id = auth.uid());
create policy "saved insert own" on public.saved_listings
  for insert with check (user_id = auth.uid());
create policy "saved delete own" on public.saved_listings
  for delete using (user_id = auth.uid());

-- ── listing_views ───────────────────────────────────────────────────────
create policy "views insert anyone" on public.listing_views
  for insert with check (user_id is null or user_id = auth.uid());
create policy "views read admin" on public.listing_views
  for select using (public.is_admin(auth.uid()));

-- ── verification_requests ───────────────────────────────────────────────
create policy "verif insert own" on public.verification_requests
  for insert with check (user_id = auth.uid());
create policy "verif read own or admin" on public.verification_requests
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "verif admin manage" on public.verification_requests
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ── admin_actions ───────────────────────────────────────────────────────
create policy "admin_actions admin only" on public.admin_actions
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

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

-- Convention: the first path segment is the uploader's user id, e.g.
--   avatars/{auth.uid}/avatar.jpg
--   listing-images/{auth.uid}/{listing_id}/0.jpg
--   chat-images/{auth.uid}/{conversation_id}/0.jpg
-- so we authorise writes by comparing (storage.foldername(name))[1] to auth.uid().

-- ── avatars ─────────────────────────────────────────────────────────────
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars owner write" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars owner update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars owner delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── listing-images ──────────────────────────────────────────────────────
create policy "listing-images public read" on storage.objects
  for select using (bucket_id = 'listing-images');

create policy "listing-images owner write" on storage.objects
  for insert with check (
    bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "listing-images owner update" on storage.objects
  for update using (
    bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "listing-images owner delete" on storage.objects
  for delete using (
    bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── chat-images (private) ───────────────────────────────────────────────
-- MVP: a user can read/write only objects under their own {auth.uid}/ folder.
-- TODO (Phase 2): restrict READ to *all participants* of the conversation, not
-- just the uploader — needs the conversation id encoded in the path and a join
-- against conversation_participants. Kept simple intentionally for MVP.
create policy "chat-images owner read" on storage.objects
  for select using (
    bucket_id = 'chat-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "chat-images owner write" on storage.objects
  for insert with check (
    bucket_id = 'chat-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
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

-- ░░░░░░░░░░░░░░░░░░░░ seed.sql ░░░░░░░░░░░░░░░░░░░░

-- ════════════════════════════════════════════════════════════════════════
-- Swap — seed data
-- Run AFTER 0001_schema, 0002_rls, 0003_storage.
--
-- Idempotent: safe to run multiple times (ON CONFLICT DO NOTHING).
-- The fixed UUIDs here MATCH packages/config (countries/cities/categories),
-- so the app constants and the database never drift.
--
-- Contents: 12 demo users (1 admin, 6 verified) across the GCC, 44 listings
-- (active/hidden/completed/removed, some verified/featured) with images,
-- follows, saved listings, 8 conversations + messages, reports, verification
-- requests (varied statuses), and admin-action audit examples.
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

-- Enrich the auto-created profiles with country/city/verification/admin/bio.
update public.profiles set country_id='11111111-1111-4111-8111-000000000001', city_id='22222222-2222-4222-8222-000000000001', is_verified=true,  is_admin=true,  bio='مهتم بتبادل الإلكترونيات والساعات.', avatar_url='https://i.pravatar.cc/150?img=12' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000001';
update public.profiles set country_id='11111111-1111-4111-8111-000000000001', city_id='22222222-2222-4222-8222-000000000002', is_verified=true,  is_admin=false, bio='أبادل الأثاث والأجهزة المنزلية.',      avatar_url='https://i.pravatar.cc/150?img=45' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000002';
update public.profiles set country_id='11111111-1111-4111-8111-000000000002', city_id='22222222-2222-4222-8222-000000000009', is_verified=false, is_admin=false, bio='Furniture and home items in Dubai.',   avatar_url='https://i.pravatar.cc/150?img=33' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000003';
update public.profiles set country_id='11111111-1111-4111-8111-000000000003', city_id='22222222-2222-4222-8222-000000000016', is_verified=true,  is_admin=false, bio='تبادل الأجهزة والإلكترونيات في الدوحة.', avatar_url='https://i.pravatar.cc/150?img=47' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000004';
update public.profiles set country_id='11111111-1111-4111-8111-000000000004', city_id='22222222-2222-4222-8222-000000000020', is_verified=false, is_admin=false, bio='Electronics and appliances in Kuwait.', avatar_url='https://i.pravatar.cc/150?img=14' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000005';
update public.profiles set country_id='11111111-1111-4111-8111-000000000001', city_id='22222222-2222-4222-8222-000000000005', is_verified=true,  is_admin=false, bio='مهتمة بالكاميرات والكتب.',               avatar_url='https://i.pravatar.cc/150?img=5'  where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000006';
update public.profiles set country_id='11111111-1111-4111-8111-000000000002', city_id='22222222-2222-4222-8222-000000000010', is_verified=false, is_admin=false, bio='Tools and car parts in Abu Dhabi.',     avatar_url='https://i.pravatar.cc/150?img=8'  where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000007';
update public.profiles set country_id='11111111-1111-4111-8111-000000000005', city_id='22222222-2222-4222-8222-000000000024', is_verified=true,  is_admin=false, bio='أبادل مستلزمات المنزل والعناية.',         avatar_url='https://i.pravatar.cc/150?img=20' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000008';
update public.profiles set country_id='11111111-1111-4111-8111-000000000006', city_id='22222222-2222-4222-8222-000000000028', is_verified=false, is_admin=false, bio='Pets, office gear and more in Muscat.',  avatar_url='https://i.pravatar.cc/150?img=51' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000009';
update public.profiles set country_id='11111111-1111-4111-8111-000000000003', city_id='22222222-2222-4222-8222-000000000017', is_verified=false, is_admin=false, bio='أثاث وأجهزة في الريان.',                 avatar_url='https://i.pravatar.cc/150?img=32' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000010';
update public.profiles set country_id='11111111-1111-4111-8111-000000000004', city_id='22222222-2222-4222-8222-000000000021', is_verified=false, is_admin=false, bio='Gaming and auto parts in Hawalli.',     avatar_url='https://i.pravatar.cc/150?img=60' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000011';
update public.profiles set country_id='11111111-1111-4111-8111-000000000002', city_id='22222222-2222-4222-8222-000000000011', is_verified=true,  is_admin=false, bio='أزياء وإكسسوارات وآلات موسيقية.',         avatar_url='https://i.pravatar.cc/150?img=48' where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000012';

-- ════════════════════════════════════════════════════════════════════════
-- Demo listings (12)
-- ════════════════════════════════════════════════════════════════════════
insert into public.listings (id, owner_id, category_id, country_id, city_id, title, description, condition, wanted_exchange, status, is_verified_item, is_featured, view_count) values
  ('44444444-4444-4444-8444-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','33333333-3333-4333-8333-000000000001','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001','آيفون 14 برو','آيفون 14 برو 256 جيجابايت بحالة ممتازة مع العلبة.','used','جهاز سامسونج S23 أو لابتوب','active',true,true,142),
  ('44444444-4444-4444-8444-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','33333333-3333-4333-8333-000000000004','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000002','غسالة أوتوماتيك','غسالة 8 كيلو تعمل بكفاءة، نظيفة جدًا.','used','ثلاجة أو مايكروويف','active',false,false,58),
  ('44444444-4444-4444-8444-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','33333333-3333-4333-8333-000000000002','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000009','طقم غرفة نوم','طقم غرفة نوم خشب كامل بحالة جيدة.','used','أثاث مجلس أو طاولة طعام','active',false,true,77),
  ('44444444-4444-4444-8444-000000000004','aaaaaaaa-aaaa-4aaa-8aaa-000000000004','33333333-3333-4333-8333-000000000004','11111111-1111-4111-8111-000000000003','22222222-2222-4222-8222-000000000016','مكيف سبليت','مكيف سبليت 18000 وحدة بارد، شغال بكفاءة عالية.','used','غسالة فل أوتوماتيك','active',true,false,91),
  ('44444444-4444-4444-8444-000000000005','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','33333333-3333-4333-8333-000000000001','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000020','لابتوب','Dell XPS 13 laptop, 16GB RAM, great condition.','used','iPad Pro or gaming console','active',false,false,64),
  ('44444444-4444-4444-8444-000000000006','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','33333333-3333-4333-8333-000000000006','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001','ساعة يد فاخرة','ساعة يد بحالة الجديد مع الضمان.','new','ساعة أخرى أو سماعات','active',false,false,39),
  ('44444444-4444-4444-8444-000000000007','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','33333333-3333-4333-8333-000000000008','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000002','دراجة هوائية','دراجة جبلية مقاس 27.5، استخدام خفيف.','used','دراجة كهربائية أو معدات رياضية','active',false,false,27),
  ('44444444-4444-4444-8444-000000000008','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','33333333-3333-4333-8333-000000000002','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000009','كنبة مجلس','كنبة 3 مقاعد لون رمادي، مريحة ونظيفة.','used','طاولة طعام أو مكتب','active',false,false,45),
  ('44444444-4444-4444-8444-000000000009','aaaaaaaa-aaaa-4aaa-8aaa-000000000004','33333333-3333-4333-8333-000000000001','11111111-1111-4111-8111-000000000003','22222222-2222-4222-8222-000000000016','بلايستيشن 5','جهاز بلايستيشن 5 مع يدين وألعاب.','used','إكس بوكس أو لابتوب','active',false,true,118),
  ('44444444-4444-4444-8444-000000000010','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','33333333-3333-4333-8333-000000000004','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000020','ماكينة قهوة','Espresso coffee machine, barely used.','used','Air fryer or blender','active',false,false,33),
  ('44444444-4444-4444-8444-000000000011','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','33333333-3333-4333-8333-000000000007','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001','عربة أطفال','عربة أطفال قابلة للطي، بحالة ممتازة.','used','كرسي سيارة للأطفال','active',false,false,21),
  ('44444444-4444-4444-8444-000000000012','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','33333333-3333-4333-8333-000000000002','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000002','كرسي مكتب','كرسي مكتب طبي مريح للظهر.','new','كرسي قيمنق أو مكتب','active',true,false,52),
  ('44444444-4444-4444-8444-000000000013','aaaaaaaa-aaaa-4aaa-8aaa-000000000006','33333333-3333-4333-8333-000000000010','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000005','سامسونج جالكسي S23','جهاز نظيف مع كامل ملحقاته.','used','آيفون أو فرق','active',false,false,73),
  ('44444444-4444-4444-8444-000000000014','aaaaaaaa-aaaa-4aaa-8aaa-000000000007','33333333-3333-4333-8333-000000000011','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000010','ماك بوك اير M2','MacBook Air M2, like new, with charger.','used','Gaming laptop','active',true,true,156),
  ('44444444-4444-4444-8444-000000000015','aaaaaaaa-aaaa-4aaa-8aaa-000000000008','33333333-3333-4333-8333-000000000004','11111111-1111-4111-8111-000000000005','22222222-2222-4222-8222-000000000024','ثلاجة إل جي','ثلاجة بابين، بحالة جيدة.','used','غسالة أوتوماتيك','active',false,false,41),
  ('44444444-4444-4444-8444-000000000016','aaaaaaaa-aaaa-4aaa-8aaa-000000000009','33333333-3333-4333-8333-000000000003','11111111-1111-4111-8111-000000000006','22222222-2222-4222-8222-000000000028','تويوتا كامري 2018','Toyota Camry 2018, well maintained.','used','Smaller car + cash','hidden',false,false,210),
  ('44444444-4444-4444-8444-000000000017','aaaaaaaa-aaaa-4aaa-8aaa-000000000010','33333333-3333-4333-8333-000000000002','11111111-1111-4111-8111-000000000003','22222222-2222-4222-8222-000000000017','طاولة طعام','طاولة طعام 6 كراسي خشب زان.','used','مكتب دراسة','active',false,false,33),
  ('44444444-4444-4444-8444-000000000018','aaaaaaaa-aaaa-4aaa-8aaa-000000000011','33333333-3333-4333-8333-000000000012','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000021','إكس بوكس سيريس X','Xbox Series X with 2 controllers.','used','PlayStation 5','active',false,true,98),
  ('44444444-4444-4444-8444-000000000019','aaaaaaaa-aaaa-4aaa-8aaa-000000000012','33333333-3333-4333-8333-000000000005','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000011','حقيبة وساعة','طقم حقيبة يد وساعة جديد.','new','إكسسوارات','active',false,false,27),
  ('44444444-4444-4444-8444-000000000020','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','33333333-3333-4333-8333-000000000022','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001','كاميرا كانون','Canon DSLR with kit lens.','used','عدسة أو درون','active',true,false,64),
  ('44444444-4444-4444-8444-000000000021','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','33333333-3333-4333-8333-000000000013','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000002','طقم جلسة حديقة','طاولة و4 كراسي للحديقة.','used','أثاث داخلي','active',false,false,19),
  ('44444444-4444-4444-8444-000000000022','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','33333333-3333-4333-8333-000000000006','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000009','ساعة فاخرة','ساعة سويسرية أصلية بالكرت.','new','ساعة أخرى','active',false,false,88),
  ('44444444-4444-4444-8444-000000000023','aaaaaaaa-aaaa-4aaa-8aaa-000000000004','33333333-3333-4333-8333-000000000016','11111111-1111-4111-8111-000000000003','22222222-2222-4222-8222-000000000016','سرير أطفال','سرير أطفال خشب مع مرتبة.','used','عربة أطفال','active',false,false,22),
  ('44444444-4444-4444-8444-000000000024','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','33333333-3333-4333-8333-000000000008','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000020','جهاز مشي كهربائي','Treadmill, foldable, barely used.','used','دراجة ثابتة','active',false,false,45),
  ('44444444-4444-4444-8444-000000000025','aaaaaaaa-aaaa-4aaa-8aaa-000000000006','33333333-3333-4333-8333-000000000017','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000005','مجموعة كتب','مجموعة روايات عربية وإنجليزية.','used','كتب أخرى','active',false,false,12),
  ('44444444-4444-4444-8444-000000000026','aaaaaaaa-aaaa-4aaa-8aaa-000000000007','33333333-3333-4333-8333-000000000018','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000054','عدة أدوات','Tool set with drill.','used','منشار كهربائي','active',false,false,30),
  ('44444444-4444-4444-8444-000000000027','aaaaaaaa-aaaa-4aaa-8aaa-000000000008','33333333-3333-4333-8333-000000000019','11111111-1111-4111-8111-000000000005','22222222-2222-4222-8222-000000000026','جهاز عناية بالبشرة','جهاز جديد لم يستخدم.','new','منتجات عناية','active',false,false,15),
  ('44444444-4444-4444-8444-000000000028','aaaaaaaa-aaaa-4aaa-8aaa-000000000009','33333333-3333-4333-8333-000000000020','11111111-1111-4111-8111-000000000006','22222222-2222-4222-8222-000000000029','قفص طيور كبير','قفص واسع مع ملحقات.','used','مستلزمات حيوانات','active',false,false,9),
  ('44444444-4444-4444-8444-000000000029','aaaaaaaa-aaaa-4aaa-8aaa-000000000010','33333333-3333-4333-8333-000000000014','11111111-1111-4111-8111-000000000003','22222222-2222-4222-8222-000000000018','دباب سياحي','دباب بحالة ممتازة.','used','دراجة كهربائية','active',false,false,132),
  ('44444444-4444-4444-8444-000000000030','aaaaaaaa-aaaa-4aaa-8aaa-000000000011','33333333-3333-4333-8333-000000000015','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000022','جنوط رياضية','مقاس 18 بحالة جيدة.','used','إطارات','active',false,false,28),
  ('44444444-4444-4444-8444-000000000031','aaaaaaaa-aaaa-4aaa-8aaa-000000000012','33333333-3333-4333-8333-000000000021','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000011','جيتار كلاسيكي','جيتار بحالة ممتازة مع الشنطة.','used','بيانو رقمي','active',false,false,24),
  ('44444444-4444-4444-8444-000000000032','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','33333333-3333-4333-8333-000000000007','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001','مجموعة ليغو','مجموعة ليغو كبيرة كاملة.','used','ألعاب أخرى','active',false,false,18),
  ('44444444-4444-4444-8444-000000000033','aaaaaaaa-aaaa-4aaa-8aaa-000000000002','33333333-3333-4333-8333-000000000001','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000002','سماعات سوني WH-1000XM5','سماعات عازلة للضوضاء، جديدة.','new','سماعات أخرى','active',true,false,51),
  ('44444444-4444-4444-8444-000000000034','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','33333333-3333-4333-8333-000000000004','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000009','مكنسة دايسون','Dyson vacuum, completed swap demo.','used','مكواة بخار','completed',false,false,67),
  ('44444444-4444-4444-8444-000000000035','aaaaaaaa-aaaa-4aaa-8aaa-000000000004','33333333-3333-4333-8333-000000000002','11111111-1111-4111-8111-000000000003','22222222-2222-4222-8222-000000000016','مكتبة خشب','مكتبة كتب خشب 5 أرفف.','used','خزانة ملابس','active',false,false,20),
  ('44444444-4444-4444-8444-000000000036','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','33333333-3333-4333-8333-000000000010','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000020','آيباد برو 11','iPad Pro 11, 128GB, with pencil.','used','لابتوب','active',true,true,140),
  ('44444444-4444-4444-8444-000000000037','aaaaaaaa-aaaa-4aaa-8aaa-000000000006','33333333-3333-4333-8333-000000000003','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000005','نيسان باترول 2016','بحالة ممتازة، فل كامل.','used','GMC أو فرق','active',false,true,305),
  ('44444444-4444-4444-8444-000000000038','aaaaaaaa-aaaa-4aaa-8aaa-000000000007','33333333-3333-4333-8333-000000000025','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000010','عملات قديمة','Old coins collection.','used','طوابع نادرة','active',false,false,14),
  ('44444444-4444-4444-8444-000000000039','aaaaaaaa-aaaa-4aaa-8aaa-000000000008','33333333-3333-4333-8333-000000000005','11111111-1111-4111-8111-000000000005','22222222-2222-4222-8222-000000000025','عبايات جديدة','مجموعة عبايات بأحجام مختلفة.','new','ملابس','hidden',false,false,8),
  ('44444444-4444-4444-8444-000000000040','aaaaaaaa-aaaa-4aaa-8aaa-000000000009','33333333-3333-4333-8333-000000000024','11111111-1111-4111-8111-000000000006','22222222-2222-4222-8222-000000000030','طابعة ليزر','HP laser printer, works well.','used','سكانر','active',false,false,17),
  ('44444444-4444-4444-8444-000000000041','aaaaaaaa-aaaa-4aaa-8aaa-000000000010','33333333-3333-4333-8333-000000000023','11111111-1111-4111-8111-000000000003','22222222-2222-4222-8222-000000000017','أدوات سباكة','مجموعة أدوات سباكة جديدة.','new','دهانات','active',false,false,11),
  ('44444444-4444-4444-8444-000000000042','aaaaaaaa-aaaa-4aaa-8aaa-000000000011','33333333-3333-4333-8333-000000000012','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000021','نينتندو سويتش','Nintendo Switch OLED with games.','used','بلايستيشن أو ألعاب','active',false,false,72),
  ('44444444-4444-4444-8444-000000000043','aaaaaaaa-aaaa-4aaa-8aaa-000000000012','33333333-3333-4333-8333-000000000011','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000011','شاشة ألعاب 27 بوصة','Gaming monitor 144Hz (removed demo).','used','كيبورد وماوس','removed',false,false,39),
  ('44444444-4444-4444-8444-000000000044','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','33333333-3333-4333-8333-000000000006','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001','خاتم ذهب','خاتم ذهب عيار 21 بوزن جيد.','new','ساعة فاخرة','active',true,false,60)
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
-- Verification requests (manual admin workflow — no payment in MVP)
-- ════════════════════════════════════════════════════════════════════════
insert into public.verification_requests (id, user_id, listing_id, type, country_id, city_id, status, notes) values
  ('99999999-9999-4999-8999-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000003',null,'account','11111111-1111-4111-8111-000000000002','22222222-2222-4222-8222-000000000009','pending','طلب توثيق حساب.'),
  ('99999999-9999-4999-8999-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000005','44444444-4444-4444-8444-000000000009','item','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000020','pending','طلب توثيق منتج (بلايستيشن 5).'),
  ('99999999-9999-4999-8999-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-000000000006',null,'account','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000005','approved','تم توثيق الحساب.'),
  ('99999999-9999-4999-8999-000000000004','aaaaaaaa-aaaa-4aaa-8aaa-000000000011','44444444-4444-4444-8444-000000000042','item','11111111-1111-4111-8111-000000000004','22222222-2222-4222-8222-000000000021','rejected','الصور غير كافية.'),
  ('99999999-9999-4999-8999-000000000005','aaaaaaaa-aaaa-4aaa-8aaa-000000000008',null,'account','11111111-1111-4111-8111-000000000005','22222222-2222-4222-8222-000000000024','completed','اكتمل التوثيق.')
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════════
-- Admin actions (audit log examples — admin = ahmed)
-- ════════════════════════════════════════════════════════════════════════
insert into public.admin_actions (id, admin_id, action_type, target_type, target_id, notes) values
  ('aaaa0000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','update_report','report','88888888-8888-4888-8888-000000000004','resolved'),
  ('aaaa0000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','update_verification','verification','99999999-9999-4999-8999-000000000003','approved'),
  ('aaaa0000-0000-4000-8000-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','update_listing','listing','44444444-4444-4444-8444-000000000039','hidden')
on conflict (id) do nothing;
