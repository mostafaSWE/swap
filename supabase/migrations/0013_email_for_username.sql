-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0013 Username login support
-- Run after 0001_schema.sql (needs public.profiles + auth.users).
--
-- Lets users sign in with their USERNAME as well as their email. The web login
-- form resolves a username to its account email via this function, then calls
-- supabase.auth.signInWithPassword({ email, password }).
--
-- security definer so it can read auth.users; case-insensitive EXACT match (not
-- ILIKE — usernames may contain '_', an ILIKE wildcard). Joins auth.users for the
-- LIVE email (not the possibly-stale profiles.email copy).
--
-- NOTE: this lets an anonymous caller resolve a username to an email (enumeration).
-- That is inherent to username login and already possible via the public-read
-- profiles RLS; the function just provides a correct, controlled interface.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.email_for_username(uname text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(uname)
  limit 1;
$$;

revoke all on function public.email_for_username(text) from public;
grant execute on function public.email_for_username(text) to anon, authenticated;
