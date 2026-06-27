-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0014 Identity uniqueness (phone unique + case-insensitive username)
-- Run after 0001_schema.sql (and ideally 0013).
--
-- Makes the three sign-up identifiers behave consistently:
--   • email     — already unique (Supabase Auth, auth.users).
--   • username  — was UNIQUE but CASE-SENSITIVE ('John' vs 'john' both allowed).
--                 Make it case-INSENSITIVE to match login (email_for_username, 0013).
--   • phone     — had NO uniqueness; now one account per number.
--
-- Plus a tiny availability-check RPC so the sign-up form can say "username/phone
-- already taken" instead of a generic error.
--
-- ⚠️ If existing rows already violate either new index (e.g. two profiles share a
-- phone, or two usernames differ only in case), the matching CREATE will FAIL —
-- dedup those rows first, then re-run.
-- ════════════════════════════════════════════════════════════════════════

-- ── username: case-insensitive uniqueness ───────────────────────────────
-- Create the new index FIRST (so the old constraint still guards if this fails),
-- then drop the redundant case-sensitive constraint.
create unique index if not exists profiles_username_lower_uq
  on public.profiles (lower(username));
alter table public.profiles drop constraint if exists profiles_username_key;

-- ── phone: one account per number (partial — many NULL/empty phones allowed) ─
create unique index if not exists profiles_phone_uq
  on public.profiles (phone)
  where phone is not null and phone <> '';

-- ── availability check for the sign-up form ──────────────────────────────
-- Returns 'username' or 'phone' for the first identifier already in use, else null.
-- security definer + stable; case-insensitive username match (mirrors the index).
create or replace function public.signup_identifier_taken(uname text, uphone text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.profiles where lower(username) = lower(uname)) then 'username'
    when uphone is not null and uphone <> ''
      and exists (select 1 from public.profiles where phone = uphone) then 'phone'
    else null
  end;
$$;

revoke all on function public.signup_identifier_taken(text, text) from public;
grant execute on function public.signup_identifier_taken(text, text) to anon, authenticated;
