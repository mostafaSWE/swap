-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0010 admin moderation (Phase 5)
-- Adds the account-state columns the admin panel needs to suspend (with a
-- duration + reason) and ban users. Purely ADDITIVE + idempotent.
--
--   • is_banned         — permanent ban. The AuthGuard rejects banned users on
--                         every authenticated request (same as suspension).
--   • suspended_until    — when a temporary suspension lifts (NULL while
--                         is_suspended = true means an indefinite suspension).
--                         The AuthGuard treats an expired suspension as lifted.
--   • suspension_reason  — admin-supplied reason; shown to the user so they know
--                         why (same read posture as email/phone — see note).
--
-- DELIBERATELY NOT a column: admin notes about a user. Those live in
-- `admin_actions` (action_type = 'note', target_type = 'user') which is
-- admin-only readable, so moderator notes never leak through the public-read
-- `profiles` policy. The user-detail "notes / action history" reads them back.
--
-- Report severity is derived in the app from the report `reason` (a fixed set:
-- scam > inappropriate > spam > other), so no column is added here.
--
-- Run after 0009. No new RLS: the existing "profiles admin manage" (write) and
-- "profiles readable" (read) policies already cover these columns. The app layer
-- only SELECTs public-safe columns for other users, exactly as it does for
-- email/phone today.
-- ════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists is_banned        boolean not null default false;
alter table public.profiles
  add column if not exists suspended_until   timestamptz;
alter table public.profiles
  add column if not exists suspension_reason text;

-- Audit trail: record the actor IP alongside each admin action (spec §4.1
-- "actor, action, target, timestamp, IP"). Captured by the controller (@Ip()).
alter table public.admin_actions
  add column if not exists ip text;
