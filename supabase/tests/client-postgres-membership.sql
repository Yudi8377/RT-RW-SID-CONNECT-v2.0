-- Run after 20261023143000_revoke_client_postgres_membership.sql.
DO $test$
BEGIN
  IF pg_has_role('anon', 'postgres', 'MEMBER')
    OR pg_has_role('authenticated', 'postgres', 'MEMBER') THEN
    RAISE EXCEPTION 'anon/authenticated must not be members of postgres';
  END IF;
END
$test$;
