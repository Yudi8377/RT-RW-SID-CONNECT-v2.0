-- Restrict public column visibility for regional features and video records.
revoke select on public.regional_featured_content from anon,authenticated;
grant select(id,territory_id,editorial_content_id,editorial_note,active,selected_at) on public.regional_featured_content to anon,authenticated;
revoke select on public.community_video_posts from anon;
grant select(id,title,description,video_url,thumbnail_url,category,published_at) on public.community_video_posts to anon;
