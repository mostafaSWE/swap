-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0019 Terms gate on the public profile BIO (Phase M4 hardening)
--
-- Closes the "client-only gating is bypassable outside the app" gap for the one
-- profile field that is public UGC text: `bio`. A BEFORE UPDATE trigger blocks a
-- CHANGE to `bio` by a normal authenticated user who has not accepted the current
-- Terms (Apple 1.2 — accept before posting). This covers the DIRECT-Supabase path
-- (mobile profile edit, web fallback, or any hand-rolled client with a user JWT);
-- the NestJS `PATCH /me` (service-role) is gated in code (ProfileService.updateMe).
--
-- Deliberately NARROW to avoid a circular / onboarding-breaking design:
--   • Only fires when `bio` actually changes (IS DISTINCT FROM) — name/username/
--     phone/country/city/avatar are untouched, so ONBOARDING (which sets those but
--     not bio) is unaffected, and so is `POST /me/terms`.
--   • Exempts service-role / trigger context (auth.uid() IS NULL) — the acceptance
--     write, `handle_new_user`, and admin tooling never trip it.
--   • Exempts admins.
-- The user accepts once (mobile `ensureAccepted()` / web TermsGate → POST /me/terms),
-- after which bio edits proceed normally. Avatar/other images are gated client-side
-- + will be covered by the D-2 proactive image-moderation boundary.
--
-- Run after 0018. Additive + idempotent. ROLLBACK:
--   drop trigger if exists profiles_terms_gate on public.profiles;
--   drop function if exists public.enforce_terms_on_profile_ugc();
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.enforce_terms_on_profile_ugc()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.bio is distinct from old.bio
     and auth.uid() is not null
     and not public.is_admin(auth.uid())
     and not public.has_accepted_current_terms(auth.uid()) then
    raise exception 'terms_not_accepted' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_terms_gate on public.profiles;
create trigger profiles_terms_gate
  before update on public.profiles
  for each row execute function public.enforce_terms_on_profile_ugc();
