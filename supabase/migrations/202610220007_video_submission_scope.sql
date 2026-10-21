-- Ensure contributors can only attribute video submissions to their own assigned territory.
drop policy if exists "video author submit draft" on public.community_video_posts;
create policy "video author submit draft" on public.community_video_posts for insert to authenticated with check(
 author_id=(select auth.uid()) and status in ('DRAF','DIAJUKAN') and
 (territory_id is null or exists(
  select 1 from public.role_assignments ra
  where ra.user_id=(select auth.uid()) and ra.active=true and ra.scope_territory_id=community_video_posts.territory_id
 ))
);
drop policy if exists "video author edit own draft" on public.community_video_posts;
create policy "video author edit own draft" on public.community_video_posts for update to authenticated using(
 author_id=(select auth.uid()) and status='DRAF'
) with check(
 author_id=(select auth.uid()) and status='DRAF' and
 (territory_id is null or exists(
  select 1 from public.role_assignments ra
  where ra.user_id=(select auth.uid()) and ra.active=true and ra.scope_territory_id=community_video_posts.territory_id
 ))
);
