-- Disposable Supabase-like fixture for regional dashboard RPC tests.
-- This fixture intentionally contains no production data or credentials.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;

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

INSERT INTO public.roles (role_code, role_name, critical)
VALUES ('RT_OPERATOR','RT Operator',false);
INSERT INTO public.permissions (permission_code, permission_name, critical)
VALUES ('workspace.read','Read workspace',false);

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
