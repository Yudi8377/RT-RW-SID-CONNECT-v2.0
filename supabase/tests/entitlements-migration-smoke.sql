-- Smoke and negative tests for the server-authoritative entitlement migration.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.subscription_plans
    WHERE plan_code = 'TRIAL_7_DAY'
      AND active = true
      AND billing_interval = 'TRIAL'
      AND duration_days = 7
      AND price_amount = 0
  ) THEN
    RAISE EXCEPTION 'free seven-day trial plan not seeded';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.subscription_plan_features f
    JOIN public.subscription_plans p ON p.id = f.plan_id
    WHERE p.plan_code = 'TRIAL_7_DAY'
      AND f.feature_code = 'device_limit'
      AND f.enabled = true
      AND f.numeric_limit = 1
  ) THEN
    RAISE EXCEPTION 'trial one-device entitlement not seeded';
  END IF;

  IF has_function_privilege('anon', 'public.start_organization_trial(uuid,uuid,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.start_organization_trial(uuid,uuid,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.start_organization_trial(uuid,uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'trial transaction function grants are not least-privilege';
  END IF;

  IF has_table_privilege('anon', 'public.subscription_billing_events', 'SELECT')
     OR has_table_privilege('authenticated', 'public.subscription_billing_events', 'SELECT')
     OR has_table_privilege('anon', 'public.subscription_audit_events', 'SELECT')
     OR has_table_privilege('authenticated', 'public.subscription_audit_events', 'SELECT') THEN
    RAISE EXCEPTION 'billing/audit tables are directly readable by clients';
  END IF;
END;
$$;

-- Successful trial creation runs under the same database role used by the Edge Function.
SET ROLE service_role;
SELECT public.start_organization_trial(
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'smoke-test-001'
);
RESET ROLE;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.organization_subscriptions) <> 1 THEN
    RAISE EXCEPTION 'expected exactly one subscription after trial start';
  END IF;
  IF (SELECT count(*) FROM public.subscription_audit_events WHERE event_code = 'TRIAL_STARTED') <> 1 THEN
    RAISE EXCEPTION 'trial audit event missing';
  END IF;
  IF (SELECT trial_ends_at - trial_started_at FROM public.organization_subscriptions LIMIT 1) <> interval '7 days' THEN
    RAISE EXCEPTION 'trial duration is not exactly seven days';
  END IF;
END;
$$;

-- The same organization cannot receive a second trial.
DO $$
BEGIN
  PERFORM public.start_organization_trial(
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'smoke-test-duplicate'
  );
  RAISE EXCEPTION 'duplicate trial unexpectedly succeeded';
EXCEPTION
  WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'TRIAL_ALREADY_USED' THEN RAISE; END IF;
END;
$$;

-- A user without an active administrative assignment cannot start a trial.
DO $$
BEGIN
  PERFORM public.start_organization_trial(
    '00000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'smoke-test-denied'
  );
  RAISE EXCEPTION 'unauthorized trial unexpectedly succeeded';
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END;
$$;

-- A future-dated role assignment is not eligible to start a trial.
DO $
BEGIN
  PERFORM public.start_organization_trial(
    '00000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'smoke-test-future-assignment'
  );
  RAISE EXCEPTION 'future assignment unexpectedly authorized';
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END;
$;

-- A suspended subscription must not be bypassed by starting a free trial.
UPDATE public.role_assignments
SET starts_at = NULL
WHERE user_id = '00000000-0000-4000-8000-000000000002';
INSERT INTO public.organization_subscriptions (
  organization_id, plan_id, status, current_period_starts_at, current_period_ends_at,
  activated_by, activation_source
)
SELECT
  '10000000-0000-4000-8000-000000000002', p.id, 'SUSPENDED',
  pg_catalog.now(), pg_catalog.now() + interval '30 days',
  '00000000-0000-4000-8000-000000000002', 'ADMIN_MIGRATION'
FROM public.subscription_plans p
WHERE p.plan_code = 'TRIAL_7_DAY';

DO $
BEGIN
  PERFORM public.start_organization_trial(
    '00000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'smoke-test-suspended-subscription'
  );
  RAISE EXCEPTION 'suspended subscription unexpectedly received a trial';
EXCEPTION
  WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'SUBSCRIPTION_ALREADY_CURRENT' THEN RAISE; END IF;
END;
$;

-- RLS allows the assigned user to read its own organization's subscription only.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.organization_subscriptions) <> 1 THEN
    RAISE EXCEPTION 'assigned user cannot read own organization subscription';
  END IF;
END;
$$;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', false);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.organization_subscriptions) <> 0 THEN
    RAISE EXCEPTION 'cross-tenant subscription read was not blocked';
  END IF;
END;
$$;
RESET ROLE;

SELECT 'entitlement migration smoke tests passed' AS result;
