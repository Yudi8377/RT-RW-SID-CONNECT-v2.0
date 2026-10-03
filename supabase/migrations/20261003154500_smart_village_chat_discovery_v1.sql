create schema if not exists private;
create or replace function private.sv_find_chat_recipient(p_phone text)
returns table(user_id uuid,display_name text,avatar_url text,device_id uuid,public_key text)
language sql
security definer
set search_path=public,private
as $$
  select cp.user_id,cp.full_name,cp.avatar_url,d.id,d.public_key
  from public.citizen_profiles cp
  join public.sv_chat_devices d on d.user_id=cp.user_id and d.active=true
  where cp.phone=trim(p_phone) and cp.user_id <> auth.uid()
  order by d.last_seen_at desc;
$$;
revoke all on function private.sv_find_chat_recipient(text) from public,anon,authenticated;
grant execute on function private.sv_find_chat_recipient(text) to authenticated;

create or replace function public.sv_find_chat_recipient(p_phone text)
returns table(user_id uuid,display_name text,avatar_url text,device_id uuid,public_key text)
language sql
security invoker
set search_path=public
as $$
  select * from private.sv_find_chat_recipient(p_phone)
  where auth.uid() is not null
  limit 10;
$$;
revoke all on function public.sv_find_chat_recipient(text) from public,anon;
grant execute on function public.sv_find_chat_recipient(text) to authenticated;