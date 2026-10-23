-- Run after 20261023143000_revoke_client_postgres_membership.sql.
DO $test$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_auth_members AS membership
    JOIN pg_roles AS granted ON granted.oid = membership.roleid
    JOIN pg_roles AS member ON member.oid = membership.member
    WHERE member.rolname IN ('anon', 'authenticated')
      AND (granted.rolsuper OR granted.rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'anon/authenticated must not be members of superuser or BYPASSRLS roles';
  END IF;
END
$test$;
