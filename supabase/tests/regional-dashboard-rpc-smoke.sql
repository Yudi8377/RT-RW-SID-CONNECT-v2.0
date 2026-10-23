-- Positive/negative tests for the scoped regional dashboard RPC.
DO $$
DECLARE
  v jsonb;
BEGIN
  PERFORM pg_catalog.set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',false);
  v := public.regional_dashboard_summary('20000000-0000-4000-8000-000000000001');
  IF v->>'scope_name' <> 'Kecamatan Uji A' THEN RAISE EXCEPTION 'wrong scope name: %',v; END IF;
  IF v->>'territory_count' <> '3' THEN RAISE EXCEPTION 'wrong descendant count: %',v; END IF;
  IF v->>'service_requests_total' <> '2' THEN RAISE EXCEPTION 'cross-scope or missing service count: %',v; END IF;
  IF v->>'service_requests_open' <> '1' THEN RAISE EXCEPTION 'wrong open service count: %',v; END IF;
  IF v->>'infrastructure_assets' <> '1' THEN RAISE EXCEPTION 'cross-scope or missing infrastructure count: %',v; END IF;
  IF v->>'assistance_applications' <> '1' THEN RAISE EXCEPTION 'cross-scope or missing assistance count: %',v; END IF;

  -- The assigned district role cannot request a different district scope.
  BEGIN
    PERFORM public.regional_dashboard_summary('20000000-0000-4000-8000-000000000002');
    RAISE EXCEPTION 'cross-territory access unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Expired, future-dated, wrong-role and wrong-territory-type assignments fail closed.
  PERFORM pg_catalog.set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',false);
  BEGIN
    PERFORM public.regional_dashboard_summary('20000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'expired assignment unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  PERFORM pg_catalog.set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000004',false);
  BEGIN
    PERFORM public.regional_dashboard_summary('20000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'wrong role unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  PERFORM pg_catalog.set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000005',false);
  BEGIN
    PERFORM public.regional_dashboard_summary('20000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'future assignment unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  PERFORM pg_catalog.set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000006',false);
  BEGIN
    PERFORM public.regional_dashboard_summary('20000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'wrong territory type unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- A correctly assigned regency role receives only its own descendants.
  PERFORM pg_catalog.set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000007',false);
  v := public.regional_dashboard_summary('10000000-0000-4000-8000-000000000001');
  IF v->>'scope_name' <> 'Kabupaten Uji A' THEN RAISE EXCEPTION 'wrong regency scope: %',v; END IF;
  IF v->>'territory_count' <> '4' THEN RAISE EXCEPTION 'wrong regency descendants: %',v; END IF;
  IF v->>'service_requests_total' <> '2' THEN RAISE EXCEPTION 'regency count leaked or missing: %',v; END IF;

  PERFORM pg_catalog.set_config('request.jwt.claim.sub','',false);
  BEGIN
    PERFORM public.regional_dashboard_summary('20000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'anonymous call unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '28000' THEN NULL;
  END;
END;
$$;

DO $$
BEGIN
  IF pg_catalog.has_function_privilege('anon','public.regional_dashboard_summary(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute regional_dashboard_summary';
  END IF;
  IF NOT pg_catalog.has_function_privilege('authenticated','public.regional_dashboard_summary(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must execute regional_dashboard_summary';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid='public.regional_dashboard_summary(uuid)'::regprocedure
      AND p.proconfig @> ARRAY['search_path=""']
  ) THEN
    RAISE EXCEPTION 'regional dashboard RPC must use an empty search_path';
  END IF;
END;
$$;

SELECT 'regional dashboard RPC smoke tests passed' AS result;
