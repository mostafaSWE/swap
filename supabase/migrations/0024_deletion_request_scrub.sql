-- 0024_deletion_request_scrub.sql — close the re-identification hole left by 0022.
--
-- THE PROBLEM
-- `account_deletion_requests` (0022) stores the requester's plaintext `email` and a
-- `user_id` pointing at the profile. `delete_account()` never touched that table, so a
-- user who asked to be deleted through the PUBLIC WEB FORM left behind a permanent
-- email-address → tombstone-profile-id mapping. That same profile id is still the
-- sender_id / rater_id / reporter_id on every retained message, rating and report, so
-- the "de-identified" retained activity was in fact trivially re-identifiable — for
-- exactly the people who took the trouble to ask for erasure.
--
-- THE FIX
-- When the account is actually deleted, close out any matching request row and strip
-- its identifiers. The row survives only as a dated audit record that a request was
-- received and completed, which is what a regulator wants to see; it no longer carries
-- an email or a link back to the tombstone.
--
-- Redefines delete_account() from 0022 — body is unchanged except for the new step (d).

create or replace function public.delete_account(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_suffix   text;
  v_listings int;
  v_is_admin boolean;
  v_email    text;
begin
  if p_user_id is null then
    raise exception 'user_id_required' using errcode = '22023';
  end if;

  select is_admin, email into v_is_admin, v_email from public.profiles where id = p_user_id;
  if v_is_admin is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  if v_is_admin then
    raise exception 'admin_cannot_self_delete' using errcode = '42501';
  end if;

  if exists (select 1 from public.profiles where id = p_user_id and deleted_at is not null) then
    return jsonb_build_object('ok', true, 'already_deleted', true);
  end if;

  v_suffix := substr(replace(p_user_id::text, '-', ''), 1, 12);

  -- ── a. Take every listing out of circulation ──────────────────────────
  update public.listings
     set status = 'removed'
   where owner_id = p_user_id and status <> 'removed';
  get diagnostics v_listings = row_count;

  delete from public.listing_images
   where listing_id in (select id from public.listings where owner_id = p_user_id);

  -- ── b. Purge rows that are personal to this user alone ────────────────
  delete from public.saved_listings  where user_id = p_user_id;
  delete from public.device_tokens   where user_id = p_user_id;
  delete from public.push_outbox     where user_id = p_user_id;
  delete from public.notifications   where user_id = p_user_id;
  delete from public.listing_views   where user_id = p_user_id;
  delete from public.follows where follower_id = p_user_id or following_id = p_user_id;
  delete from public.blocks  where blocker_id  = p_user_id or blocked_id   = p_user_id;

  -- ── c. Anonymise the profile into a tombstone ─────────────────────────
  update public.profiles
     set full_name              = 'Deleted user',
         username               = 'deleted_' || v_suffix,
         email                  = null,
         phone                  = null,
         avatar_url             = null,
         bio                    = null,
         country_id             = null,
         city_id                = null,
         is_suspended           = false,
         suspended_until        = null,
         suspension_reason      = null,
         followers_count        = 0,
         following_count        = 0,
         listings_count         = 0,
         completed_swaps_count  = 0,
         rating                 = null,
         ratings_count          = 0,
         terms_accepted_version = null,
         terms_accepted_at      = null,
         deleted_at             = now()
   where id = p_user_id;

  -- ── d. NEW (0024): close out and de-identify any web deletion request ──
  -- Matched either by the stored user_id or by the email the account had a moment
  -- ago (captured above, before step c cleared it).
  update public.account_deletion_requests
     set status     = 'completed',
         handled_at = now(),
         email      = 'deleted',
         username   = null,
         reason     = null,
         user_id    = null,
         notes      = coalesce(notes, '') || '[auto] account deleted'
   where status = 'pending'
     and (user_id = p_user_id or (v_email is not null and lower(email) = lower(v_email)));

  return jsonb_build_object(
    'ok', true,
    'listings_removed', v_listings,
    'deleted_at', now()
  );
end;
$$;

revoke all on function public.delete_account(uuid) from public;
revoke all on function public.delete_account(uuid) from anon;
revoke all on function public.delete_account(uuid) from authenticated;
