-- Disposable Supabase-like fixture for regional dashboard RPC tests.
-- This fixture intentionally contains no production data or credentials.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;

CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code text NOT NULL UNIQUE,
  role_name text NOT NULL,
  critical boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_code text NOT NULL UNIQUE,
  permission_name text NOT NULL,
  critical boolean NOT NULL DEFAULT false
);
CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL REFERENCES public.roles(id),
  permission_id uuid NOT NULL REFERENCES public.permissions(id),
  PRIMARY KEY (role_id, permission_id)
);
CREATE TABLE public.territories (
  id uuid PRIMARY KEY,
  parent_id uuid REFERENCES public.territories(id),
  territory_type text NOT NULL,
  code text,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role_id uuid NOT NULL REFERENCES public.roles(id),
  scope_territory_id uuid REFERENCES public.territories(id),
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.rt_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id uuid NOT NULL REFERENCES public.territories(id),
  status text NOT NULL
);
CREATE TABLE public.rt_infrastructure_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id uuid NOT NULL REFERENCES public.territories(id)
);
CREATE TABLE public.assistance_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id uuid REFERENCES public.territories(id)
);

INSERT INTO public.roles (id, role_code, role_name, critical) VALUES
 ('90000000-0000-4000-8000-000000000001','DISTRICT_COORDINATOR','Kecamatan Coordinator',true),
 ('90000000-0000-4000-8000-000000000002','REGENCY_CITY_ADMIN','Kabupaten/Kota Administrator',true),
 ('90000000-0000-4000-8000-000000000003','VILLAGE_VALIDATOR','Village Validator',true),
 ('90000000-0000-4000-8000-000000000004','RT_OPERATOR','RT Operator',false);
INSERT INTO public.permissions (permission_code, permission_name, critical) VALUES
 ('workspace.read','Read workspace',false),
 ('regional.dashboard.read','Read regional dashboard within assigned scope',false),
 ('regional.report.read','Read regional reports within assigned scope',false),
 ('regional.program.review','Review regional program information within assigned scope',true);

INSERT INTO auth.users (id) VALUES
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000003'),
 ('00000000-0000-4000-8000-000000000004'),
 ('00000000-0000-4000-8000-000000000005'),
 ('00000000-0000-4000-8000-000000000006');

-- Province -> Regency/City -> District -> Village -> RW -> RT.
INSERT INTO public.territories (id, parent_id, territory_type, name, active) VALUES
 ('30000000-0000-4000-8000-000000000001', NULL, 'PROVINCE', 'Provinsi Uji', true),
 ('30000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'REGENCY_CITY', 'Kota Uji', true),
 ('30000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'DISTRICT', 'Kecamatan A', true),
 ('30000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000003', 'VILLAGE', 'Desa A', true),
 ('30000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000004', 'RW', 'RW 01', true),
 ('30000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000005', 'RT', 'RT 01', true),
 ('30000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000003', 'VILLAGE', 'Desa B', true),
 ('30000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000002', 'DISTRICT', 'Kecamatan B', true),
 ('30000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000008', 'VILLAGE', 'Desa C', true),
 ('30000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000001', 'REGENCY_CITY', 'Kabupaten Uji', true),
 ('30000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000010', 'DISTRICT', 'Kecamatan D', true),
 ('30000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000011', 'VILLAGE', 'Desa D', true),
 ('30000000-0000-4000-8000-000000000013', '30000000-0000-4000-8000-000000000002', 'DISTRICT', 'Kecamatan Nonaktif', false);

INSERT INTO public.rt_service_requests (territory_id, status) VALUES
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

-- Minimal resident-directory fixtures for the scoped RPC security suite.
INSERT INTO public.roles (id, role_code, role_name, critical) VALUES
 ('90000000-0000-4000-8000-000000000005','RW_REVIEWER','RW Reviewer',false)
ON CONFLICT (role_code) DO NOTHING;

INSERT INTO auth.users (id) VALUES
 ('a1000000-0000-4000-8000-000000000008'),
 ('a1000000-0000-4000-8000-000000000009'),
 ('a1000000-0000-4000-8000-000000000010')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_assignments (user_id, role_id, scope_territory_id, active, starts_at, ends_at)
SELECT u.user_id, r.id, t.id, true, now() - interval '1 day', NULL
FROM (VALUES
 ('a1000000-0000-4000-8000-000000000008'::uuid,'RT_OPERATOR','30000000-0000-4000-8000-000000000006'::uuid),
 ('a1000000-0000-4000-8000-000000000009'::uuid,'RW_REVIEWER','30000000-0000-4000-8000-000000000005'::uuid),
 ('a1000000-0000-4000-8000-000000000010'::uuid,'VILLAGE_VALIDATOR','30000000-0000-4000-8000-000000000004'::uuid),
 ('00000000-0000-4000-8000-000000000001'::uuid,'DISTRICT_COORDINATOR','30000000-0000-4000-8000-000000000003'::uuid)
) AS u(user_id, role_code, scope_id)
JOIN public.roles r ON r.role_code=u.role_code
JOIN public.territories t ON t.id=u.scope_id
WHERE NOT EXISTS (
 SELECT 1 FROM public.role_assignments ra
 WHERE ra.user_id=u.user_id AND ra.role_id=r.id AND ra.scope_territory_id=t.id AND ra.active
);

CREATE TABLE public.addresses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 territory_id uuid NOT NULL REFERENCES public.territories(id),
 address_line text NOT NULL,
 postal_code text
);
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
