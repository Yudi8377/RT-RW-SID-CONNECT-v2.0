-- Extend the free organization trial from 7 to 14 days.
-- Keep the existing plan code stable for compatibility; the customer-facing name and
-- authoritative duration are updated together. Existing subscriptions are not rewritten.

update public.subscription_plans
set display_name = 'Trial 14 Hari',
    duration_days = 14,
    public_description = 'Uji coba gratis selama empat belas hari untuk satu organisasi',
    updated_at = now()
where plan_code = 'TRIAL_7_DAY'
  and billing_interval = 'TRIAL'
  and active = true;

update public.subscription_plan_features f
set config = jsonb_set(
  coalesce(f.config, '{}'::jsonb),
  '{description}',
  to_jsonb('Maksimal satu perangkat untuk Trial 14 Hari'::text),
  true
)
from public.subscription_plans p
where f.plan_id = p.id
  and p.plan_code = 'TRIAL_7_DAY'
  and f.feature_code = 'device_limit';

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
  v_ends_at timestamptz;
begin
  if p_user_id is null or p_organization_id is null then
    raise exception 'INVALID_TRIAL_REQUEST' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.role_assignments ra
    join public.roles r on r.id = ra.role_id
    join public.organizations o
      on o.id = ra.organization_id
     and o.active = true
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
    and p.duration_days = 14
  limit 1;

  if not found then
    raise exception 'TRIAL_PLAN_NOT_CONFIGURED' using errcode = 'P0002';
  end if;

  v_ends_at := v_starts_at + pg_catalog.make_interval(days => v_plan.duration_days);

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
    pg_catalog.jsonb_build_object('created_by', 'start-trial-v1', 'duration_days', v_plan.duration_days)
  )
  returning * into v_subscription;

  insert into public.subscription_audit_events (
    organization_id, subscription_id, actor_user_id, event_code,
    next_status, reason, source, correlation_id, safe_metadata
  ) values (
    p_organization_id, v_subscription.id, p_user_id, 'TRIAL_STARTED',
    'TRIALING', 'Fourteen-day trial started by an authorized organization administrator',
    'SYSTEM', pg_catalog.left(p_correlation_id, 128),
    pg_catalog.jsonb_build_object('plan_code', 'TRIAL_7_DAY', 'duration_days', v_plan.duration_days)
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
  'Atomically starts one fourteen-day organization trial and writes its audit event; callable only by trusted service-role backend.';
