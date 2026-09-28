create table public.territories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.territories(id) on delete restrict,
  territory_type text not null check (territory_type in ('PROVINCE','REGENCY_CITY','DISTRICT','VILLAGE','HAMLET','RW','RT')),
  code text,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(parent_id, territory_type, name)
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  territory_id uuid references public.territories(id) on delete restrict,
  address_line text,
  postal_code text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default now()
);

create table public.persons (
  id uuid primary key default gen_random_uuid(),
  national_id_hash text unique,
  full_name text not null,
  birth_place text,
  birth_date date,
  gender text check (gender in ('MALE','FEMALE','UNKNOWN')),
  phone text,
  email text,
  classification text not null default 'CONFIDENTIAL' check (classification in ('PUBLIC','INTERNAL','CONFIDENTIAL','SENSITIVE','HIGHLY_SENSITIVE')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','DECEASED','UNKNOWN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  household_number_hash text unique,
  address_id uuid references public.addresses(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.residencies (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.persons(id) on delete restrict,
  address_id uuid not null references public.addresses(id) on delete restrict,
  household_id uuid references public.households(id) on delete restrict,
  residency_status text not null default 'ACTIVE' check (residency_status in ('ACTIVE','MOVED','TEMPORARY','UNKNOWN')),
  valid_from date,
  valid_until date,
  verification_status text not null default 'DRAFT' check (verification_status in ('DRAFT','SUBMITTED','RT_VERIFIED','RW_REVIEWED','VILLAGE_REVIEW','VILLAGE_VALIDATED','AUTHORIZED','PUBLISHED','REJECTED','CORRECTION_REQUIRED','RESUBMITTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  organization_type text not null check (organization_type in ('PLATFORM','VILLAGE','RT','RW','COMMUNITY','COOPERATIVE','BUM_DESA','UMKM','OTHER')),
  name text not null,
  territory_id uuid references public.territories(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  role_code text not null unique,
  role_name text not null,
  critical boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role_id uuid not null references public.roles(id) on delete restrict,
  scope_territory_id uuid references public.territories(id) on delete restrict,
  organization_id uuid references public.organizations(id) on delete restrict,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, role_id, scope_territory_id, organization_id)
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  permission_code text not null unique,
  permission_name text not null,
  critical boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(role_id, permission_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  scope_territory_id uuid references public.territories(id) on delete restrict,
  before_data jsonb,
  after_data jsonb,
  reason text,
  source text,
  authority text,
  created_at timestamptz not null default now()
);

create index idx_territories_parent on public.territories(parent_id);
create index idx_addresses_territory on public.addresses(territory_id);
create index idx_residencies_person on public.residencies(person_id);
create index idx_residencies_address on public.residencies(address_id);
create index idx_residencies_household on public.residencies(household_id);
create index idx_role_assignments_user on public.role_assignments(user_id);
create index idx_role_assignments_scope on public.role_assignments(scope_territory_id);
create index idx_audit_logs_actor on public.audit_logs(actor_user_id);
create index idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index idx_audit_logs_scope on public.audit_logs(scope_territory_id);

alter table public.territories enable row level security;
alter table public.addresses enable row level security;
alter table public.persons enable row level security;
alter table public.households enable row level security;
alter table public.residencies enable row level security;
alter table public.organizations enable row level security;
alter table public.roles enable row level security;
alter table public.role_assignments enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.audit_logs enable row level security;

create policy "authenticated can read territories" on public.territories for select to authenticated using (true);
create policy "authenticated can read organizations" on public.organizations for select to authenticated using (true);
create policy "authenticated can read roles" on public.roles for select to authenticated using (true);
create policy "authenticated can read permissions" on public.permissions for select to authenticated using (true);
create policy "users can read own role assignments" on public.role_assignments for select to authenticated using ((select auth.uid()) = user_id);
create policy "no direct person access" on public.persons for select to authenticated using (false);
create policy "no direct household access" on public.households for select to authenticated using (false);
create policy "no direct address access" on public.addresses for select to authenticated using (false);
create policy "no direct residency access" on public.residencies for select to authenticated using (false);
create policy "no direct role permission access" on public.role_permissions for select to authenticated using (false);
create policy "no direct audit access" on public.audit_logs for select to authenticated using (false);