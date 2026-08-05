-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0020 push-notification foundation (Phase M5)
--
-- Two additive tables + one enqueue trigger. Push is an ADDITIONAL delivery
-- channel; the in-app `notifications` row remains the source of truth.
--
--   • device_tokens — one row per (user, app installation). OWNER-ONLY RLS so a
--     user's push token is never exposed to anyone else. Idempotent upsert on
--     (user_id, installation_id); supports token rotation, multi-device, and a
--     soft `enabled` flag (logout revokes / an invalid token disables).
--
--   • push_outbox — a durable delivery queue. One row per notification
--     (unique(notification_id) → idempotent, no duplicate sends). A backend worker
--     (NestJS @Cron) processes pending rows OUT OF BAND — nothing calls an external
--     push provider synchronously from a trigger or a user transaction. Backoff via
--     next_attempt_at; terminal states 'sent' | 'failed' | 'skipped'. SERVICE-ROLE
--     ONLY (RLS on, no user policies → users can't read the queue).
--
--   • notifications_enqueue_push — AFTER INSERT on notifications inserts the outbox
--     row (fast, local, on-conflict-do-nothing). It does NOT send anything.
--
-- Run after 0019. Additive + idempotent. ROLLBACK:
--   drop trigger if exists notifications_enqueue_push on public.notifications;
--   drop function if exists public.enqueue_push_on_notification();
--   drop table if exists public.push_outbox;
--   drop table if exists public.device_tokens;
-- ════════════════════════════════════════════════════════════════════════

-- ── device_tokens ────────────────────────────────────────────────────────
create table if not exists public.device_tokens (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  installation_id text not null,                        -- stable per app install
  token           text not null,                        -- Expo push token (or FCM/APNs)
  provider        text not null default 'expo' check (provider in ('expo','fcm','apns')),
  platform        text not null check (platform in ('ios','android')),
  app_env         text not null default 'development'
                    check (app_env in ('development','preview','production')),
  enabled         boolean not null default true,
  last_seen_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, installation_id)
);
create index if not exists device_tokens_user_enabled_idx on public.device_tokens(user_id) where enabled;
drop trigger if exists device_tokens_touch on public.device_tokens;
create trigger device_tokens_touch before update on public.device_tokens
  for each row execute function public.set_updated_at();

alter table public.device_tokens enable row level security;
-- OWNER-ONLY — never expose another user's push token.
drop policy if exists "device_tokens read own" on public.device_tokens;
create policy "device_tokens read own" on public.device_tokens for select using (user_id = auth.uid());
drop policy if exists "device_tokens insert own" on public.device_tokens;
create policy "device_tokens insert own" on public.device_tokens for insert with check (user_id = auth.uid());
drop policy if exists "device_tokens update own" on public.device_tokens;
create policy "device_tokens update own" on public.device_tokens for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "device_tokens delete own" on public.device_tokens;
create policy "device_tokens delete own" on public.device_tokens for delete using (user_id = auth.uid());
drop policy if exists "device_tokens admin" on public.device_tokens;
create policy "device_tokens admin" on public.device_tokens for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ── push_outbox (service-role only) ──────────────────────────────────────
create table if not exists public.push_outbox (
  id              uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  status          text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  attempts        int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (notification_id)
);
create index if not exists push_outbox_due_idx on public.push_outbox(next_attempt_at) where status = 'pending';
drop trigger if exists push_outbox_touch on public.push_outbox;
create trigger push_outbox_touch before update on public.push_outbox
  for each row execute function public.set_updated_at();

alter table public.push_outbox enable row level security;
-- No user policies: the queue is internal. Only the service-role client (which
-- bypasses RLS) and admins touch it.
drop policy if exists "push_outbox admin" on public.push_outbox;
create policy "push_outbox admin" on public.push_outbox for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ── enqueue on notification (does NOT send) ──────────────────────────────
create or replace function public.enqueue_push_on_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.push_outbox (notification_id, user_id)
  values (new.id, new.user_id)
  on conflict (notification_id) do nothing;
  return null;
end;
$$;
drop trigger if exists notifications_enqueue_push on public.notifications;
create trigger notifications_enqueue_push
  after insert on public.notifications
  for each row execute function public.enqueue_push_on_notification();
