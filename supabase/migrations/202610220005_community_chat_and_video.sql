-- Cross-RT/RW community chat and public video library.
create table if not exists public.community_chat_rooms (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(name) between 3 and 100),
 description text not null default '',
 room_type text not null default 'CROSS_RT_RW' check(room_type in ('CROSS_RT_RW','NEIGHBORHOOD','PUBLIC_NOTICE')),
 territory_id uuid references public.territories(id) on delete restrict,
 is_public boolean not null default true,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create table if not exists public.community_chat_members (
 room_id uuid not null references public.community_chat_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 joined_at timestamptz not null default now(),
 last_read_at timestamptz,
 primary key(room_id,user_id)
);
create table if not exists public.community_chat_messages (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.community_chat_rooms(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete restrict,
 body text not null check(char_length(trim(body)) between 1 and 2000),
 created_at timestamptz not null default now(),
 edited_at timestamptz,
 deleted_at timestamptz
);
create index if not exists community_chat_messages_room_time_idx on public.community_chat_messages(room_id,created_at desc);
create table if not exists public.community_video_posts (
 id uuid primary key default gen_random_uuid(),
 territory_id uuid references public.territories(id) on delete restrict,
 author_id uuid not null references auth.users(id) on delete restrict,
 title text not null check(char_length(title) between 5 and 160),
 description text not null default '',
 video_url text not null check(video_url ~* '^https://'),
 thumbnail_url text check(thumbnail_url is null or thumbnail_url ~* '^https://'),
 category text not null default 'KEGIATAN',
 status text not null default 'DRAF' check(status in ('DRAF','DIAJUKAN','TERBIT','DIARSIPKAN','DITARIK')),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 published_at timestamptz
);
create index if not exists community_video_posts_public_idx on public.community_video_posts(status,published_at desc);
alter table public.community_chat_rooms enable row level security;
alter table public.community_chat_members enable row level security;
alter table public.community_chat_messages enable row level security;
alter table public.community_video_posts enable row level security;
alter table public.community_chat_rooms force row level security;
alter table public.community_chat_members force row level security;
alter table public.community_chat_messages force row level security;
alter table public.community_video_posts force row level security;
drop policy if exists "chat rooms public read" on public.community_chat_rooms;
create policy "chat rooms public read" on public.community_chat_rooms for select to authenticated using(is_public=true);
drop policy if exists "chat members read own" on public.community_chat_members;
create policy "chat members read own" on public.community_chat_members for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "chat members join public rooms" on public.community_chat_members;
create policy "chat members join public rooms" on public.community_chat_members for insert to authenticated with check(
 user_id=(select auth.uid()) and exists(select 1 from public.community_chat_rooms r where r.id=room_id and r.is_public=true)
);
drop policy if exists "chat members update own read marker" on public.community_chat_members;
create policy "chat members update own read marker" on public.community_chat_members for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "chat messages member read" on public.community_chat_messages;
create policy "chat messages member read" on public.community_chat_messages for select to authenticated using(
 exists(select 1 from public.community_chat_members m where m.room_id=community_chat_messages.room_id and m.user_id=(select auth.uid()))
);
drop policy if exists "chat messages member send" on public.community_chat_messages;
create policy "chat messages member send" on public.community_chat_messages for insert to authenticated with check(
 sender_id=(select auth.uid()) and exists(select 1 from public.community_chat_members m where m.room_id=community_chat_messages.room_id and m.user_id=(select auth.uid()))
);
drop policy if exists "video public read published" on public.community_video_posts;
create policy "video public read published" on public.community_video_posts for select to anon,authenticated using(status='TERBIT' and published_at is not null and published_at<=now());
drop policy if exists "video author read own" on public.community_video_posts;
create policy "video author read own" on public.community_video_posts for select to authenticated using(author_id=(select auth.uid()));
drop policy if exists "video author submit draft" on public.community_video_posts;
create policy "video author submit draft" on public.community_video_posts for insert to authenticated with check(author_id=(select auth.uid()) and status in ('DRAF','DIAJUKAN'));
drop policy if exists "video author edit own draft" on public.community_video_posts;
create policy "video author edit own draft" on public.community_video_posts for update to authenticated using(author_id=(select auth.uid()) and status='DRAF') with check(author_id=(select auth.uid()) and status='DRAF');
grant select on public.community_chat_rooms to authenticated;
grant select,insert,update on public.community_chat_members to authenticated;
grant select,insert on public.community_chat_messages to authenticated;
grant select on public.community_video_posts to anon,authenticated;
grant insert,update on public.community_video_posts to authenticated;
insert into public.community_chat_rooms(name,description,room_type,is_public)
select 'Ruang Warga Lintas RT/RW','Ruang dialog bersama warga dari RT dan RW berbeda. Jaga sopan santun dan jangan membagikan data pribadi.','CROSS_RT_RW',true
where not exists(select 1 from public.community_chat_rooms where room_type='CROSS_RT_RW' and name='Ruang Warga Lintas RT/RW');
do $$
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='community_chat_messages') then
  alter publication supabase_realtime add table public.community_chat_messages;
 end if;
