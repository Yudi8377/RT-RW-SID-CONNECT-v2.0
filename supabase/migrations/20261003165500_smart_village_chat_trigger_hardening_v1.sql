create or replace function public.sv_chat_validate_sender_device() returns trigger language plpgsql set search_path=public as $$
begin
  if not exists(select 1 from public.sv_chat_devices d where d.id=new.sender_device_id and d.user_id=new.sender_user_id and d.active=true) then
    raise exception 'sender_device_not_owned_or_inactive';
  end if;
  return new;
end $$;