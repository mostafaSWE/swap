-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0012 Email-verification gate (data layer)
-- Run after 0005_proposals.sql (and the rest of 0001–0011).
--
-- WHY: The NestJS API gates create-listing / propose-swap / send-message behind a
-- confirmed email (EmailVerifiedGuard). But the web/mobile clients can also write
-- these tables DIRECTLY via supabase-js (the API is an optional layer — see
-- NewListingForm's fallback path), and those writes are governed by RLS, not the
-- API. The existing INSERT policies only check auth.uid(), so a logged-in but
-- UNVERIFIED user could bypass the API gate by writing straight to Postgres.
--
-- This migration mirrors the API gate at the data layer: the same three INSERTs now
-- also require a confirmed email. The service-role key (used by the API) BYPASSES
-- RLS, so the API path is unaffected — the API keeps enforcing via EmailVerifiedGuard.
--
-- NOTE: If Supabase Auth "Confirm email" is ON, unverified users never get a session
-- at all (auth.uid() is null → every owner check already fails), so this is belt-and-
-- suspenders. It also keeps the gate intact if that setting is ever turned off.
-- ════════════════════════════════════════════════════════════════════════

-- Is the CURRENT request's user a confirmed-email account?
-- security definer so it can read auth.users; auth.uid() still resolves to the
-- request's JWT subject inside a definer function. Wrapped in a sub-select for
-- per-statement (not per-row) evaluation.
create or replace function public.is_email_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select u.email_confirmed_at is not null
      from auth.users u
      where u.id = (select auth.uid())
    ),
    false
  );
$$;

revoke all on function public.is_email_verified() from public;
grant execute on function public.is_email_verified() to authenticated, anon, service_role;

-- ── listings: creating a listing requires a confirmed email ──────────────
drop policy if exists "listings insert own" on public.listings;
create policy "listings insert own" on public.listings
  for insert with check (owner_id = auth.uid() and public.is_email_verified());

-- ── messages: sending a message requires a confirmed email ───────────────
drop policy if exists "messages send if participant" on public.messages;
create policy "messages send if participant" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id, auth.uid())
    and public.is_email_verified()
  );

-- ── swap_proposals: proposing/countering a swap requires a confirmed email ─
drop policy if exists "proposals insert own" on public.swap_proposals;
create policy "proposals insert own" on public.swap_proposals
  for insert with check (
    proposer_id = auth.uid()
    and last_actor_id = auth.uid()
    and public.is_email_verified()
  );
