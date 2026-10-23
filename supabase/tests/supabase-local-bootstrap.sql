-- Test-only schema bootstrap for a disposable local Supabase stack.
-- Auth schema, auth.uid(), anon/authenticated/service_role are provided by Supabase local.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Simulate the critical production membership using a disposable BYPASSRLS role.
DO $fixture$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'national_test_bypass') THEN
    EXECUTE 'CREATE ROLE national_test_bypass NOLOGIN BYPASSRLS';
  END IF;
END
$fixture$;
GRANT national_test_bypass TO anon, authenticated WITH ADMIN OPTION;
-- Minimal disposable fixture simulating the production spatial_ref_sys relation and excessive API grants.
-- This avoids requiring the PostGIS binary in CI; production extension ownership was verified separately.
CREATE TABLE IF NOT EXISTS public.spatial_ref_sys (
  srid integer PRIMARY KEY,
  auth_name text,
  auth_srid integer,
  srtext text,
  proj4text text
);
GRANT ALL PRIVILEGES ON TABLE public.spatial_ref_sys TO PUBLIC, anon, authenticated;

-- Disposable SECURITY DEFINER fixtures simulate the three PostGIS overloads found in production.
CREATE OR REPLACE FUNCTION public.st_estimatedextent(text,text)
RETURNS text LANGUAGE sql SECURITY DEFINER AS $ SELECT 'fixture'::text $;
CREATE OR REPLACE FUNCTION public.st_estimatedextent(text,text,text)
RETURNS text LANGUAGE sql SECURITY DEFINER AS $ SELECT 'fixture'::text $;
CREATE OR REPLACE FUNCTION public.st_estimatedextent(text,text,text,boolean)
RETURNS text LANGUAGE sql SECURITY DEFINER AS $ SELECT 'fixture'::text $;
GRANT EXECUTE ON FUNCTION public.st_estimatedextent(text,text) TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.st_estimatedextent(text,text,text) TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.st_estimatedextent(text,text,text,boolean) TO PUBLIC, anon, authenticated, service_role;

