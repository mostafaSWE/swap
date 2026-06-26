-- ════════════════════════════════════════════════════════════════════════
-- 0011_admin_back_office.sql
--
-- Admin accounts are BACK-OFFICE ONLY. An `is_admin` account administers the
-- platform via the admin panel — it must NOT participate in the marketplace as
-- a normal user (no publishing listings, proposing swaps, rating, reporting,
-- following, saving, or blocking).
--
-- Enforced with BEFORE INSERT triggers keyed on the row's ACTOR column
-- (owner_id / proposer_id / …), NOT auth.uid(). That is deliberate: triggers
-- fire for EVERY connecting role, so this single mechanism covers BOTH write
-- paths —
--   • direct Supabase (browser, RLS, auth.uid() = the user), and
--   • the NestJS API (service-role, where auth.uid() is null and RLS is
--     bypassed — so RLS alone could never cover it).
--
-- `messages` is intentionally NOT included: the admin panel legitimately
-- messages users (admin.service messageUser / requestListingEdits insert a row
-- with sender_id = the admin). Admin moderation otherwise UPDATEs rows
-- (listing/report status) and writes admin_actions — none of which are INSERTs
-- into the tables below, so no admin feature is affected.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.reject_admin_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_col text;
  actor uuid;
begin
  -- Pick the actor column per table, then extract its value dynamically. We go
  -- through to_jsonb(new) rather than a `new.<field>` CASE because the latter is
  -- type-checked against the firing table's row type as one expression and would
  -- fail (e.g. a `listings` row has no `proposer_id`).
  actor_col := case tg_table_name
    when 'listings'       then 'owner_id'
    when 'swap_proposals' then 'proposer_id'
    when 'ratings'        then 'rater_id'
    when 'reports'        then 'reporter_id'
    when 'follows'        then 'follower_id'
    when 'saved_listings' then 'user_id'
    when 'blocks'         then 'blocker_id'
  end;
  actor := (to_jsonb(new) ->> actor_col)::uuid;

  if actor is not null and public.is_admin(actor) then
    raise exception
      'Admin accounts are back-office only and cannot perform marketplace actions (%).',
      tg_table_name
      using errcode = '42501';  -- insufficient_privilege → 403 on the PostgREST path
  end if;

  return new;
end;
$$;

-- Attach the guard to every purely-participatory table.
do $$
declare
  t text;
begin
  foreach t in array array[
    'listings', 'swap_proposals', 'ratings', 'reports',
    'follows', 'saved_listings', 'blocks'
  ]
  loop
    execute format('drop trigger if exists reject_admin_actor on public.%I;', t);
    execute format(
      'create trigger reject_admin_actor before insert on public.%I '
      || 'for each row execute function public.reject_admin_actor();', t);
  end loop;
end$$;
