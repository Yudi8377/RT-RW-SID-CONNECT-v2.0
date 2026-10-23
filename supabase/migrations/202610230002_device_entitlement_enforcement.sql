-- Server-authoritative device registration and enforcement for organization entitlements.
-- Apply after 202610230001_server_authoritative_entitlements.sql.
-- Additive only; no production data is deleted or rewritten.

create table if not exists public.organization_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  device_key_hash text not null check (device_key_hash ~ '^[a-f0-9]{64}$'),
  device_label text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED')),
  registered_by uuid references auth.users(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, device_key_hash)
);

create index if not exists organization_devices_org_status_idx
  on public.organization_devices (organization_id, status, last_seen_at desc);

alter table public.organization_devices enable row level security;
revoke all on public.organization_devices from anon, authenticated;

create or replace function public.register_organization_device(
  p_user_id uuid,
  p_organization_id uuid,
  p_device_key_hash text,
  p_device_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_period_end timestamptz;
  v_status text;
  v_limit bigint;
  v_active_count bigint;
  v_device public.organization_devices%rowtype;
begin
  if p_user_id is null or p_organization_id is null
     or p_device_key_hash is null
     or p_device_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_DEVICE_REQUEST' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.role_assignments ra
    join public.roles r on r.id = ra.role_id
    join public.organizations o on o.id = ra.organization_id and o.active = true
    where ra.user_id = p_user_id
      and ra.organization_id = p_organization_id
      and ra.active = true
      and r.role_code in (
        'RT_OPERATOR','RW_REVIEWER','VILLAGE_VALIDATOR',
        'DISTRICT_COORDINATOR','REGENCY_CITY_ADMIN','PLATFORM_ADMIN'
      )
      and (ra.starts_at is null or ra.starts_at <= pg_catalog.now())
      and (ra.ends_at is null or ra.ends_at > pg_catalog.now())
  ) then
    raise exception 'ORGANIZATION_ACCESS_DENIED' using errcode = '42501';
  end if;

  -- Serialize registrations per organization so simultaneous devices cannot exceed the limit.
  select s.status, s.current_period_ends_at
    into v_status, v_period_end
  from public.organization_subscriptions s
  where s.organization_id = p_organization_id
    and s.status in ('TRIALING','ACTIVE','GRACE')
    and s.current_period_ends_at > pg_catalog.now()
  order by s.created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'SUBSCRIPTION_INACTIVE' using errcode = 'P0001';
  end if;

  select f.numeric_limit into v_limit
  from public.organization_subscriptions s
  join public.subscription_plan_features f on f.plan_id = s.plan_id
  where s.organization_id = p_organization_id
    and s.status = v_status
    and f.feature_code = 'device_limit'
    and f.enabled = true
  order by s.created_at desc
  limit 1;

  if not found then
    raise exception 'DEVICE_ENTITLEMENT_NOT_CONFIGURED' using errcode = 'P0002';
  end if;

  select d.* into v_device
  from public.organization_devices d
  where d.organization_id = p_organization_id
    and d.device_key_hash = pg_catalog.lower(p_device_key_hash)
  limit 1;

  select count(*) into v_active_count
  from public.organization_devices d
  where d.organization_id = p_organization_id and d.status = 'ACTIVE';

  if found and v_device.id is not null and v_device.status = 'ACTIVE' then
    update public.organization_devices
    set last_seen_at = pg_catalog.now(),
        updated_at = pg_catalog.now(),
        device_label = coalesce(nullif(pg_catalog.left(pg_catalog.btrim(p_device_label), 80), ''), device_label),
        registered_by = p_user_id
    where id = v_device.id
    returning * into v_device;
  elsif v_limit is not null and v_active_count >= v_limit then
    raise exception 'DEVICE_LIMIT_REACHED' using errcode = 'P0001';
  elsif v_device.id is not null then
    update public.organization_devices
    set status = 'ACTIVE',
        last_seen_at = pg_catalog.now(),
        updated_at = pg_catalog.now(),
        device_label = nullif(pg_catalog.left(pg_catalog.btrim(p_device_label), 80), ''),
        registered_by = p_user_id
    where id = v_device.id
    returning * into v_device;
    v_active_count := v_active_count + 1;
  else
    insert into public.organization_devices (
      organization_id, device_key_hash, device_label, status, registered_by
    ) values (
      p_organization_id, pg_catalog.lower(p_device_key_hash),
      nullif(pg_catalog.left(pg_catalog.btrim(p_device_label), 80), ''),
      'ACTIVE', p_user_id
    )
    returning * into v_device;
    v_active_count := v_active_count + 1;
  end if;

  return pg_catalog.jsonb_build_object(
    'device', pg_catalog.jsonb_build_object(
      'id', v_device.id,
      'organization_id', v_device.organization_id,
      'status', v_device.status,
      'first_seen_at', v_device.first_seen_at,
      'last_seen_at', v_device.last_seen_at
    ),
    'device_limit', v_limit,
    'active_device_count', v_active_count,
    'subscription_status', v_status,
    'subscription_ends_at', v_period_end
  );
end;
$function$;

create or replace function public.start_organization_trial_with_device(
  p_user_id uuid,
  p_organization_id uuid,
  p_device_key_hash text,
  p_device_label text default null,
  p_correlation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_trial jsonb;
  v_device jsonb;
begin
  v_trial := public.start_organization_trial(p_user_id, p_organization_id, p_correlation_id);
  v_device := public.register_organization_device(
    p_user_id, p_organization_id, p_device_key_hash, p_device_label
  );
  return pg_catalog.jsonb_build_object(
    'subscription', v_trial->'subscription',
    'device', v_device->'device',
    'device_limit', v_device->'device_limit',
    'active_device_count', v_device->'active_device_count',
    'subscription_status', v_device->'subscription_status',
    'subscription_ends_at', v_device->'subscription_ends_at'
  );
end;
$function$;

revoke all on function public.register_organization_device(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.start_organization_trial_with_device(uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.register_organization_device(uuid,uuid,text,text) to service_role;
grant execute on function public.start_organization_trial_with_device(uuid,uuid,text,text,text) to service_role;

comment on table public.organization_devices is
  'Server-authoritative per-organization device registrations. Client roles cannot read or mutate this table directly.';
comment on function public.register_organization_device(uuid,uuid,text,text) is
  'Registers or refreshes an installation only when the organization has a current subscription and available device entitlement.';
comment on function public.start_organization_trial_with_device(uuid,uuid,text,text,text) is
  'Atomically starts a trial and registers its first device in the same database transaction.';
