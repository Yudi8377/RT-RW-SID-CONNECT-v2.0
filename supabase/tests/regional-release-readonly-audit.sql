-- RT/RW-SID CONNECT — read-only regional production audit
-- Run in Supabase SQL Editor with a privileged audit connection.
-- This script performs SELECTs only. It does not change roles, grants, policies,
-- data, feature flags, or Edge Functions. Review each result before rollout.

-- 1) Active assignments by role and territory type.
-- Any role/type mismatch or missing organization must be investigated through
-- the identity-verified admin workflow; do not auto-correct production rows.
SELECT
  r.role_code,
  t.territory_type,
  COUNT(*)::integer AS active_assignments,
  COUNT(*) FILTER (WHERE ra.organization_id IS NULL)::integer AS missing_organization
FROM public.role_assignments AS ra
JOIN public.roles AS r ON r.id = ra.role_id
LEFT JOIN public.territories AS t ON t.id = ra.scope_territory_id
WHERE ra.active IS TRUE
  AND (ra.starts_at IS NULL OR ra.starts_at <= now())
  AND (ra.ends_at IS NULL OR ra.ends_at > now())
GROUP BY r.role_code, t.territory_type
ORDER BY r.role_code, t.territory_type;

-- 2) Sensitive directory/admin RPC exposure.
-- SECURITY DEFINER is not automatically a vulnerability: inspect the function
-- body for auth.uid(), active assignment dates, exact scope checks, bounded
-- pagination, and minimum returned columns. This query reports EXECUTE grants
-- only; it does not revoke any privileges.
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  p.prosecdef AS security_definer,
  string_agg(DISTINCT COALESCE(grantee.rolname, 'PUBLIC'), ', ' ORDER BY COALESCE(grantee.rolname, 'PUBLIC'))
    FILTER (
      WHERE acl.privilege_type = 'EXECUTE'
        AND COALESCE(grantee.rolname, 'PUBLIC') IN ('PUBLIC', 'anon', 'authenticated')
    ) AS executable_by
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
CROSS JOIN LATERAL aclexplode(
  COALESCE(p.proacl, acldefault('f', p.proowner))
) AS acl
LEFT JOIN pg_roles AS grantee ON grantee.oid = acl.grantee
WHERE n.nspname = 'public'
  AND p.proname IN (
    'admin_household_link_candidates',
    'admin_link_person_to_household',
    'admin_territory_scope_options',
    'admin_unlinked_person_directory',
    'regional_dashboard_summary',
    'rt_household_directory',
    'rt_resident_directory'
  )
GROUP BY p.oid, p.proname, p.prosecdef
ORDER BY p.proname, arguments;

-- 3) Verify RLS state and policy counts for subscription/device/membership
-- tables. RLS enabled with zero policies can be an intentional deny-by-default
-- posture, but it must be confirmed against the actual access path.
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  COUNT(pol.policyname)::integer AS policy_count
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
LEFT JOIN pg_policies AS pol
  ON pol.schemaname = n.nspname
 AND pol.tablename = c.relname
WHERE n.nspname IN ('public', 'village')
  AND c.relkind IN ('r', 'p')
  AND c.relname IN (
    'organization_devices',
    'organization_subscriptions',
    'subscription_audit_events',
    'subscription_billing_events',
    'household_person_memberships',
    'integration_tenant_mappings'
  )
GROUP BY n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
ORDER BY n.nspname, c.relname;

-- 4) Confirm expected regional role codes exist; this does not grant roles.
SELECT role_code
FROM public.roles
WHERE role_code IN (
  'RT_OPERATOR',
  'RW_REVIEWER',
  'VILLAGE_VALIDATOR',
  'DISTRICT_COORDINATOR',
  'REGENCY_CITY_ADMIN',
  'PLATFORM_ADMIN',
  'WARGA'
)
ORDER BY role_code;

-- Release gate: compare the result with docs/PRODUCTION_RELEASE_GATE.md.
-- Do not enable commercialTrialEnabled or aiCompanionEnabled based on this
-- read-only report alone. Authenticated end-to-end evidence is still required.
