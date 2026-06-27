-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0015 Phone data cleanup + (idempotent) identity-uniqueness re-assert
-- Run this if 0014's phone unique index failed with "Key (phone)=… is duplicated"
-- (caused by the old double-dial-code form bug, e.g. '+966+966563312960').
--
-- It (1) repairs double-prefixed phones, (2) de-duplicates so the unique index can
-- apply, then (3) re-asserts every identity-uniqueness object idempotently — so
-- running THIS file alone brings the DB to the desired state even if 0014 only
-- partially applied.
--
-- ⚠️ Step 2 NULLs the phone on all-but-the-earliest account sharing a number. On a
-- test DB that's what you want; on real data, review the duplicates first.
-- ════════════════════════════════════════════════════════════════════════

-- 1. Repair double-dial-code phones: collapse a repeated "+<code>+<code>" prefix.
--    Run twice in case a value was triple-prefixed.
update public.profiles set phone = regexp_replace(phone, '^\+(\d+)\+\1', '+\1')
  where phone ~ '^\+(\d+)\+\1';
update public.profiles set phone = regexp_replace(phone, '^\+(\d+)\+\1', '+\1')
  where phone ~ '^\+(\d+)\+\1';

-- 2. De-duplicate: keep the earliest account per phone number, null the rest.
with d as (
  select id, row_number() over (partition by phone order by created_at, id) as rn
  from public.profiles
  where phone is not null and phone <> ''
)
update public.profiles p set phone = null
from d where p.id = d.id and d.rn > 1;

-- 3. (Re)assert identity uniqueness — all idempotent.
create unique index if not exists profiles_username_lower_uq on public.profiles (lower(username));
alter table public.profiles drop constraint if exists profiles_username_key;
create unique index if not exists profiles_phone_uq
  on public.profiles (phone) where phone is not null and phone <> '';

create or replace function public.signup_identifier_taken(uname text, uphone text)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.profiles where lower(username) = lower(uname)) then 'username'
    when uphone is not null and uphone <> ''
      and exists (select 1 from public.profiles where phone = uphone) then 'phone'
    else null
  end;
$$;
revoke all on function public.signup_identifier_taken(text, text) from public;
grant execute on function public.signup_identifier_taken(text, text) to anon, authenticated;
