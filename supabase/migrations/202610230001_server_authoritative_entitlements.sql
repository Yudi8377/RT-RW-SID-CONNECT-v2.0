-- Server-authoritative subscription and entitlement foundation.
-- Additive schema only. Do not apply to production until migration history is reconciled
-- and the complete migration is validated against a disposable/staging Supabase project.
-- Payment confirmation must be performed by a trusted server/webhook, never by the browser.

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  plan_code text not null unique,
  display_name text not null,
  billing_interval text not null check (billing_interval in ('TRIAL','MONTHLY','YEARLY','CUSTOM')),
  duration_days integer check (duration_days is null or duration_days > 0),
  price_amount bigint,
  currency_code text not null default 'IDR' check (currency_code ~ '^[A-Z]{3}$'),
  active boolean not null default false,
  public_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (price_amount is null or price_amount >= 0)
);

create table if not exists public.subscription_plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  feature_code text not null check (feature_code ~ '^[a-z][a-z0-9_.-]{1,95}$'),
  enabled boolean not null default true,
  numeric_limit bigint check (numeric_limit is null or numeric_limit >= 0),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (plan_id, feature_code)
);


-- The free seven-day trial is the only commercial plan activated by this migration.
-- Paid plan prices and activation remain unconfigured until business approval.
insert into public.subscription_plans
  (plan_code, display_name, billing_interval, duration_days, price_amount, currency_code, active, public_description)
values
  ('TRIAL_7_DAY', 'Trial 7 Hari', 'TRIAL', 7, 0, 'IDR', true, 'Uji coba gratis selama tujuh hari untuk satu organisasi')
on conflict (plan_code) do nothing;

insert into public.subscription_plan_features (plan_id, feature_code, enabled, numeric_limit, config)
select p.id, 'device_limit', true, 1, '{"description":"Maksimal satu perangkat untuk Trial 7 Hari"}'::jsonb
from public.subscription_plans p
where p.plan_code = 'TRIAL_7_DAY'
on conflict (plan_id, feature_code) do nothing;

create table if not exists public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  status text not null check (status in ('TRIALING','ACTIVE','GRACE','PAST_DUE','SUSPENDED','CANCELLED','EXPIRED')),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_starts_at timestamptz not null,
  current_period_ends_at timestamptz not null,
  grace_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  activated_by uuid references auth.users(id) on delete set null,
  activation_source text not null check (activation_source in ('SYSTEM_TRIAL','VERIFIED_WEBHOOK','APPROVED_INVOICE','ADMIN_MIGRATION')),
  external_customer_ref text,
  external_subscription_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_period_ends_at > current_period_starts_at),
  check (trial_ends_at is null or trial_started_at is not null),
  check (trial_ends_at is null or trial_ends_at > trial_started_at),
  check (grace_ends_at is null or grace_ends_at >= current_period_ends_at)
);

-- Prevent concurrent paid/trial records for one organization. Historical expired rows remain.
create unique index if not exists organization_subscriptions_one_current_per_org
  on public.organization_subscriptions (organization_id)
  where status in ('TRIALING','ACTIVE','GRACE','PAST_DUE');

-- One trial per organization, including expired/cancelled trial rows.
create unique index if not exists organization_subscriptions_one_trial_per_org
  on public.organization_subscriptions (organization_id)
  where trial_started_at is not null;

create index if not exists organization_subscriptions_org_status_idx
  on public.organization_subscriptions (organization_id, status, current_period_ends_at);

create table if not exists public.subscription_billing_events (
  id uuid primary key default gen_random_uuid(),
  provider_code text not null,
  provider_event_id text not null,
  event_type text not null,
  organization_id uuid references public.organizations(id) on delete restrict,
  subscription_id uuid references public.organization_subscriptions(id) on delete restrict,
  verification_status text not null check (verification_status in ('RECEIVED','VERIFIED','REJECTED','PROCESSED','FAILED')),
  occurred_at timestamptz,
  processed_at timestamptz,
  failure_code text,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider_code, provider_event_id)
);

create index if not exists subscription_billing_events_status_idx
  on public.subscription_billing_events (verification_status, created_at);

