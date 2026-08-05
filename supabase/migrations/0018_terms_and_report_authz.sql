-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0018 Terms/EULA acceptance + report authorization (Phase M4 — Apple 1.2)
--
-- Three additive trust & safety features, all idempotent + reversible:
--
--   1) Versioned Terms/EULA acceptance. Two nullable columns on profiles record
--      WHICH terms version the user accepted and WHEN. A user must (re-)accept
--      when their accepted version is NULL or < the current version. The current
--      version is a DB function `current_terms_version()` that MIRRORS the app
--      constant `TERMS_VERSION` (@swap/config) — bump BOTH together when the terms
--      change. Acceptance is server-stamped (POST /me/terms) so the client cannot
--      spoof a version it never saw.
--
--   2) A DATA-LAYER terms gate on the two core UGC "posting" tables — listings and
--      messages INSERT — so a hand-rolled / tampered client that bypasses the app
--      and the NestJS TermsGuard still cannot post without accepting (Apple 1.2
--      requires acceptance BEFORE posting, demonstrable to a reviewer). The NestJS
--      service-role client bypasses RLS by design, so the NestJS `TermsGuard`
--      enforces the same rule on the API paths — belt and suspenders.
--
--   3) Report authorization + de-duplication. The reports INSERT policy now
--      verifies that a MESSAGE / CONVERSATION report is filed by a PARTICIPANT of
--      that conversation (a user cannot report a message in a thread they are not
--      part of), and a partial unique index prevents a reporter from stacking
--      duplicate PENDING reports on the same target (re-reporting is allowed once
--      the prior report is resolved/rejected). The NestJS ReportsService enforces
--      the same participant check on its service-role path.
--
-- Run after 0017. Purely ADDITIVE + idempotent (add-column-if-not-exists /
-- create-or-replace / drop-policy-if-exists / create-index-if-not-exists), so it
-- applies on its own to an existing database with NO reset/reseed. Existing users
-- have terms_accepted_version = NULL and must accept on their next UGC write —
-- this is the intended "re-consent before first UGC" behaviour, not a bug.
--
-- ── ROLLBACK (reverse this migration) ────────────────────────────────────
--   -- restore the pre-0018 policies (from 0009 messages / 0002 listings+reports):
--   drop policy if exists "messages send if participant" on public.messages;   -- then re-create the 0009 body WITHOUT the terms clause
--   drop policy if exists "listings insert own" on public.listings;            -- then re-create with check (owner_id = auth.uid())
--   drop policy if exists "reports insert own" on public.reports;              -- then re-create with check (reporter_id = auth.uid())
--   drop index if exists public.reports_one_pending_per_reporter;
--   drop function if exists public.has_accepted_current_terms(uuid);
--   drop function if exists public.current_terms_version();
--   alter table public.profiles drop column if exists terms_accepted_version;
--   alter table public.profiles drop column if exists terms_accepted_at;
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. terms-acceptance columns (nullable, additive) ─────────────────────
alter table public.profiles
  add column if not exists terms_accepted_version int;
alter table public.profiles
  add column if not exists terms_accepted_at timestamptz;

-- ── current terms version (MIRRORS @swap/config TERMS_VERSION) ────────────
-- IMMUTABLE constant. Bump this integer in lockstep with TERMS_VERSION whenever
-- the Terms / zero-tolerance UGC policy change, to force global re-consent.
create or replace function public.current_terms_version()
returns int language sql immutable set search_path = public as $$
  select 1;
$$;
grant execute on function public.current_terms_version() to anon, authenticated, service_role;

-- has_accepted_current_terms(uid): true iff the user has accepted the CURRENT
-- terms version. SECURITY DEFINER so it can read profiles from inside an RLS
-- policy regardless of the caller; STABLE; null-safe (null uid / no row / null
-- version → false). Runs inside listings + messages INSERT policies.
create or replace function public.has_accepted_current_terms(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p.terms_accepted_version >= public.current_terms_version()
       from public.profiles p where p.id = uid),
    false
  );
$$;
grant execute on function public.has_accepted_current_terms(uuid) to anon, authenticated, service_role;

-- ── 2a. listings: require accepted terms to publish ──────────────────────
-- Re-defines the 0002 "listings insert own" policy, adding the terms gate.
-- (Service-role NestJS createListing bypasses RLS → gated by the NestJS TermsGuard.)
drop policy if exists "listings insert own" on public.listings;
create policy "listings insert own" on public.listings
  for insert with check (
    owner_id = auth.uid()
    and public.has_accepted_current_terms(auth.uid())
  );

-- ── 2b. messages: require accepted terms to send ─────────────────────────
-- Re-defines the "messages send if participant" policy — PRESERVES the 0009 block
-- guard (cannot send across a block) and adds the terms gate. Reading history is
-- unaffected (this is INSERT only). Mobile sends messages via the direct-Supabase
-- path, so this RLS is its real enforcement point; web/NestJS send is gated by
-- the TermsGuard on POST /conversations/:id/messages.
drop policy if exists "messages send if participant" on public.messages;
create policy "messages send if participant" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id, auth.uid())
    and not exists (
      select 1 from public.conversation_participants p2
      where p2.conversation_id = messages.conversation_id
        and p2.user_id <> auth.uid()
        and public.blocked_between(auth.uid(), p2.user_id)
    )
    and public.has_accepted_current_terms(auth.uid())
  );

-- ── 3a. reports: participant-scoped message/conversation reports ──────────
-- Re-defines the 0002 "reports insert own" policy. Listing/user targets are public
-- (anyone may report). A message/conversation report must be filed by a PARTICIPANT
-- of the referenced conversation — a user cannot report a thread they are not in,
-- and cannot probe for message ids they can't see. (Service-role NestJS create
-- bypasses RLS → the ReportsService performs the same participant check.)
drop policy if exists "reports insert own" on public.reports;
create policy "reports insert own" on public.reports
  for insert with check (
    reporter_id = auth.uid()
    and (
      target_type in ('listing', 'user')
      or (
        target_type = 'message'
        and exists (
          select 1 from public.messages m
          where m.id = reports.target_id
            and public.is_conversation_participant(m.conversation_id, auth.uid())
        )
      )
      or (
        target_type = 'conversation'
        and public.is_conversation_participant(reports.target_id, auth.uid())
      )
    )
  );

-- ── 3b. one pending report per reporter per target ───────────────────────
-- Prevents a reporter stacking duplicate PENDING reports on the same target (the
-- app surfaces an "already reported" state on the resulting 23505 / 409). Partial
-- on status='pending' so re-reporting is allowed once a prior report is
-- resolved/rejected. Distinct-reporter auto-hide (0009) is unaffected.
create unique index if not exists reports_one_pending_per_reporter
  on public.reports (reporter_id, target_type, target_id)
  where status = 'pending';
