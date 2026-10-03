-- Smart Village master-data, GIS and emergency foundation.
-- This layer is intentionally additive: it does not replace existing SID tables.

create extension if not exists postgis;

create table if not exists public.sv_master_territories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.sv_master_territories(id) on delete restrict,
  level text not null check (level in ('PROVINCE','REGENCY','DISTRICT','VILLAGE','RW','RT')),
  code text not null,
  name text not null,
  polygon geometry(MultiPolygon,4326),
  centroid geometry(Point,4326),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(level, code)
);

create index if not exists sv_master_territories_parent_idx on public.sv_master_territories(parent_id);
create index if not exists sv_master_territories_polygon_gix on public.sv_master_territories using gist(polygon);

create table if not exists public.sv_master_addresses (
  id uuid primary key default gen_random_uuid(),
  territory_id uuid references public.sv_master_territories(id) on delete set null,
  address_label text not null,
  house_number text,
  latitude double precision,
  longitude double precision,
  point geometry(Point,4326),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists sv_master_addresses_point_gix on public.sv_master_addresses using gist(point);

create table if not exists public.sv_master_households (
  id uuid primary key default gen_random_uuid(),
  territory_id uuid references public.sv_master_territories(id) on delete set null,
  address_id uuid references public.sv_master_addresses(id) on delete set null,
  household_number text,
  head_person_name text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sv_master_persons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  household_id uuid references public.sv_master_households(id) on delete set null,
  address_id uuid references public.sv_master_addresses(id) on delete set null,
  full_name text not null,
  national_id text,
  phone text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','MOVED','DECEASED','INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.sv_role_registry (
  role_code text primary key,
  role_name text not null,
  scope_level text not null check (scope_level in ('PERSON','RT','RW','VILLAGE','SYSTEM')),
  description text not null,
  active boolean not null default true
);

insert into public.sv_role_registry(role_code,role_name,scope_level,description) values
('WARGA','Warga','PERSON','Layanan pribadi dan informasi publik'),
('KETUA_RT','Ketua RT','RT','Kepemimpinan dan verifikasi RT'),
('PENGURUS_RT','Pengurus RT','RT','Operasional RT sesuai permission'),
('KETUA_RW','Ketua RW','RW','Kepemimpinan dan koordinasi RW'),
('PENGURUS_RW','Pengurus RW','RW','Operasional RW sesuai permission'),
('OPERATOR_DESA','Operator Desa','VILLAGE','Operasional dan validasi desa'),
('VILLAGE_VALIDATOR','Validator Desa','VILLAGE','Validasi data rujukan SID'),
('PLATFORM_ADMIN','Platform Admin','SYSTEM','Governance platform')
on conflict(role_code) do update set role_name=excluded.role_name,scope_level=excluded.scope_level,description=excluded.description;

create table if not exists public.sv_role_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_role text not null references public.sv_role_registry(role_code),
  territory_id uuid references public.sv_master_territories(id) on delete set null,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create unique index if not exists sv_role_requests_user_unique on public.sv_role_requests(user_id);\n\ncreate table if not exists public.sv_emergency_events (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  territory_id uuid references public.sv_master_territories(id) on delete set null,
  latitude double precision not null,
  longitude double precision not null,
  point geometry(Point,4326),
  category text not null default 'GENERAL',
  message text,
  consent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'OPEN' check (status in ('OPEN','ACKNOWLEDGED','RESPONDING','RESOLVED','EXPIRED','CANCELLED')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists sv_emergency_point_gix on public.sv_emergency_events using gist(point);
create index if not exists sv_emergency_active_idx on public.sv_emergency_events(status,expires_at);

create or replace function public.sv_set_point_from_latlon() returns trigger
language plpgsql as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.point := st_setsrid(st_makepoint(new.longitude,new.latitude),4326);
  end if;
  return new;
end $$;

drop trigger if exists sv_address_point on public.sv_master_addresses;
create trigger sv_address_point before insert or update of latitude,longitude on public.sv_master_addresses
for each row execute function public.sv_set_point_from_latlon();

drop trigger if exists sv_emergency_point on public.sv_emergency_events;
create trigger sv_emergency_point before insert or update of latitude,longitude on public.sv_emergency_events
for each row execute function public.sv_set_point_from_latlon();

alter table public.sv_master_territories enable row level security;
alter table public.sv_master_addresses enable row level security;
alter table public.sv_master_households enable row level security;
alter table public.sv_master_persons enable row level security;
alter table public.sv_role_registry enable row level security;
alter table public.sv_role_requests enable row level security;
alter table public.sv_emergency_events enable row level security;

drop policy if exists sv_territories_public_read on public.sv_master_territories;
create policy sv_territories_public_read on public.sv_master_territories for select using (active = true);

drop policy if exists sv_addresses_auth_read on public.sv_master_addresses;
create policy sv_addresses_auth_read on public.sv_master_addresses for select to authenticated using (active = true);

drop policy if exists sv_role_registry_auth_read on public.sv_role_registry;
create policy sv_role_registry_auth_read on public.sv_role_registry for select to authenticated using (active = true);

drop policy if exists sv_persons_self_read on public.sv_master_persons;
create policy sv_persons_self_read on public.sv_master_persons for select to authenticated using (user_id = auth.uid());

drop policy if exists sv_role_requests_self_read on public.sv_role_requests;
create policy sv_role_requests_self_read on public.sv_role_requests for select to authenticated using (user_id = auth.uid());

drop policy if exists sv_role_requests_self_insert on public.sv_role_requests;
create policy sv_role_requests_self_insert on public.sv_role_requests for insert to authenticated with check (user_id = auth.uid());

drop policy if exists sv_emergency_self_insert on public.sv_emergency_events;
create policy sv_emergency_self_insert on public.sv_emergency_events for insert to authenticated with check (requester_user_id = auth.uid());

drop policy if exists sv_emergency_self_read on public.sv_emergency_events;
create policy sv_emergency_self_read on public.sv_emergency_events for select to authenticated using (requester_user_id = auth.uid());

grant select on public.sv_master_territories, public.sv_master_addresses, public.sv_role_registry to authenticated;
grant select on public.sv_master_persons, public.sv_role_requests, public.sv_emergency_events to authenticated;
grant insert on public.sv_role_requests, public.sv_emergency_events to authenticated;

-- Never expose national IDs or private household membership through the mobile public map.
revoke all on public.sv_master_households from anon, authenticated;


-- Align the existing mobile registration profile with the five operational entry roles.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'citizen_profiles_requested_role_check') then
    alter table public.citizen_profiles drop constraint citizen_profiles_requested_role_check;
  end if;
end $$;
alter table public.citizen_profiles add constraint citizen_profiles_requested_role_check
  check (requested_role in ('WARGA','KETUA_RT','PENGURUS_RT','KETUA_RW','PENGURUS_RW'));

create or replace function public.handle_new_citizen_profile() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  v_requested_role text;
  v_status text;
  v_role_id uuid;
  v_legacy_role text;
begin
  v_requested_role := upper(coalesce(new.raw_user_meta_data->>'requested_role','WARGA'));
  if v_requested_role not in ('WARGA','KETUA_RT','PENGURUS_RT','KETUA_RW','PENGURUS_RW') then v_requested_role := 'WARGA'; end if;
  v_status := case when v_requested_role='WARGA' then 'AUTO_APPROVED' else 'PENDING_REVIEW' end;

  insert into public.citizen_profiles(user_id,full_name,phone,requested_role,approval_status,village_label,rt_number,rw_number)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''),split_part(coalesce(new.email,''),'@',1)),
    nullif(new.raw_user_meta_data->>'phone',''),
    v_requested_role,v_status,
    nullif(new.raw_user_meta_data->>'village_label',''),
    nullif(new.raw_user_meta_data->>'rt_number',''),
    nullif(new.raw_user_meta_data->>'rw_number','')
  )
  on conflict(user_id) do update set
    full_name=excluded.full_name, phone=excluded.phone, requested_role=excluded.requested_role,
    approval_status=excluded.approval_status, village_label=excluded.village_label,
    rt_number=excluded.rt_number, rw_number=excluded.rw_number, updated_at=now();

  if v_requested_role='WARGA' then
    select id into v_role_id from public.roles where role_code='WARGA' limit 1;
    if v_role_id is not null then
      insert into public.role_assignments(user_id,role_id,active)
      select new.id,v_role_id,true
      where not exists(select 1 from public.role_assignments where user_id=new.id and role_id=v_role_id and active=true);
    end if;
  else
    insert into public.sv_role_requests(user_id,requested_role, status)
    values(new.id,v_requested_role,'PENDING')
    on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created_citizen_profile on auth.users;
create trigger on_auth_user_created_citizen_profile after insert on auth.users
for each row execute function public.handle_new_citizen_profile();
