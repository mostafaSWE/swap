-- ════════════════════════════════════════════════════════════════════════
-- Swap — DATABASE RESET (run BEFORE full_setup.sql)
--
-- WHY: the schema changed (Session 3 added the swap-proposals tables; Session 4
-- dropped account/item verification and added profiles.completed_swaps_count).
-- A plain re-run of full_setup.sql is idempotent and therefore CANNOT drop the
-- now-removed columns/tables (`profiles.is_verified`, `listings.is_verified_item`,
-- `verification_requests`) nor add new columns to already-existing tables
-- (`create table if not exists` is a no-op once the table exists). The clean fix
-- for the DEMO database is to drop and recreate the public schema, then re-run
-- full_setup.sql to rebuild everything from scratch.
--
-- HOW: In the Supabase Dashboard → SQL Editor, run THIS file first, then run
-- supabase/full_setup.sql. (Both are safe to re-run.) This wipes all PUBLIC
-- data — demo only, by design. It does NOT touch auth.users or storage objects.
--
-- IMPORTANT: dropping & recreating `public` also drops the default privileges
-- Supabase relies on, so this file RESTORES the standard role grants that
-- full_setup.sql does not set itself. Without these, PostgREST / the anon &
-- authenticated clients lose access after a reset.
-- ════════════════════════════════════════════════════════════════════════

-- 1. Drop everything in the public schema (demo data only).
drop schema if exists public cascade;
create schema public;

-- 2. Restore ownership + the standard Supabase role grants on the schema.
alter schema public owner to postgres;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant create on schema public to postgres, service_role;

-- 3. Existing objects (this file creates none, but harmless + future-proof).
grant all on all tables    in schema public to postgres, anon, authenticated, service_role;
grant all on all routines  in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;

-- 4. Default privileges so EVERY object full_setup.sql creates next is granted
--    automatically (RLS still gates anon/authenticated row access per-table).
alter default privileges in schema public
  grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;

-- ➡ Now run supabase/full_setup.sql in the same SQL Editor session.
