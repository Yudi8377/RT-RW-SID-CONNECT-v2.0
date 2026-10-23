-- Regression assertions for migration 20261023144500_restrict_spatial_ref_sys_write_grants.sql
-- Run after the migration in a disposable Supabase/Postgres test environment.
-- The local migration workflow enables PostGIS explicitly so these assertions execute.
DO $test$
BEGIN
  IF to_regclass('public.spatial_ref_sys') IS NULL THEN
    RAISE NOTICE 'PostGIS spatial_ref_sys not installed in this test environment; assertion skipped';
    RETURN;
  END IF;

  IF has_table_privilege('anon', 'public.spatial_ref_sys', 'INSERT')
    OR has_table_privilege('anon', 'public.spatial_ref_sys', 'UPDATE')
    OR has_table_privilege('anon', 'public.spatial_ref_sys', 'DELETE')
    OR has_table_privilege('anon', 'public.spatial_ref_sys', 'TRUNCATE')
    OR has_table_privilege('authenticated', 'public.spatial_ref_sys', 'INSERT')
    OR has_table_privilege('authenticated', 'public.spatial_ref_sys', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.spatial_ref_sys', 'DELETE')
    OR has_table_privilege('authenticated', 'public.spatial_ref_sys', 'TRUNCATE') THEN
    RAISE EXCEPTION 'anon/authenticated must not write to public.spatial_ref_sys';
  END IF;

  IF NOT has_table_privilege('anon', 'public.spatial_ref_sys', 'SELECT')
    OR NOT has_table_privilege('authenticated', 'public.spatial_ref_sys', 'SELECT') THEN
    RAISE EXCEPTION 'Read-only access to public.spatial_ref_sys must remain available';
  END IF;
END
$test$;
