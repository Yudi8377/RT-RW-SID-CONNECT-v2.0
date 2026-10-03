create or replace function private.sv_chat_is_member(p_conversation_id uuid,p_user_id uuid)
returns boolean language sql security definer set search_path=public,private as $$
  select p_user_id=auth.uid() and exists(
    select 1 from public.sv_chat_members m
    where m.conversation_id=p_conversation_id and m.user_id=p_user_id and m.left_at is null
  );
$$;
revoke all on function private.sv_chat_is_member(uuid,uuid) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.sv_chat_is_member(uuid,uuid) to authenticated;

drop policy if exists sv_chat_conversation_member_select on public.sv_chat_conversations;
create policy sv_chat_conversation_member_select on public.sv_chat_conversations for select to authenticated using (private.sv_chat_is_member(id,(select auth.uid())));

drop policy if exists sv_chat_members_select on public.sv_chat_members;
create policy sv_chat_members_select on public.sv_chat_members for select to authenticated using (private.sv_chat_is_member(conversation_id,(select auth.uid())));

drop policy if exists sv_chat_devices_self_or_member_select on public.sv_chat_devices;
create policy sv_chat_devices_self_or_member_select on public.sv_chat_devices for select to authenticated using (
  user_id=(select auth.uid()) or exists(
    select 1 from public.sv_chat_members peer
    where peer.user_id=sv_chat_devices.user_id
      and private.sv_chat_is_member(peer.conversation_id,(select auth.uid()))
  )
);

drop policy if exists sv_chat_messages_member_select on public.sv_chat_messages;
create policy sv_chat_messages_member_select on public.sv_chat_messages for select to authenticated using (private.sv_chat_is_member(conversation_id,(select auth.uid())));

drop policy if exists sv_chat_messages_member_insert on public.sv_chat_messages;
create policy sv_chat_messages_member_insert on public.sv_chat_messages for insert to authenticated with check (
  sender_user_id=(select auth.uid()) and private.sv_chat_is_member(conversation_id,(select auth.uid()))
);

drop policy if exists sv_chat_envelope_member_insert on public.sv_chat_message_envelopes;
create policy sv_chat_envelope_member_insert on public.sv_chat_message_envelopes for insert to authenticated with check (
  exists(
    select 1 from public.sv_chat_messages msg
    join public.sv_chat_devices d on d.id=recipient_device_id
    where msg.id=message_id
      and msg.sender_user_id=(select auth.uid())
      and private.sv_chat_is_member(msg.conversation_id,(select auth.uid()))
      and private.sv_chat_is_member(msg.conversation_id,d.user_id)
  )
);