create or replace function public.sv_chat_validate_sender_device() returns trigger language plpgsql as $$
begin
  if not exists(select 1 from public.sv_chat_devices d where d.id=new.sender_device_id and d.user_id=new.sender_user_id and d.active=true) then
    raise exception 'sender_device_not_owned_or_inactive';
  end if;
  return new;
end $$;
drop trigger if exists sv_chat_sender_device_guard on public.sv_chat_messages;
create trigger sv_chat_sender_device_guard before insert on public.sv_chat_messages for each row execute function public.sv_chat_validate_sender_device();

drop policy if exists sv_chat_envelope_member_insert on public.sv_chat_message_envelopes;
create policy sv_chat_envelope_member_insert on public.sv_chat_message_envelopes for insert to authenticated with check (
  exists(
    select 1 from public.sv_chat_messages msg
    join public.sv_chat_members mem on mem.conversation_id=msg.conversation_id and mem.user_id=(select auth.uid()) and mem.left_at is null
    join public.sv_chat_devices d on d.id=recipient_device_id
    join public.sv_chat_members recipient_mem on recipient_mem.conversation_id=msg.conversation_id and recipient_mem.user_id=d.user_id and recipient_mem.left_at is null
    where msg.id=message_id and msg.sender_user_id=(select auth.uid())
  )
);