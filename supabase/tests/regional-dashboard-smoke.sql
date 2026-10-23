-- Regional RPC runtime and isolation tests. Run only on disposable PostgreSQL.
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.regional_dashboard_summary(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anonymous role can execute regional dashboard RPC';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.regional_dashboard_summary(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated role cannot execute regional dashboard RPC';
  END IF;
  IF has_table_privilege('authenticated', 'public.rt_service_requests', 'SELECT')
     OR has_table_privilege('authenticated', 'public.rt_infrastructure_assets', 'SELECT')
     OR has_table_privilege('authenticated', 'public.assistance_applications', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated role can directly read aggregate source tables';
  END IF;
END;
$$;

INSERT INTO public.role_assignments (user_id, role_id, scope_territory_id, active)
SELECT '00000000-0000-4000-8000-000000000001', r.id, '30000000-0000-4000-8000-000000000003', true
FROM public.roles r WHERE r.role_code='DISTRICT_COORDINATOR';
INSERT INTO public.role_assignments (user_id, role_id, scope_territory_id, active)
SELECT '00000000-0000-4000-8000-000000000002', r.id, '30000000-0000-4000-8000-000000000008', true
FROM public.roles r WHERE r.role_code='DISTRICT_COORDINATOR';
INSERT INTO public.role_assignments (user_id, role_id, scope_territory_id, active)
SELECT '00000000-0000-4000-8000-000000000004', r.id, '30000000-0000-4000-8000-000000000003', true
FROM public.roles r WHERE r.role_code='RT_OPERATOR';
INSERT INTO public.role_assignments (user_id, role_id, scope_territory_id, active)
SELECT '00000000-0000-4000-8000-000000000005', r.id, '30000000-0000-4000-8000-000000000002', true
FROM public.roles r WHERE r.role_code='REGENCY_CITY_ADMIN';
INSERT INTO public.role_assignments (user_id, role_id, scope_territory_id, active)
SELECT '00000000-0000-4000-8000-000000000006', r.id, '30000000-0000-4000-8000-000000000013', true
FROM public.roles r WHERE r.role_code='DISTRICT_COORDINATOR';

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$
DECLARE d jsonb;
BEGIN
  d := public.regional_dashboard_summary('30000000-0000-4000-8000-000000000003');
  IF d->>'scope_name' <> 'Kecamatan A' OR d->>'scope_type' <> 'DISTRICT' THEN
    RAISE EXCEPTION 'district scope identity mismatch: %', d;
  END IF;
  IF (d->>'territory_count')::integer <> 4
     OR (d->>'service_requests_total')::integer <> 2
     OR (d->>'service_requests_open')::integer <> 1
     OR (d->>'infrastructure_assets')::integer <> 1
     OR (d->>'assistance_applications')::integer <> 1 THEN
    RAISE EXCEPTION 'district aggregate counts mismatch: %', d;
  END IF;
END;
$$;

DO $$
BEGIN
  PERFORM public.regional_dashboard_summary('30000000-0000-4000-8000-000000000008');
  RAISE EXCEPTION 'cross-district scope unexpectedly allowed';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$$;

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
DO $$
BEGIN
  PERFORM public.regional_dashboard_summary('30000000-0000-4000-8000-000000000003');
  RAISE EXCEPTION 'unassigned user unexpectedly allowed';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$$;

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
DO $$
BEGIN
  PERFORM public.regional_dashboard_summary('30000000-0000-4000-8000-000000000003');
  RAISE EXCEPTION 'non-regional role unexpectedly allowed';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$$;

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',false);
DO $$
BEGIN
  PERFORM public.regional_dashboard_summary('30000000-0000-4000-8000-000000000013');
  RAISE EXCEPTION 'inactive territory unexpectedly allowed';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$$;

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',false);
DO $$
DECLARE d jsonb;
BEGIN
  d := public.regional_dashboard_summary('30000000-0000-4000-8000-000000000002');
  IF d->>'scope_name' <> 'Kota Uji' OR d->>'scope_type' <> 'REGENCY_CITY' THEN
    RAISE EXCEPTION 'regency/city scope identity mismatch: %', d;
  END IF;
  IF (d->>'territory_count')::integer <> 7
     OR (d->>'service_requests_total')::integer <> 3
     OR (d->>'service_requests_open')::integer <> 2
     OR (d->>'infrastructure_assets')::integer <> 2
     OR (d->>'assistance_applications')::integer <> 2 THEN
    RAISE EXCEPTION 'regency/city aggregate counts mismatch: %', d;
  END IF;
END;
$$;

-- A malformed hierarchy cycle must not make the recursive aggregation loop forever.
RESET ROLE;
SET statement_timeout = '3s';
UPDATE public.territories
SET parent_id = '30000000-0000-4000-8000-000000000006'
WHERE id = '30000000-0000-4000-8000-000000000003';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$
DECLARE d jsonb;
BEGIN
  d := public.regional_dashboard_summary('30000000-0000-4000-8000-000000000003');
  IF (d->>'territory_count')::integer <> 4 THEN
    RAISE EXCEPTION 'cyclic hierarchy changed de-duplicated territory count: %', d;
  END IF;
END;
$$;
RESET statement_timeout;
RESET ROLE;

-- Restore the fixture hierarchy after the deliberate cycle-safety check above.
UPDATE public.territories
SET parent_id = '30000000-0000-4000-8000-000000000002'
WHERE id = '30000000-0000-4000-8000-000000000003';

SELECT 'regional dashboard RPC smoke tests passed' AS result;
