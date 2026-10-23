-- PostGIS extent estimation helpers are SECURITY DEFINER and not used by this app.
-- Keep them available to trusted server-side roles, not the public client API roles.
DO $migration$
BEGIN
  IF to_regprocedure('public.st_estimatedextent(text,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text,text) FROM PUBLIC, anon, authenticated';
  END IF;
  IF to_regprocedure('public.st_estimatedextent(text,text,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text,text,text) FROM PUBLIC, anon, authenticated';
  END IF;
  IF to_regprocedure('public.st_estimatedextent(text,text,text,boolean)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text,text,text,boolean) FROM PUBLIC, anon, authenticated';
  END IF;

  IF to_regprocedure('public.st_estimatedextent(text,text)') IS NOT NULL
    AND (has_function_privilege('anon','public.st_estimatedextent(text,text)','EXECUTE')
      OR has_function_privilege('authenticated','public.st_estimatedextent(text,text)','EXECUTE')) THEN
    RAISE EXCEPTION 'Public client execute privilege remains on st_estimatedextent(text,text)';
  END IF;
  IF to_regprocedure('public.st_estimatedextent(text,text,text)') IS NOT NULL
    AND (has_function_privilege('anon','public.st_estimatedextent(text,text,text)','EXECUTE')
      OR has_function_privilege('authenticated','public.st_estimatedextent(text,text,text)','EXECUTE')) THEN
    RAISE EXCEPTION 'Public client execute privilege remains on st_estimatedextent(text,text,text)';
  END IF;
  IF to_regprocedure('public.st_estimatedextent(text,text,text,boolean)') IS NOT NULL
    AND (has_function_privilege('anon','public.st_estimatedextent(text,text,text,boolean)','EXECUTE')
      OR has_function_privilege('authenticated','public.st_estimatedextent(text,text,text,boolean)','EXECUTE')) THEN
    RAISE EXCEPTION 'Public client execute privilege remains on st_estimatedextent(text,text,text,boolean)';
  END IF;
END
$migration$;
