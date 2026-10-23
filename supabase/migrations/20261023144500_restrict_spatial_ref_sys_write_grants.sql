-- Restrict writes to PostGIS' extension-managed coordinate reference table.
-- Public read access is retained; application API roles do not need to alter SRID definitions.
DO $migration$
BEGIN
  IF to_regclass('public.spatial_ref_sys') IS NOT NULL THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.spatial_ref_sys FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT SELECT ON TABLE public.spatial_ref_sys TO PUBLIC, anon, authenticated';

    IF has_table_privilege('anon', 'public.spatial_ref_sys', 'INSERT')
      OR has_table_privilege('anon', 'public.spatial_ref_sys', 'UPDATE')
      OR has_table_privilege('anon', 'public.spatial_ref_sys', 'DELETE')
      OR has_table_privilege('anon', 'public.spatial_ref_sys', 'TRUNCATE')
      OR has_table_privilege('authenticated', 'public.spatial_ref_sys', 'INSERT')
      OR has_table_privilege('authenticated', 'public.spatial_ref_sys', 'UPDATE')
      OR has_table_privilege('authenticated', 'public.spatial_ref_sys', 'DELETE')
      OR has_table_privilege('authenticated', 'public.spatial_ref_sys', 'TRUNCATE') THEN
      RAISE EXCEPTION 'API write privileges remain on public.spatial_ref_sys';
    END IF;

    IF NOT has_table_privilege('anon', 'public.spatial_ref_sys', 'SELECT')
      OR NOT has_table_privilege('authenticated', 'public.spatial_ref_sys', 'SELECT') THEN
      RAISE EXCEPTION 'Expected read access to public.spatial_ref_sys was not preserved';
    END IF;
  END IF;
END
$migration$;
