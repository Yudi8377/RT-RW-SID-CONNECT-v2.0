-- Editorial CMS + curated knowledge foundation. Additive only; apply only after review.
-- AI may recommend, classify, summarize, and flag risk. Human reviewers control publication status.
create table if not exists public.editorial_content (
  id uuid primary key default gen_random_uuid(),
  territory_id uuid,
  author_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 5 and 180),
  slug text not null,
  category text not null default 'DESA',
  excerpt text not null default '',
  body text not null default '',
  image_url text,
  image_caption text,
  ai_analysis jsonb not null default '{}'::jsonb,
  editorial_status text not null default 'DRAF' check (editorial_status in ('DRAF','DIAJUKAN','DALAM_VERIFIKASI','DISETUJUI','UNGGULAN','TERBIT','DIARSIPKAN','DITARIK')),
  human_review_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  published_at timestamptz,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (territory_id, slug)
);
create index if not exists editorial_content_public_feed_idx on public.editorial_content (territory_id, published_at desc) where is_public = true and editorial_status in ('TERBIT','UNGGULAN');
create index if not exists editorial_content_status_idx on public.editorial_content (territory_id, editorial_status, updated_at desc);
alter table public.editorial_content enable row level security;
alter table public.editorial_content force row level security;
create policy editorial_content_public_read on public.editorial_content for select to anon, authenticated using (is_public = true and editorial_status in ('TERBIT','UNGGULAN'));
create policy editorial_content_author_read on public.editorial_content for select to authenticated using (author_id = auth.uid() or exists (
  select 1 from public.role_assignments ra join public.roles r on r.id = ra.role_id
  where ra.user_id = auth.uid() and ra.active = true
    and r.role_code in ('PLATFORM_ADMIN','VILLAGE_VALIDATOR','DISTRICT_COORDINATOR','REGENCY_CITY_ADMIN')
    and (r.role_code = 'PLATFORM_ADMIN' or ra.scope_territory_id = editorial_content.territory_id)
));
create policy editorial_content_author_insert on public.editorial_content for insert to authenticated with check (author_id = auth.uid() and editorial_status in ('DRAF','DIAJUKAN') and is_public = false and exists (select 1 from public.role_assignments ra join public.roles r on r.id = ra.role_id where ra.user_id = auth.uid() and ra.active = true and (r.role_code = 'PLATFORM_ADMIN' or ra.scope_territory_id = editorial_content.territory_id)));
create policy editorial_content_author_update on public.editorial_content for update to authenticated using (
  author_id = auth.uid() and editorial_status in ('DRAF','DIAJUKAN')
) with check (author_id = auth.uid() and editorial_status in ('DRAF','DIAJUKAN') and is_public = false and exists (select 1 from public.role_assignments ra join public.roles r on r.id = ra.role_id where ra.user_id = auth.uid() and ra.active = true and (r.role_code = 'PLATFORM_ADMIN' or ra.scope_territory_id = editorial_content.territory_id)));
create policy editorial_content_reviewer_update on public.editorial_content for update to authenticated using (exists (
  select 1 from public.role_assignments ra join public.roles r on r.id = ra.role_id
  where ra.user_id = auth.uid() and ra.active = true
    and r.role_code in ('PLATFORM_ADMIN','VILLAGE_VALIDATOR','DISTRICT_COORDINATOR','REGENCY_CITY_ADMIN')
    and (r.role_code = 'PLATFORM_ADMIN' or ra.scope_territory_id = editorial_content.territory_id)
)) with check (exists (
  select 1 from public.role_assignments ra join public.roles r on r.id = ra.role_id
  where ra.user_id = auth.uid() and ra.active = true
    and r.role_code in ('PLATFORM_ADMIN','VILLAGE_VALIDATOR','DISTRICT_COORDINATOR','REGENCY_CITY_ADMIN')
    and (r.role_code = 'PLATFORM_ADMIN' or ra.scope_territory_id = editorial_content.territory_id)
));
grant select, insert, update on public.editorial_content to authenticated;
grant select on public.editorial_content to anon;

create table if not exists public.public_knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  territory_id uuid,
  title text not null check (char_length(title) between 3 and 200),
  summary text not null default '',
  body text not null default '',
  source_url text,
  source_name text,
  source_published_at timestamptz,
  source_checked_at timestamptz not null default now(),
  license_note text,
  knowledge_type text not null default 'LOCAL_GUIDE' check (knowledge_type in ('LOCAL_GUIDE','OFFICIAL_SOURCE','DATASET_NOTE','FAQ','POLICY_REFERENCE')),
  publication_status text not null default 'PENDING_REVIEW' check (publication_status in ('PENDING_REVIEW','PUBLISHED','REJECTED','ARCHIVED')),
  proposed_by uuid references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists public_knowledge_published_idx on public.public_knowledge_documents (territory_id, source_checked_at desc) where publication_status = 'PUBLISHED';
