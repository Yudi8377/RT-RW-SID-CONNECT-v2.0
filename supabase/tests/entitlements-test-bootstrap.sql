-- Disposable PostgreSQL fixture approximating the existing Supabase identity/tenant tables.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create table public.organizations (
  id uuid primary key,
  name text not null
);
create table public.roles (
  id uuid primary key,
  role_code text not null unique
);
create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  organization_id uuid not null references public.organizations(id),
  role_id uuid not null references public.roles(id),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz
);
grant select on public.role_assignments to authenticated;

insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000003');
insert into public.organizations (id, name) values
  ('10000000-0000-4000-8000-000000000001', 'Organisasi Uji 1'),
  ('10000000-0000-4000-8000-000000000002', 'Organisasi Uji 2');
insert into public.roles (id, role_code) values
  ('90000000-0000-4000-8000-000000000001', 'RT_OPERATOR');
insert into public.role_assignments (user_id, organization_id, role_id, active)
values
  ('00000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001',
   '90000000-0000-4000-8000-000000000001', true),
  ('00000000-0000-4000-8000-000000000002',
   '10000000-0000-4000-8000-000000000002',
   '90000000-0000-4000-8000-000000000001', true);
update public.role_assignments
set starts_at = pg_catalog.now() + interval '1 day'
where user_id = '00000000-0000-4000-8000-000000000002';
