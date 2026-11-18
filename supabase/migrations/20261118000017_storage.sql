-- Storage buckets and policies. Paths are namespaced by owner:
--   avatars/<user_id>/...
--   business-media/<business_id>/...
--   chat-attachments/<conversation_id>/...

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('business-media', 'business-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4']),
  ('chat-attachments', 'chat-attachments', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

create function private.storage_folder_uuid(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(p_name, '/', 1)::uuid
  end;
$$;

-- Public buckets are readable through their public URL; these policies cover writes.

-- avatars
create policy "avatars: users write own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and private.storage_folder_uuid(name) = (select auth.uid()));
create policy "avatars: users update own folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and private.storage_folder_uuid(name) = (select auth.uid()));
create policy "avatars: users delete own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and private.storage_folder_uuid(name) = (select auth.uid()));

-- business-media: owners and managers
create policy "business-media: managers write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'business-media'
    and (private.is_business_manager(private.storage_folder_uuid(name)) or private.is_super_admin())
  );
create policy "business-media: managers update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'business-media'
    and (private.is_business_manager(private.storage_folder_uuid(name)) or private.is_super_admin())
  );
create policy "business-media: managers delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'business-media'
    and (private.is_business_manager(private.storage_folder_uuid(name)) or private.is_super_admin())
  );

-- chat-attachments: conversation participants
create policy "chat-attachments: participants read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (private.can_access_conversation(private.storage_folder_uuid(name)) or private.is_super_admin())
  );
create policy "chat-attachments: participants upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and private.can_access_conversation(private.storage_folder_uuid(name))
  );