alter table public.public_knowledge_documents enable row level security;
alter table public.public_knowledge_documents force row level security;
create policy public_knowledge_read_published on public.public_knowledge_documents for select to anon, authenticated using (publication_status = 'PUBLISHED');
create policy public_knowledge_editor_read on public.public_knowledge_documents for select to authenticated using (proposed_by = auth.uid() or exists (
  select 1 from public.role_assignments ra join public.roles r on r.id = ra.role_id
  where ra.user_id = auth.uid() and ra.active = true
    and r.role_code in ('PLATFORM_ADMIN','VILLAGE_VALIDATOR','DISTRICT_COORDINATOR','REGENCY_CITY_ADMIN')
    and (r.role_code = 'PLATFORM_ADMIN' or ra.scope_territory_id = public_knowledge_documents.territory_id)
));
create policy public_knowledge_propose on public.public_knowledge_documents for insert to authenticated with check (proposed_by = auth.uid() and publication_status = 'PENDING_REVIEW' and exists (select 1 from public.role_assignments ra join public.roles r on r.id = ra.role_id where ra.user_id = auth.uid() and ra.active = true and (r.role_code = 'PLATFORM_ADMIN' or ra.scope_territory_id = public_knowledge_documents.territory_id)));
create policy public_knowledge_review on public.public_knowledge_documents for update to authenticated using (exists (
  select 1 from public.role_assignments ra join public.roles r on r.id = ra.role_id
  where ra.user_id = auth.uid() and ra.active = true
    and r.role_code in ('PLATFORM_ADMIN','VILLAGE_VALIDATOR','DISTRICT_COORDINATOR','REGENCY_CITY_ADMIN')
    and (r.role_code = 'PLATFORM_ADMIN' or ra.scope_territory_id = public_knowledge_documents.territory_id)
)) with check (exists (
  select 1 from public.role_assignments ra join public.roles r on r.id = ra.role_id
  where ra.user_id = auth.uid() and ra.active = true
    and r.role_code in ('PLATFORM_ADMIN','VILLAGE_VALIDATOR','DISTRICT_COORDINATOR','REGENCY_CITY_ADMIN')
    and (r.role_code = 'PLATFORM_ADMIN' or ra.scope_territory_id = public_knowledge_documents.territory_id)
));
grant select, insert, update on public.public_knowledge_documents to authenticated;
grant select on public.public_knowledge_documents to anon;

-- Enforce editorial state transitions in the database, not only in the browser.
create or replace function public.enforce_editorial_content_workflow()
returns trigger language plpgsql set search_path = public as $$
declare v_allowed boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.editorial_status not in ('DRAF','DIAJUKAN') or new.is_public then
      raise exception 'New editorial content must start as a non-public draft/submission';
    end if;
    return new;
  end if;
  if new.editorial_status = old.editorial_status then
    return new;
  end if;
  v_allowed := case old.editorial_status
    when 'DRAF' then new.editorial_status = 'DIAJUKAN'
    when 'DIAJUKAN' then new.editorial_status in ('DALAM_VERIFIKASI','DRAF')
    when 'DALAM_VERIFIKASI' then new.editorial_status in ('DISETUJUI','DRAF')
    when 'DISETUJUI' then new.editorial_status in ('UNGGULAN','TERBIT','DRAF')
    when 'UNGGULAN' then new.editorial_status in ('TERBIT','DRAF')
    when 'TERBIT' then new.editorial_status in ('DIARSIPKAN','DITARIK')
    when 'DIARSIPKAN' then false
    when 'DITARIK' then false
    else false end;
  if not v_allowed then
    raise exception 'Invalid editorial workflow transition: % -> %', old.editorial_status, new.editorial_status;
  end if;
  if new.editorial_status in ('DISETUJUI','UNGGULAN','TERBIT','DIARSIPKAN','DITARIK') then
    if new.reviewed_by is null or new.reviewed_at is null or nullif(btrim(new.human_review_note),'') is null then
      raise exception 'Human reviewer, review time, and audit note are required for this decision';
    end if;
  end if;
  new.is_public := new.editorial_status in ('UNGGULAN','TERBIT');
  if new.is_public then new.published_at := coalesce(new.published_at, now()); end if;
  new.updated_at := now();
  return new;
end; $$;
create trigger editorial_content_workflow_guard before insert or update on public.editorial_content
for each row execute function public.enforce_editorial_content_workflow();
