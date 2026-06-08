-- ════════════════════════════════════════════════════════════════════════
-- Swap — 0003 storage buckets & policies
-- Run after 0002_rls.sql.
--
-- Buckets:
--   avatars         public read,  owner-write (path: {user_id}/...)
--   listing-images  public read,  owner-write (path: {user_id}/{listing_id}/...)
--   chat-images     private,      participant-read (MVP: owner-write only)
-- ════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values
  ('avatars',        'avatars',        true),
  ('listing-images', 'listing-images', true),
  ('chat-images',    'chat-images',    false)
on conflict (id) do nothing;

-- Convention: the first path segment is the uploader's user id, e.g.
--   avatars/{auth.uid}/avatar.jpg
--   listing-images/{auth.uid}/{listing_id}/0.jpg
--   chat-images/{auth.uid}/{conversation_id}/0.jpg
-- so we authorise writes by comparing (storage.foldername(name))[1] to auth.uid().

-- ── avatars ─────────────────────────────────────────────────────────────
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars owner write" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars owner update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars owner delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── listing-images ──────────────────────────────────────────────────────
create policy "listing-images public read" on storage.objects
  for select using (bucket_id = 'listing-images');

create policy "listing-images owner write" on storage.objects
  for insert with check (
    bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "listing-images owner update" on storage.objects
  for update using (
    bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "listing-images owner delete" on storage.objects
  for delete using (
    bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── chat-images (private) ───────────────────────────────────────────────
-- MVP: a user can read/write only objects under their own {auth.uid}/ folder.
-- TODO (Phase 2): restrict READ to *all participants* of the conversation, not
-- just the uploader — needs the conversation id encoded in the path and a join
-- against conversation_participants. Kept simple intentionally for MVP.
create policy "chat-images owner read" on storage.objects
  for select using (
    bucket_id = 'chat-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "chat-images owner write" on storage.objects
  for insert with check (
    bucket_id = 'chat-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "chat-images owner delete" on storage.objects
  for delete using (
    bucket_id = 'chat-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