end $$;

-- Regional roles and a curated showcase selected by authorized district/regency admins.
insert into public.roles(role_code,role_name,critical)
values ('DISTRICT_COORDINATOR','Koordinator Kecamatan',true),('REGENCY_CITY_ADMIN','Administrator Kota/Kabupaten',true)
on conflict(role_code) do update set role_name=excluded.role_name,critical=excluded.critical;
create table if not exists public.regional_featured_content (
 id uuid primary key default gen_random_uuid(),
 territory_id uuid not null references public.territories(id) on delete restrict,
 editorial_content_id uuid not null references public.editorial_content(id) on delete cascade,
 selected_by uuid not null references auth.users(id) on delete restrict,
 editorial_note text not null default '',
 active boolean not null default true,
 selected_at timestamptz not null default now(),
 unique(territory_id,editorial_content_id)
);
alter table public.regional_featured_content enable row level security;
alter table public.regional_featured_content force row level security;
drop policy if exists "regional featured public read" on public.regional_featured_content;
create policy "regional featured public read" on public.regional_featured_content for select to anon,authenticated using(active=true);
drop policy if exists "regional admins select approved stories" on public.regional_featured_content;
create policy "regional admins select approved stories" on public.regional_featured_content for insert to authenticated with check(
 selected_by=(select auth.uid()) and exists(
  select 1 from public.role_assignments ra join public.roles r on r.id=ra.role_id
  join public.territories t on t.id=ra.scope_territory_id
  where ra.user_id=(select auth.uid()) and ra.active=true
   and r.role_code in ('PLATFORM_ADMIN','DISTRICT_COORDINATOR','REGENCY_CITY_ADMIN')
   and (r.role_code='PLATFORM_ADMIN' or ra.scope_territory_id=regional_featured_content.territory_id)
   and (r.role_code='PLATFORM_ADMIN' or t.territory_type in ('DISTRICT','REGENCY_CITY'))
 ) and exists(select 1 from public.editorial_content ec where ec.id=editorial_content_id and ec.is_public=true and ec.editorial_status in ('TERBIT','UNGGULAN'))
);
drop policy if exists "regional admins remove featured stories" on public.regional_featured_content;
create policy "regional admins remove featured stories" on public.regional_featured_content for delete to authenticated using(
 exists(select 1 from public.role_assignments ra join public.roles r on r.id=ra.role_id
 where ra.user_id=(select auth.uid()) and ra.active=true
 and (r.role_code='PLATFORM_ADMIN' or (r.role_code in ('DISTRICT_COORDINATOR','REGENCY_CITY_ADMIN') and ra.scope_territory_id=regional_featured_content.territory_id)))
);
grant select on public.regional_featured_content to anon,authenticated;
grant insert,delete on public.regional_featured_content to authenticated;
