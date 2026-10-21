-- Regional video moderation: only authorized scopes can review submissions.
alter table public.community_video_posts add column if not exists review_note text;
drop policy if exists "video reviewer read scoped queue" on public.community_video_posts;
create policy "video reviewer read scoped queue" on public.community_video_posts for select to authenticated using (
 exists(
  select 1 from public.role_assignments ra join public.roles r on r.id=ra.role_id
  where ra.user_id=(select auth.uid()) and ra.active=true
   and r.role_code in ('PLATFORM_ADMIN','VILLAGE_VALIDATOR','DISTRICT_COORDINATOR','REGENCY_CITY_ADMIN')
   and (
    r.role_code='PLATFORM_ADMIN'
    or exists(
      with recursive scope_tree(id,parent_id) as (
        select t.id,t.parent_id from public.territories t where t.id=ra.scope_territory_id
        union all
        select child.id,child.parent_id from public.territories child join scope_tree parent on child.parent_id=parent.id
      ) select 1 from scope_tree where id=community_video_posts.territory_id
    )
   )
 )
);
drop policy if exists "video reviewer update scoped queue" on public.community_video_posts;
create policy "video reviewer update scoped queue" on public.community_video_posts for update to authenticated using (
 exists(
  select 1 from public.role_assignments ra join public.roles r on r.id=ra.role_id
  where ra.user_id=(select auth.uid()) and ra.active=true
   and r.role_code in ('PLATFORM_ADMIN','VILLAGE_VALIDATOR','DISTRICT_COORDINATOR','REGENCY_CITY_ADMIN')
   and (r.role_code='PLATFORM_ADMIN' or exists(
      with recursive scope_tree(id,parent_id) as (
        select t.id,t.parent_id from public.territories t where t.id=ra.scope_territory_id
        union all
        select child.id,child.parent_id from public.territories child join scope_tree parent on child.parent_id=parent.id
      ) select 1 from scope_tree where id=community_video_posts.territory_id
   ))
 )
) with check (
 exists(
  select 1 from public.role_assignments ra join public.roles r on r.id=ra.role_id
  where ra.user_id=(select auth.uid()) and ra.active=true
   and r.role_code in ('PLATFORM_ADMIN','VILLAGE_VALIDATOR','DISTRICT_COORDINATOR','REGENCY_CITY_ADMIN')
   and (r.role_code='PLATFORM_ADMIN' or exists(
      with recursive scope_tree(id,parent_id) as (
        select t.id,t.parent_id from public.territories t where t.id=ra.scope_territory_id
        union all
        select child.id,child.parent_id from public.territories child join scope_tree parent on child.parent_id=parent.id
      ) select 1 from scope_tree where id=community_video_posts.territory_id
   ))
 ) and (status <> 'TERBIT' or (reviewed_by=(select auth.uid()) and reviewed_at is not null and nullif(btrim(review_note),'') is not null))
);
create or replace function public.enforce_community_video_workflow()
returns trigger language plpgsql set search_path=public as $$
declare v_allowed boolean := false;
begin
 if tg_op='INSERT' then
   if new.status not in ('DRAF','DIAJUKAN') or new.published_at is not null then
     raise exception 'Video baru harus berupa draf atau pengajuan non-publik';
   end if;
   return new;
 end if;
 if new.status=new.status then
   if new.status='TERBIT' and (new.reviewed_by is null or new.reviewed_at is null or nullif(btrim(new.review_note),'') is null) then
     raise exception 'Penerbitan video membutuhkan peninjau, waktu, dan catatan keputusan';
   end if;
   return new;
 end if;
 v_allowed := case old.status
  when 'DRAF' then new.status='DIAJUKAN'
  when 'DIAJUKAN' then new.status in ('DRAF','TERBIT')
  when 'TERBIT' then new.status in ('DIARSIPKAN','DITARIK')
  when 'DIARSIPKAN' then false
  when 'DITARIK' then false
  else false end;
 if not v_allowed then raise exception 'Transisi status video tidak diizinkan: % -> %',old.status,new.status; end if;
 if new.status='TERBIT' then
   if new.reviewed_by is null or new.reviewed_at is null or nullif(btrim(new.review_note),'') is null then
     raise exception 'Penerbitan video membutuhkan peninjau, waktu, dan catatan keputusan';
   end if;
   new.published_at := coalesce(new.published_at,now());
 elsif new.status in ('DIARSIPKAN','DITARIK') then
   if new.reviewed_by is null or new.reviewed_at is null or nullif(btrim(new.review_note),'') is null then
     raise exception 'Perubahan status membutuhkan peninjau dan catatan keputusan';
   end if;
 end if;
 return new;
end $$;
drop trigger if exists community_video_workflow_guard on public.community_video_posts;
create trigger community_video_workflow_guard before insert or update on public.community_video_posts for each row execute function public.enforce_community_video_workflow();
