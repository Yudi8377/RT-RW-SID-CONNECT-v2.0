-- RT/RW-SID CONNECT — read-only sensitive-data and policy audit
-- SELECT-only metadata inspection. Never select resident row values with this script.

-- 1) Potentially sensitive columns by schema metadata.
SELECT table_schema,table_name,column_name,data_type
FROM information_schema.columns
WHERE table_schema IN ('public','village')
  AND column_name ~* '(nik|national_id|household|person|resident|birth|death|health|education|address|phone|email|latitude|longitude|document|message|chat|aid|assistance|beneficiary|contact|consent|payload|evidence|gender|religion|disability)'
ORDER BY table_schema,table_name,ordinal_position;

-- 2) Effective policy definitions on sensitive domains. Policies are OR-combined
-- when permissive; review every row together, not independently.
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies
WHERE schemaname IN ('public','village')
  AND tablename IN (
    'persons','households','addresses','residencies','household_person_memberships',
    'sv_master_persons','sv_master_households','death_records',
    'rt_health_observations','rt_education_profiles','assistance_applications',
    'assistance_verifications','social_economic_assessments',
    'citizen_location_events','source_documents','rt_service_requests'
  )
ORDER BY schemaname,tablename,policyname;

-- 3) Table-level API grants for sensitive tables; a grant is not sufficient to
-- bypass RLS, but must be considered alongside policies, views and RPCs.
SELECT grantee,table_schema,table_name,privilege_type
FROM information_schema.role_table_grants
WHERE table_schema IN ('public','village')
  AND grantee IN ('anon','authenticated')
  AND table_name IN (
    'persons','households','addresses','residencies','household_person_memberships',
    'sv_master_persons','sv_master_households','death_records',
    'rt_health_observations','rt_education_profiles','assistance_applications',
    'assistance_verifications','social_economic_assessments',
    'citizen_location_events','source_documents','rt_service_requests'
  )
ORDER BY grantee,table_schema,table_name,privilege_type;

-- 4) SECURITY DEFINER functions related to sensitive-data directory and admin
-- workflows. Inspect definitions and EXECUTE grants separately before changes.
SELECT n.nspname AS schema_name,p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer,
       pg_get_userbyid(p.proowner) AS owner,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public','village')
  AND p.prosecdef IS TRUE
  AND (
    p.proname ILIKE '%resident%' OR p.proname ILIKE '%household%'
    OR p.proname ILIKE '%person%' OR p.proname ILIKE '%death%'
    OR p.proname ILIKE '%health%' OR p.proname ILIKE '%education%'
    OR p.proname ILIKE '%assistance%'
  )
ORDER BY n.nspname,p.proname,arguments;

-- Guardrails:
-- * Do not query raw NIK, names, addresses, health notes or citizen messages for an audit.
-- * RLS enabled with zero policies may be intentionally deny-by-default.
-- * Never add broad policies or blanket-revoke function grants to silence an Advisor finding.
-- * Test intended access using synthetic authenticated identities and assert no unauthorized mutation.
