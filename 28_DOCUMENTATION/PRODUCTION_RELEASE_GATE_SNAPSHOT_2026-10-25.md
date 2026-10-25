# Production Release Gate Snapshot — 2026-10-25

## Scope and release decision

This is a read-only production posture snapshot and a checklist for the open security reconciliation PR. It is not a deployment approval. No production schema, role grant, Edge Function, Auth setting, or feature flag was changed by this review.

**Decision: HOLD commercial release.** Keep `commercialTrialEnabled: false` and `aiCompanionEnabled: false` until the authenticated regional authorization matrix and public endpoint runtime contracts pass.

## CI evidence on PR #181

All three workflow runs reported by GitHub for commit `3c93c46260a6cd2459a89a43fd665423576de2d8` completed successfully:

- Edge Function Source Integrity #24: https://github.com/Yudi8377/RT-RW-SID-CONNECT-v2.0/actions/runs/40108501808
- Subscription Trial Quality #218: https://github.com/Yudi8377/RT-RW-SID-CONNECT-v2.0/actions/runs/40108501760
- Regional dashboard quality #267: https://github.com/Yudi8377/RT-RW-SID-CONNECT-v2.0/actions/runs/40108501743

Subscription Trial Quality included successful type checks, trial/device policy tests, and disposable-database migration smoke tests covering trial lifecycle, device limits, grants, and tenant isolation. The `production-auth-boundary` job was skipped; this is not evidence that production authenticated authorization has passed.

## Read-only Supabase review

Project: `gzdusguveeeflmlvvmwe` (ACTIVE_HEALTHY, ap-southeast-1, PostgreSQL 17.6.1).

The live Edge Function inventory contains 19 active functions. The public functions `public-experience`, `village-preview`, and `economic-evidence-ingest` have JWT verification disabled; this can be intentional for public routes but means endpoint-level authorization, payload validation, response minimization, and abuse controls must be verified by runtime contract tests.

### Security Advisor findings observed 2026-10-25

- **ERROR:** RLS disabled on `public.spatial_ref_sys` (PostGIS-managed table).
- **WARN:** PostGIS extension is installed in `public`.
- **WARN:** Three `public.st_estimatedextent` overloads are SECURITY DEFINER and executable by `anon`; the same overloads are executable by `authenticated`.
- **WARN:** Ten SECURITY DEFINER functions are executable by `authenticated`, including regional dashboard and household-linking functions. Their existence is not proof of exploitability; each needs review of internal scope/role checks and runtime negative tests.
- **WARN:** Leaked-password protection is disabled in Supabase Auth.
- **INFO:** Five tables have RLS enabled but no policies: `public.household_person_memberships`, `public.organization_devices`, `public.subscription_audit_events`, `public.subscription_billing_events`, and `village.integration_tenant_mappings`. This may be an intentional deny-by-default posture; verify grants and service-role usage rather than adding broad policies.

Remediation references:
- RLS disabled: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public
- Extension in public: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
- Anonymous SECURITY DEFINER execution: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- Authenticated SECURITY DEFINER execution: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- Leaked-password protection: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

**Do not blindly revoke PostGIS function grants, enable RLS on extension-managed objects, or relocate PostGIS in production.** First check extension/provider ownership, schema-qualified callers, dependencies, and supported Supabase remediation. The PostGIS and Auth settings work should be performed through a reviewed provider-supported change.

## Required release gates

- [ ] Anonymous public-experience contract: only configured demo territory; unsupported methods rejected; no unpublished/private fields; safe errors; no unexpected writes.
- [ ] Anonymous village-preview contract: no service-role data disclosure outside intended public demo allowlist; method/input/error behavior verified.
- [ ] economic-evidence-ingest HMAC tests: missing, malformed, stale, wrong-signature, replayed, and valid signatures; ensure invalid requests cause no database mutation.
- [ ] Authenticated regional matrix with synthetic users and scopes: RT, RW, village, kecamatan, kabupaten/kota; no assignment, inactive/expired assignment, wrong-scope reads/writes, and platform-admin-only functions all fail closed.
- [ ] Trial/device tests with authenticated synthetic accounts: duplicate trial prevention, device limits, ownership, tenant isolation, and audit trail.
- [ ] Household-membership RPC negative tests: invalid scope, relationship/head flags, verification note, unauthorized role; successful mutation is audited.
- [ ] Review all recovered function source snapshots and compare source digests against the live inventory before any deployment.
- [ ] Decide provider-supported remediation for PostGIS and enable leaked-password protection after validating the intended login/password policy.
- [ ] Confirm public website compatibility with reduced `public-experience` response fields.
- [ ] After all tests, verify production flags remain off until explicit release approval; record commit SHA and deployed function versions if a deployment is later approved.

## Safety boundaries

Use disposable or isolated test data and dedicated synthetic accounts only. Do not assign new roles to existing production users to make tests pass. Do not use real resident PII. No production Edge Function has been redeployed as part of this PR.
