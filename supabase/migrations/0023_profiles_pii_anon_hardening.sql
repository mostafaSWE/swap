-- 0023_profiles_pii_anon_hardening.sql — stop anonymous scraping of user email/phone.
--
-- THE PROBLEM
-- `profiles` RLS is `for select using (true)` (0002_rls.sql). RLS is ROW level, not
-- COLUMN level, so although every application query selects only public-safe columns,
-- nothing stopped an unauthenticated caller holding the (public, by design) anon key
-- from issuing a direct PostgREST request for the private ones:
--
--     GET /rest/v1/profiles?select=username,email,phone
--
-- and walking the entire user base. Verified against production before this migration:
-- the anon key returned email and phone for every row.
--
-- THE FIX
-- Column-level privileges for the `anon` role. A table-level GRANT covers every column,
-- and a column-level REVOKE does NOT override it, so we must revoke the table grant and
-- re-grant the safe columns explicitly.
--
-- SCOPE — deliberately `anon` only.
-- `authenticated` keeps full-row access because a signed-in user legitimately reads their
-- OWN email/phone: `getProfileById` (packages/api/src/queries/profiles.ts) does
-- `select("*")` and backs the mobile profile-edit and onboarding forms, which prefill the
-- phone field. Column privileges cannot be made row-conditional, so restricting
-- `authenticated` here would break the owner's own edit form.
--
-- Cross-user PII exposure BETWEEN signed-in users therefore still exists at the data
-- layer and is a known follow-up: the correct fix is a public-safe view (or column
-- privileges plus an owner-only view) and repointing every public read at it. That is a
-- wide refactor across packages/api queries and is tracked separately. This migration
-- closes the much larger hole — unauthenticated, no-account-required bulk collection.
--
-- Safe because every anonymously reachable read already names its columns:
--   • PUBLIC_PROFILE_COLUMNS (apps/api/src/common/db.constants.ts, packages/api queries)
--   • the `owner:profiles!…(…)` / `actor:` / `rater:` / `proposer:` embedded joins
--   • list_follows() returns a fixed public column list (0021/0022)
-- None of them reference email or phone.

revoke select on public.profiles from anon;

grant select (
  id,
  full_name,
  username,
  country_id,
  city_id,
  avatar_url,
  bio,
  preferred_language,
  is_admin,
  is_suspended,
  is_banned,
  suspended_until,
  suspension_reason,
  followers_count,
  following_count,
  listings_count,
  completed_swaps_count,
  rating,
  ratings_count,
  terms_accepted_version,
  terms_accepted_at,
  deleted_at,
  created_at,
  updated_at
) on public.profiles to anon;
