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
