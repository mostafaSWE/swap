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

-- Server-side caps (defense-in-depth; clients also validate). Images only, ≤5 MB.
-- An explicit UPDATE so the caps apply to already-existing buckets too (the insert
-- above no-ops on conflict).
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id in ('avatars', 'listing-images', 'chat-images');

-- Convention: the first path segment is the uploader's user id, e.g.
--   avatars/{auth.uid}/avatar.jpg
--   listing-images/{auth.uid}/{listing_id}/0.jpg
--   chat-images/{auth.uid}/{conversation_id}/0.jpg
-- so we authorise writes by comparing (storage.foldername(name))[1] to auth.uid().

-- ── avatars ─────────────────────────────────────────────────────────────
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars owner write" on storage.objects;
create policy "avatars owner write" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── listing-images ──────────────────────────────────────────────────────
drop policy if exists "listing-images public read" on storage.objects;
create policy "listing-images public read" on storage.objects
  for select using (bucket_id = 'listing-images');

drop policy if exists "listing-images owner write" on storage.objects;
create policy "listing-images owner write" on storage.objects
  for insert with check (
    bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "listing-images owner update" on storage.objects;
create policy "listing-images owner update" on storage.objects
  for update using (
    bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "listing-images owner delete" on storage.objects;
create policy "listing-images owner delete" on storage.objects
  for delete using (
    bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── chat-images (private) ───────────────────────────────────────────────
-- Write/delete: only the uploader, under their own {auth.uid}/ folder.
-- Read: ANY participant of the conversation. Path is {auth.uid}/{conversation_id}/…
-- so segment [2] is the conversation id — join conversation_participants on it.
drop policy if exists "chat-images owner read" on storage.objects;
drop policy if exists "chat-images participant read" on storage.objects;
create policy "chat-images participant read" on storage.objects
  for select using (
    bucket_id = 'chat-images'
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id::text = (storage.foldername(name))[2]
        and cp.user_id = auth.uid()
    )
  );
drop policy if exists "chat-images owner write" on storage.objects;
create policy "chat-images owner write" on storage.objects
  for insert with check (
    bucket_id = 'chat-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "chat-images owner delete" on storage.objects;
create policy "chat-images owner delete" on storage.objects
  for delete using (
    bucket_id = 'chat-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
