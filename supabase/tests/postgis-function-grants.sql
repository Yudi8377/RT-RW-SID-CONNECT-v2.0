-- Run after 20261023152000_restrict_postgis_function_execute_grants.sql.
DO $test$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.st_estimatedextent(text,text)',
    'public.st_estimatedextent(text,text,text)',
    'public.st_estimatedextent(text,text,text,boolean)'
  ] LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      IF has_function_privilege('anon',fn,'EXECUTE')
        OR has_function_privilege('authenticated',fn,'EXECUTE') THEN
        RAISE EXCEPTION 'Public client EXECUTE remains on %',fn;
      END IF;
      IF NOT has_function_privilege('service_role',fn,'EXECUTE') THEN
        RAISE EXCEPTION 'Trusted service_role EXECUTE was not preserved on %',fn;
      END IF;
    END IF;
  END LOOP;
END
$test$;
