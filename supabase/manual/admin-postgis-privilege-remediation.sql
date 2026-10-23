-- MANUAL ADMIN REMEDIATION — run only with an execution context authorized to revoke
-- grants issued by supabase_admin. The connected role must be supabase_admin or a superuser.
-- Do not run through the current non-superuser postgres connector; it cannot revoke these grants.
BEGIN;

DO $guard$
DECLARE is_superuser boolean;
BEGIN
  SELECT rolsuper INTO is_superuser FROM pg_roles WHERE rolname = current_user;
  IF current_user <> 'supabase_admin' AND COALESCE(is_superuser,false) = false THEN
    RAISE EXCEPTION 'Run this script as supabase_admin or a superuser; current_user=%',current_user;
  END IF;
END
$guard$;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.spatial_ref_sys FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.spatial_ref_sys TO PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text,text,text,boolean) FROM PUBLIC, anon, authenticated;

DO $verify$
BEGIN
  IF has_table_privilege('anon','public.spatial_ref_sys','INSERT')
    OR has_table_privilege('anon','public.spatial_ref_sys','UPDATE')
    OR has_table_privilege('anon','public.spatial_ref_sys','DELETE')
    OR has_table_privilege('anon','public.spatial_ref_sys','TRUNCATE')
    OR has_table_privilege('authenticated','public.spatial_ref_sys','INSERT')
    OR has_table_privilege('authenticated','public.spatial_ref_sys','UPDATE')
    OR has_table_privilege('authenticated','public.spatial_ref_sys','DELETE')
    OR has_table_privilege('authenticated','public.spatial_ref_sys','TRUNCATE') THEN
    RAISE EXCEPTION 'Client write privilege remains on public.spatial_ref_sys';
  END IF;
  IF NOT has_table_privilege('anon','public.spatial_ref_sys','SELECT')
    OR NOT has_table_privilege('authenticated','public.spatial_ref_sys','SELECT') THEN
    RAISE EXCEPTION 'Expected SELECT access was not preserved on public.spatial_ref_sys';
  END IF;

  IF has_function_privilege('anon','public.st_estimatedextent(text,text)','EXECUTE')
    OR has_function_privilege('authenticated','public.st_estimatedextent(text,text)','EXECUTE')
    OR has_function_privilege('anon','public.st_estimatedextent(text,text,text)','EXECUTE')
    OR has_function_privilege('authenticated','public.st_estimatedextent(text,text,text)','EXECUTE')
    OR has_function_privilege('anon','public.st_estimatedextent(text,text,text,boolean)','EXECUTE')
    OR has_function_privilege('authenticated','public.st_estimatedextent(text,text,text,boolean)','EXECUTE') THEN
    RAISE EXCEPTION 'Client EXECUTE privilege remains on st_estimatedextent overloads';
  END IF;
END
$verify$;

COMMIT;
