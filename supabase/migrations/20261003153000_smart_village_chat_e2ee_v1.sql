-- Smart Village Chat + profile privacy foundation
alter table public.citizen_profiles add column if not exists avatar_url text;
alter table public.citizen_profiles add column if not exists avatar_visibility text not null default 'RT_RW' check (avatar_visibility in ('PUBLIC','RT_RW','PRIVATE'));

create table if not exists public.sv_chat_conversations (id uuid primary key default gen_random_uuid(),kind text not null default 'DIRECT' check (kind in ('DIRECT','GROUP','ANNOUNCEMENT')),title text,created_by uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.sv_chat_members (conversation_id uuid not null references public.sv_chat_conversations(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,member_role text not null default 'MEMBER' check (member_role in ('OWNER','ADMIN','MEMBER')),joined_at timestamptz not null default now(),left_at timestamptz,primary key(conversation_id,user_id));
create table if not exists public.sv_chat_devices (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,public_key text not null unique,device_name text not null default 'Android',active boolean not null default true,created_at timestamptz not null default now(),last_seen_at timestamptz not null default now());
create table if not exists public.sv_chat_messages (id uuid primary key default gen_random_uuid(),conversation_id uuid not null references public.sv_chat_conversations(id) on delete cascade,sender_user_id uuid not null references auth.users(id) on delete cascade,sender_device_id uuid not null references public.sv_chat_devices(id) on delete restrict,message_type text not null default 'TEXT' check (message_type in ('TEXT','IMAGE','VIDEO','AUDIO','FILE','LOCATION','SYSTEM')),reply_to_id uuid references public.sv_chat_messages(id) on delete set null,created_at timestamptz not null default now(),edited_at timestamptz,deleted_at timestamptz);
create table if not exists public.sv_chat_message_envelopes (message_id uuid not null references public.sv_chat_messages(id) on delete cascade,recipient_device_id uuid not null references public.sv_chat_devices(id) on delete cascade,nonce text not null,ciphertext text not null,primary key(message_id,recipient_device_id));
create table if not exists public.sv_chat_reports (id uuid primary key default gen_random_uuid(),conversation_id uuid not null references public.sv_chat_conversations(id) on delete cascade,reporter_user_id uuid not null references auth.users(id) on delete cascade,message_id uuid references public.sv_chat_messages(id) on delete set null,reason text not null,created_at timestamptz not null default now());
create index if not exists sv_chat_members_user_idx on public.sv_chat_members(user_id);
create index if not exists sv_chat_messages_conversation_idx on public.sv_chat_messages(conversation_id,created_at desc);
create index if not exists sv_chat_devices_user_idx on public.sv_chat_devices(user_id,active);
create index if not exists sv_chat_envelopes_recipient_idx on public.sv_chat_message_envelopes(recipient_device_id,message_id);

alter table public.sv_chat_conversations enable row level security;
alter table public.sv_chat_members enable row level security;
alter table public.sv_chat_devices enable row level security;
alter table public.sv_chat_messages enable row level security;
alter table public.sv_chat_message_envelopes enable row level security;
alter table public.sv_chat_reports enable row level security;

drop policy if exists sv_chat_conversation_member_select on public.sv_chat_conversations;
create policy sv_chat_conversation_member_select on public.sv_chat_conversations for select to authenticated using (exists(select 1 from public.sv_chat_members m where m.conversation_id=id and m.user_id=(select auth.uid()) and m.left_at is null));
drop policy if exists sv_chat_conversation_creator_insert on public.sv_chat_conversations;
create policy sv_chat_conversation_creator_insert on public.sv_chat_conversations for insert to authenticated with check (created_by=(select auth.uid()));
drop policy if exists sv_chat_conversation_creator_update on public.sv_chat_conversations;
create policy sv_chat_conversation_creator_update on public.sv_chat_conversations for update to authenticated using (created_by=(select auth.uid())) with check (created_by=(select auth.uid()));

drop policy if exists sv_chat_members_select on public.sv_chat_members;
create policy sv_chat_members_select on public.sv_chat_members for select to authenticated using (exists(select 1 from public.sv_chat_members me where me.conversation_id=conversation_id and me.user_id=(select auth.uid()) and me.left_at is null));
drop policy if exists sv_chat_members_insert on public.sv_chat_members;
create policy sv_chat_members_insert on public.sv_chat_members for insert to authenticated with check (user_id=(select auth.uid()) or exists(select 1 from public.sv_chat_conversations c where c.id=conversation_id and c.created_by=(select auth.uid())));
drop policy if exists sv_chat_members_update on public.sv_chat_members;
create policy sv_chat_members_update on public.sv_chat_members for update to authenticated using (user_id=(select auth.uid()) or exists(select 1 from public.sv_chat_conversations c where c.id=conversation_id and c.created_by=(select auth.uid()))) with check (user_id=(select auth.uid()) or exists(select 1 from public.sv_chat_conversations c where c.id=conversation_id and c.created_by=(select auth.uid())));

drop policy if exists sv_chat_devices_self_insert on public.sv_chat_devices;
create policy sv_chat_devices_self_insert on public.sv_chat_devices for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists sv_chat_devices_self_update on public.sv_chat_devices;
create policy sv_chat_devices_self_update on public.sv_chat_devices for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists sv_chat_devices_self_or_member_select on public.sv_chat_devices;
create policy sv_chat_devices_self_or_member_select on public.sv_chat_devices for select to authenticated using (user_id=(select auth.uid()) or exists(select 1 from public.sv_chat_members me join public.sv_chat_members peer on peer.conversation_id=me.conversation_id where me.user_id=(select auth.uid()) and me.left_at is null and peer.user_id=sv_chat_devices.user_id and peer.left_at is null));

drop policy if exists sv_chat_messages_member_select on public.sv_chat_messages;
create policy sv_chat_messages_member_select on public.sv_chat_messages for select to authenticated using (exists(select 1 from public.sv_chat_members m where m.conversation_id=sv_chat_messages.conversation_id and m.user_id=(select auth.uid()) and m.left_at is null));
drop policy if exists sv_chat_messages_member_insert on public.sv_chat_messages;
create policy sv_chat_messages_member_insert on public.sv_chat_messages for insert to authenticated with check (sender_user_id=(select auth.uid()) and exists(select 1 from public.sv_chat_members m where m.conversation_id=sv_chat_messages.conversation_id and m.user_id=(select auth.uid()) and m.left_at is null));
drop policy if exists sv_chat_messages_sender_update on public.sv_chat_messages;
create policy sv_chat_messages_sender_update on public.sv_chat_messages for update to authenticated using(sender_user_id=(select auth.uid())) with check(sender_user_id=(select auth.uid()));

drop policy if exists sv_chat_envelope_recipient_select on public.sv_chat_message_envelopes;
create policy sv_chat_envelope_recipient_select on public.sv_chat_message_envelopes for select to authenticated using (exists(select 1 from public.sv_chat_devices d where d.id=recipient_device_id and d.user_id=(select auth.uid())));
drop policy if exists sv_chat_envelope_member_insert on public.sv_chat_message_envelopes;
create policy sv_chat_envelope_member_insert on public.sv_chat_message_envelopes for insert to authenticated with check (exists(select 1 from public.sv_chat_messages msg where msg.id=message_id and msg.sender_user_id=(select auth.uid())));
drop policy if exists sv_chat_report_self_insert on public.sv_chat_reports;
create policy sv_chat_report_self_insert on public.sv_chat_reports for insert to authenticated with check(reporter_user_id=(select auth.uid()));

grant select,insert,update on public.sv_chat_conversations,public.sv_chat_members,public.sv_chat_devices,public.sv_chat_messages,public.sv_chat_message_envelopes,public.sv_chat_reports to authenticated;

do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sv_chat_messages') then
   alter publication supabase_realtime add table public.sv_chat_messages;
 end if;
end $$;