-- Client API roles must never inherit superuser or BYPASSRLS roles.
-- Production metadata inspection on 2026-10-23 found anon/authenticated members of
-- postgres with INHERIT, SET and ADMIN options. postgres has BYPASSRLS in production.
DO $migration$
DECLARE
  privileged_role record;
BEGIN
  FOR privileged_role IN
    SELECT DISTINCT granted.rolname
    FROM pg_auth_members AS membership
    JOIN pg_roles AS granted ON granted.oid = membership.roleid
    JOIN pg_roles AS member ON member.oid = membership.member
    WHERE member.rolname IN ('anon', 'authenticated')
      AND (granted.rolsuper OR granted.rolbypassrls)
  LOOP
    EXECUTE format('REVOKE %I FROM anon, authenticated', privileged_role.rolname);
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_auth_members AS membership
    JOIN pg_roles AS granted ON granted.oid = membership.roleid
    JOIN pg_roles AS member ON member.oid = membership.member
    WHERE member.rolname IN ('anon', 'authenticated')
      AND (granted.rolsuper OR granted.rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'Client API roles remain members of a superuser or BYPASSRLS role';
  END IF;
END
$migration$;
