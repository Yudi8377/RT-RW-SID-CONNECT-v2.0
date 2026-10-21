-- Enforce that regional curators only feature content from their own territory tree.
drop policy if exists "regional admins select approved stories" on public.regional_featured_content;
create policy "regional admins select approved stories" on public.regional_featured_content for insert to authenticated with check(
 selected_by=(select auth.uid())
 and exists(
  select 1 from public.role_assignments ra join public.roles r on r.id=ra.role_id
  join public.territories t on t.id=ra.scope_territory_id
  where ra.user_id=(select auth.uid()) and ra.active=true
   and r.role_code in ('PLATFORM_ADMIN','DISTRICT_COORDINATOR','REGENCY_CITY_ADMIN')
   and (r.role_code='PLATFORM_ADMIN' or ra.scope_territory_id=regional_featured_content.territory_id and t.territory_type in ('DISTRICT','REGENCY_CITY'))
 )
 and exists(
  select 1 from public.editorial_content ec
  where ec.id=regional_featured_content.editorial_content_id
   and ec.is_public=true and ec.editorial_status in ('TERBIT','UNGGULAN')
   and (
    exists(select 1 from public.role_assignments ra join public.roles r on r.id=ra.role_id
      where ra.user_id=(select auth.uid()) and ra.active=true and r.role_code='PLATFORM_ADMIN')
    or exists(
      with recursive scope_tree(id,parent_id) as (
        select t.id,t.parent_id from public.territories t where t.id=regional_featured_content.territory_id
        union all
        select child.id,child.parent_id from public.territories child join scope_tree parent on child.parent_id=parent.id
      ) select 1 from scope_tree where id=ec.territory_id
    )
   )
 )
);
