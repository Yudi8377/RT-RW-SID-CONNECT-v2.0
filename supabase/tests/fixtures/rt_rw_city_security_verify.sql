-- Read-only verification for RT/RW/SID CONNECT synthetic security fixtures.
-- Expected: 6 fixture rows, one at each level; no person/household links or PII keys.
DO $verify$
DECLARE
  fixture_count integer;
  linked_count integer;
  pii_key_count integer;
  missing_level_count integer;
  rls_enabled boolean;
  anon_has_table_privilege boolean;
  scoped_select_policy boolean;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE person_id IS NOT NULL OR household_id IS NOT NULL),
         count(*) FILTER (WHERE payload::text ~* '"(nik|national_id|phone|email|full_name|birth_date)"[[:space:]]*:')
  INTO fixture_count, linked_count, pii_key_count
  FROM public.demo_operational_records
  WHERE payload->>'fixture' = 'RT_RW_CITY_SECURITY_20261027'
    AND record_type = 'SECURITY_TEST';

  SELECT count(*) INTO missing_level_count
  FROM (VALUES
    ('DEMO-RT-01','RT'), ('DEMO-RW-01','RW'), ('DEMO-DESA-01','VILLAGE'),
    ('DEMO-KEC-01','DISTRICT'), ('DEMO-KAB-01','REGENCY_CITY'), ('DEMO-PROV-01','PROVINCE')
  ) expected(code, territory_type)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.demo_operational_records d
    JOIN public.territories t ON t.id = d.territory_id
    WHERE t.code = expected.code AND t.territory_type = expected.territory_type
      AND d.record_type = 'SECURITY_TEST'
      AND d.payload->>'fixture' = 'RT_RW_CITY_SECURITY_20261027'
      AND d.payload->>'synthetic' = 'true'
      AND d.payload->>'contains_personal_data' = 'false'
  );

  SELECT c.relrowsecurity INTO rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'demo_operational_records';

  SELECT has_table_privilege('anon','public.demo_operational_records','SELECT')
    INTO anon_has_table_privilege;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = 'demo_operational_records'
      AND p.cmd = 'SELECT'
      AND 'authenticated' = ANY (p.roles::text[])
      AND p.qual LIKE '%ra.scope_territory_id = demo_operational_records.territory_id%'
  ) INTO scoped_select_policy;

  IF fixture_count <> 6 THEN RAISE EXCEPTION 'Expected 6 fixture rows; found %', fixture_count; END IF;
  IF linked_count <> 0 THEN RAISE EXCEPTION 'Fixture rows link to resident/household records: %', linked_count; END IF;
  IF pii_key_count <> 0 THEN RAISE EXCEPTION 'Fixture payload contains personal-data keys: %', pii_key_count; END IF;
  IF missing_level_count <> 0 THEN RAISE EXCEPTION 'Missing synthetic fixture level(s): %', missing_level_count; END IF;
  IF rls_enabled IS DISTINCT FROM true THEN RAISE EXCEPTION 'RLS is not enabled on demo_operational_records'; END IF;
  IF anon_has_table_privilege IS DISTINCT FROM false THEN RAISE EXCEPTION 'anon has SELECT table privilege on demo_operational_records'; END IF;
  IF scoped_select_policy IS DISTINCT FROM true THEN RAISE EXCEPTION 'Expected exact-territory SELECT policy for authenticated users was not found'; END IF;
END
$verify$;

SELECT t.territory_type, t.code, count(d.id)::int AS fixture_rows,
       count(d.id) FILTER (WHERE d.payload->>'synthetic' = 'true')::int AS synthetic_rows
FROM public.territories t
LEFT JOIN public.demo_operational_records d
  ON d.territory_id = t.id
 AND d.record_type = 'SECURITY_TEST'
 AND d.payload->>'fixture' = 'RT_RW_CITY_SECURITY_20261027'
WHERE t.code IN ('DEMO-RT-01','DEMO-RW-01','DEMO-DESA-01','DEMO-KEC-01','DEMO-KAB-01','DEMO-PROV-01')
GROUP BY t.territory_type, t.code
ORDER BY CASE t.territory_type
  WHEN 'PROVINCE' THEN 1 WHEN 'REGENCY_CITY' THEN 2 WHEN 'DISTRICT' THEN 3
  WHEN 'VILLAGE' THEN 4 WHEN 'RW' THEN 5 WHEN 'RT' THEN 6 ELSE 7 END;
