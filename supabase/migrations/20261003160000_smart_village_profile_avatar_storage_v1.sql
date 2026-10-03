insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('sv-profile-avatars','sv-profile-avatars',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists sv_profile_avatar_insert on storage.objects;
create policy sv_profile_avatar_insert on storage.objects for insert to authenticated with check(bucket_id='sv-profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists sv_profile_avatar_update on storage.objects;
create policy sv_profile_avatar_update on storage.objects for update to authenticated using(bucket_id='sv-profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='sv-profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists sv_profile_avatar_delete on storage.objects;
create policy sv_profile_avatar_delete on storage.objects for delete to authenticated using(bucket_id='sv-profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);