create table if not exists public.subscription_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  subscription_id uuid references public.organization_subscriptions(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_code text not null,
  prior_status text,
  next_status text,
  reason text,
  source text not null check (source in ('SYSTEM','WEBHOOK','ADMIN','CUSTOMER')),
  correlation_id text,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists subscription_audit_events_org_time_idx
  on public.subscription_audit_events (organization_id, created_at desc);

alter table public.subscription_plans enable row level security;
alter table public.subscription_plan_features enable row level security;
alter table public.organization_subscriptions enable row level security;
alter table public.subscription_billing_events enable row level security;
alter table public.subscription_audit_events enable row level security;

-- Client access is read-only. Writes must come from trusted server-side workflows.
drop policy if exists "authenticated read active subscription plans" on public.subscription_plans;
create policy "authenticated read active subscription plans"
  on public.subscription_plans for select to authenticated
  using (active = true);

drop policy if exists "authenticated read active plan features" on public.subscription_plan_features;
create policy "authenticated read active plan features"
  on public.subscription_plan_features for select to authenticated
  using (exists (
    select 1 from public.subscription_plans p
    where p.id = plan_id and p.active = true
  ));

drop policy if exists "members read organization subscriptions" on public.organization_subscriptions;
create policy "members read organization subscriptions"
  on public.organization_subscriptions for select to authenticated
  using (exists (
    select 1
    from public.role_assignments ra
    where ra.user_id = (select auth.uid())
      and ra.organization_id = organization_subscriptions.organization_id
      and ra.active = true
      and (ra.starts_at is null or ra.starts_at <= now())
      and (ra.ends_at is null or ra.ends_at > now())
  ));

-- No direct client policies are intentionally created for billing or audit events:
-- RLS denies direct authenticated/anonymous access by default. Keep payment payloads out
-- of safe_metadata; never store card data, secrets, webhook signatures, or full raw payloads.

grant select on public.subscription_plans to authenticated;
grant select on public.subscription_plan_features to authenticated;
grant select on public.organization_subscriptions to authenticated;
revoke all on public.subscription_billing_events from anon, authenticated;
revoke all on public.subscription_audit_events from anon, authenticated;

comment on table public.subscription_plans is 'Server-authoritative plan catalog; client writes are not permitted.';
comment on table public.organization_subscriptions is 'Tenant subscription state. Only trusted backend workflows may create or mutate subscriptions.';
comment on table public.subscription_billing_events is 'Idempotent billing provider event ledger; store safe metadata only.';
comment on table public.subscription_audit_events is 'Append-only audit trail for subscription lifecycle changes.';


-- Atomic trial creation: the subscription and its audit event commit together.
-- Only the trusted Edge Function's service-role client may invoke this routine.
create or replace function public.start_organization_trial(
  p_user_id uuid,
  p_organization_id uuid,
  p_correlation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_plan public.subscription_plans%rowtype;
  v_subscription public.organization_subscriptions%rowtype;
  v_starts_at timestamptz := pg_catalog.now();
  v_ends_at timestamptz := pg_catalog.now() + interval '7 days';
begin
  if p_user_id is null or p_organization_id is null then
    raise exception 'INVALID_TRIAL_REQUEST' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.role_assignments ra
    join public.roles r on r.id = ra.role_id
    where ra.user_id = p_user_id
      and ra.organization_id = p_organization_id
      and ra.active = true
      and r.role_code in (
        'RT_OPERATOR', 'RW_REVIEWER', 'VILLAGE_VALIDATOR',
        'DISTRICT_COORDINATOR', 'REGENCY_CITY_ADMIN', 'PLATFORM_ADMIN'
      )
      and (ra.starts_at is null or ra.starts_at <= pg_catalog.now())
      and (ra.ends_at is null or ra.ends_at > pg_catalog.now())
  ) then
    raise exception 'ORGANIZATION_ACCESS_DENIED' using errcode = '42501';
  end if;

  select p.* into v_plan
  from public.subscription_plans p
  where p.plan_code = 'TRIAL_7_DAY'
    and p.active = true
    and p.billing_interval = 'TRIAL'
    and p.duration_days = 7
  limit 1;

  if not found then
    raise exception 'TRIAL_PLAN_NOT_CONFIGURED' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.organization_subscriptions s
    where s.organization_id = p_organization_id
      and s.trial_started_at is not null
  ) then
    raise exception 'TRIAL_ALREADY_USED' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.organization_subscriptions s
    where s.organization_id = p_organization_id
      and s.status in ('TRIALING','ACTIVE','GRACE','PAST_DUE','SUSPENDED')
  ) then
    raise exception 'SUBSCRIPTION_ALREADY_CURRENT' using errcode = 'P0001';
  end if;

  insert into public.organization_subscriptions (
    organization_id, plan_id, status, trial_started_at, trial_ends_at,
    current_period_starts_at, current_period_ends_at, activated_by,
    activation_source, metadata
  ) values (
    p_organization_id, v_plan.id, 'TRIALING', v_starts_at, v_ends_at,
    v_starts_at, v_ends_at, p_user_id, 'SYSTEM_TRIAL',
    pg_catalog.jsonb_build_object('created_by', 'start-trial-v1')
  )
  returning * into v_subscription;

  insert into public.subscription_audit_events (
    organization_id, subscription_id, actor_user_id, event_code,
    next_status, reason, source, correlation_id, safe_metadata
  ) values (
    p_organization_id, v_subscription.id, p_user_id, 'TRIAL_STARTED',
    'TRIALING', 'Seven-day trial started by an authorized organization administrator',
    'SYSTEM', pg_catalog.left(p_correlation_id, 128),
    pg_catalog.jsonb_build_object('plan_code', 'TRIAL_7_DAY', 'duration_days', 7)
  );

  return pg_catalog.jsonb_build_object(
    'subscription', pg_catalog.jsonb_build_object(
      'id', v_subscription.id,
      'organization_id', v_subscription.organization_id,
      'status', v_subscription.status,
      'trial_started_at', v_subscription.trial_started_at,
      'trial_ends_at', v_subscription.trial_ends_at,
      'current_period_starts_at', v_subscription.current_period_starts_at,
      'current_period_ends_at', v_subscription.current_period_ends_at
    )
  );
exception
  when unique_violation then
    raise exception 'TRIAL_OR_SUBSCRIPTION_ALREADY_EXISTS' using errcode = '23505';
end;
$function$;

revoke all on function public.start_organization_trial(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.start_organization_trial(uuid, uuid, text) to service_role;

comment on function public.start_organization_trial(uuid, uuid, text) is
  'Atomically starts one seven-day organization trial and writes its audit event; callable only by trusted service-role backend.';
