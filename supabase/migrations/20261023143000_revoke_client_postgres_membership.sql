-- Client API roles must never inherit the postgres role.
-- Production metadata inspection on 2026-10-23 found anon/authenticated had postgres
-- membership with INHERIT, SET and ADMIN options, which can undermine RLS boundaries.
DO $migration$
BEGIN
  IF pg_has_role('anon', 'postgres', 'MEMBER') THEN
    EXECUTE 'REVOKE postgres FROM anon';
  END IF;
  IF pg_has_role('authenticated', 'postgres', 'MEMBER') THEN
    EXECUTE 'REVOKE postgres FROM authenticated';
  END IF;

  IF pg_has_role('anon', 'postgres', 'MEMBER')
    OR pg_has_role('authenticated', 'postgres', 'MEMBER') THEN
    RAISE EXCEPTION 'Client API roles remain members of postgres';
  END IF;
END
$migration$;