CREATE TABLE public.territories (
 id uuid PRIMARY KEY,
 parent_id uuid REFERENCES public.territories(id),
 territory_type text NOT NULL,
 code text,
 name text NOT NULL,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.organizations (
 id uuid PRIMARY KEY,
 organization_type text,
 name text NOT NULL,
 territory_id uuid REFERENCES public.territories(id),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.roles (
 id uuid PRIMARY KEY,
 role_code text NOT NULL UNIQUE,
 role_name text NOT NULL,
 critical boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.role_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 role_id uuid NOT NULL REFERENCES public.roles(id),
 scope_territory_id uuid REFERENCES public.territories(id),
 organization_id uuid REFERENCES public.organizations(id),
 active boolean NOT NULL DEFAULT true,
 starts_at timestamptz,
 ends_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.rt_service_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 territory_id uuid REFERENCES public.territories(id),
 status text NOT NULL DEFAULT 'OPEN',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.rt_infrastructure_assets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 territory_id uuid REFERENCES public.territories(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.assistance_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 territory_id uuid REFERENCES public.territories(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.addresses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 territory_id uuid NOT NULL REFERENCES public.territories(id),
 address_line text NOT NULL,
 postal_code text
);
-- Intentionally omit households.created_at to guard against schema assumptions.
CREATE TABLE public.households (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 household_number_hash text NOT NULL,
 address_id uuid REFERENCES public.addresses(id),
 status text NOT NULL DEFAULT 'ACTIVE'
);
CREATE TABLE public.persons (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 full_name text NOT NULL,
 birth_place text,
 birth_date date,
 gender text,
 classification text NOT NULL,
 status text NOT NULL DEFAULT 'ACTIVE',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_user_id uuid REFERENCES auth.users(id),
 action text NOT NULL,
 entity_type text,
 entity_id uuid,
 scope_territory_id uuid REFERENCES public.territories(id),
 before_data jsonb,
 after_data jsonb,
 reason text,
 source text,
 authority text,
 created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO auth.users (id,email,aud,role,encrypted_password,email_confirmed_at)
VALUES
 ('00000000-0000-4000-8000-000000000001','trial-user-1@example.test','authenticated','authenticated','',now()),
 ('00000000-0000-4000-8000-000000000002','trial-user-2@example.test','authenticated','authenticated','',now()),
 ('00000000-0000-4000-8000-000000000003','trial-user-3@example.test','authenticated','authenticated','',now()),
 ('00000000-0000-4000-8000-000000000004','regional-user-4@example.test','authenticated','authenticated','',now()),
 ('00000000-0000-4000-8000-000000000005','regional-user-5@example.test','authenticated','authenticated','',now()),
 ('00000000-0000-4000-8000-000000000006','regional-user-6@example.test','authenticated','authenticated','',now()),
 ('a1000000-0000-4000-8000-000000000008','rt-user@example.test','authenticated','authenticated','',now()),
 ('a1000000-0000-4000-8000-000000000009','rw-user@example.test','authenticated','authenticated','',now()),
 ('a1000000-0000-4000-8000-000000000010','village-user@example.test','authenticated','authenticated','',now()),
 ('a1000000-0000-4000-8000-000000000011','platform-admin@example.test','authenticated','authenticated','',now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.territories (id,parent_id,territory_type,code,name,active) VALUES
 ('30000000-0000-4000-8000-000000000001',NULL,'PROVINCE','P-1','Provinsi Uji',true),
 ('30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','REGENCY_CITY','K-1','Kota Uji',true),
 ('30000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000002','DISTRICT','D-1','Kecamatan A',true),
 ('30000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000003','VILLAGE','V-1','Desa A',true),
 ('30000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000004','RW','RW-1','RW 01',true),
 ('30000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000005','RT','RT-1','RT 01',true),
 ('30000000-0000-4000-8000-000000000007','30000000-0000-4000-8000-000000000003','VILLAGE','V-2','Desa B',true),
 ('30000000-0000-4000-8000-000000000008','30000000-0000-4000-8000-000000000002','DISTRICT','D-2','Kecamatan B',true),
 ('30000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000008','VILLAGE','V-3','Desa C',true),
 ('30000000-0000-4000-8000-000000000010','30000000-0000-4000-8000-000000000001','REGENCY_CITY','K-2','Kabupaten Uji',true),
 ('30000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000010','DISTRICT','D-3','Kecamatan D',true),
 ('30000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000011','VILLAGE','V-4','Desa D',true),
 ('30000000-0000-4000-8000-000000000013','30000000-0000-4000-8000-000000000002','DISTRICT','D-4','Kecamatan Nonaktif',false);

INSERT INTO public.organizations (id,organization_type,name,territory_id,active) VALUES
 ('10000000-0000-4000-8000-000000000001','VILLAGE','Organisasi Uji 1','30000000-0000-4000-8000-000000000004',true),
 ('10000000-0000-4000-8000-000000000002','VILLAGE','Organisasi Uji 2','30000000-0000-4000-8000-000000000004',true),
 ('10000000-0000-4000-8000-000000000004','VILLAGE','Desa Pilot','30000000-0000-4000-8000-000000000004',true);

INSERT INTO public.roles (id,role_code,role_name,critical) VALUES
 ('90000000-0000-4000-8000-000000000001','RT_OPERATOR','RT Operator',false),
 ('90000000-0000-4000-8000-000000000002','REGENCY_CITY_ADMIN','Kabupaten/Kota Admin',true),
 ('90000000-0000-4000-8000-000000000003','VILLAGE_VALIDATOR','Village Validator',true),
 ('90000000-0000-4000-8000-000000000004','DISTRICT_COORDINATOR','District Coordinator',false),
 ('90000000-0000-4000-8000-000000000005','RW_REVIEWER','RW Reviewer',false),
 ('90000000-0000-4000-8000-000000000006','PLATFORM_ADMIN','Platform Administrator',true),
 ('90000000-0000-4000-8000-000000000007','WARGA','Warga',false);

INSERT INTO public.role_assignments (user_id,role_id,scope_territory_id,organization_id,active,starts_at,ends_at) VALUES
 ('00000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000001',true,NULL,NULL),
 ('00000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000002',true,now()+interval '1 day',NULL),
 ('a1000000-0000-4000-8000-000000000008','90000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000004',true,now()-interval '1 day',NULL),
 ('a1000000-0000-4000-8000-000000000009','90000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000004',true,now()-interval '1 day',NULL),
 ('a1000000-0000-4000-8000-000000000010','90000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004',true,now()-interval '1 day',NULL),
 ('00000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004',true,now()-interval '1 day',NULL),
 ('a1000000-0000-4000-8000-000000000011','90000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004',true,now()-interval '1 day',NULL);

INSERT INTO public.rt_service_requests (territory_id,status) VALUES
 ('30000000-0000-4000-8000-000000000006','OPEN'),
 ('30000000-0000-4000-8000-000000000007','COMPLETED'),
 ('30000000-0000-4000-8000-000000000009','OPEN'),
 ('30000000-0000-4000-8000-000000000012','OPEN');
INSERT INTO public.rt_infrastructure_assets (territory_id) VALUES
 ('30000000-0000-4000-8000-000000000006'),
 ('30000000-0000-4000-8000-000000000009'),
 ('30000000-0000-4000-8000-000000000012');
INSERT INTO public.assistance_applications (territory_id) VALUES
 ('30000000-0000-4000-8000-000000000007'),
 ('30000000-0000-4000-8000-000000000009'),
 ('30000000-0000-4000-8000-000000000012');
