# RT Transaction and Production Security Remediation Plan

**Evidence snapshot:** 2026-10-23. This plan records source observations and current advisor output; it is not a claim of exploit or breach.

## A. Deployed Edge Function rt-transaction — version 6 (2026-10-24)

Observed deployed SHA-256: `7ac17247005df2103f1c7d29f1014e12ab1f7288720fae7cefe56859e146279b`. JWT verification is enabled. The deployed entrypoint was read back after deployment and confirmed to contain the shared role/scope/validity authorization logic, request-size and JSON-shape validation, active territory and organization mapping checks, and audit-failure handling. Deployment identity is verified; authenticated positive/negative production smoke tests are still outstanding. The previous version 5 SHA-256 was `8e7f459331ec63915fe72ce8916cc9678d1dcc303818ab67406811b70b4b6e25`.

### Confirmed source-level concerns
- CORS uses wildcard origin. Confirm whether browser access needs to be public; if credentials are involved, use an explicit origin allowlist and never combine credentialed access with wildcard origins.
- Request JSON is parsed directly without an explicit declared/actual UTF-8 body cap or malformed-JSON-specific handling.
- The selected active assignment is filtered by user and active flag, but source shown does not validate assignment start/end dates, territory active status/type, organization consistency, or hierarchy.
- When territory_id is omitted, candidate selection can choose the first active assignment, which is ambiguous for users with multiple scopes.
- Authorization accepts any listed role code for a candidate assignment without a complete role-to-territory-type/action matrix. Sensitive-domain gating is coarse and must be replaced by explicit domain/action policy.
- All exceptions are converted to HTTP 400; distinguish authentication (401), authorization (403), validation (400/422), oversized request (413), rate limiting (429), and internal failure (500) without leaking internals.
- The audit insert result is not checked in the visible source path; define whether a failed audit write must fail the business transaction or enter a durable retry/outbox.
- The function uses a service-role client to write data. This is acceptable only if every authorization check is complete before any privileged read/write and the service-role key is never exposed to the browser.

### Required remediation
1. Implement one shared server-side authorization routine: authenticated subject → active assignment → validity window → active territory → exact territory type → allowed role/action/domain → requested scope and ancestor/descendant policy.
2. Require an explicit territory ID when the user has more than one valid scope; reject ambiguous selection.
3. Enforce body length using both Content-Length and actual UTF-8 bytes; reject malformed JSON and wrong object shapes before database access.
4. Replace broad role allowlists with an explicit permission matrix and tests for health/education/sensitive records.
5. Add rate limits and idempotency for write operations; avoid duplicate records on retries.
6. Use structured, non-sensitive errors and server-side correlation IDs; never return raw database/internal error messages to clients.
7. Make audit logging reliable, with a defined transaction/outbox approach and tests for audit failure.
8. Restrict CORS to approved origins where appropriate; CORS is not authorization and all API calls must still enforce server-side permissions.
9. Test and compare the candidate source against deployed source, then deploy only after isolated tests and reviewed approval. Read back deployed source/version/hash and run authenticated smoke tests.

## B. Current database advisor observations

Observed at 2026-10-23 13:49 UTC:
- RLS enabled on 156 ordinary tables across the checked public/village schemas; one table, public.spatial_ref_sys, was reported without RLS.
- RLS enabled without policies: public.household_person_memberships, public.organization_devices, public.subscription_audit_events, public.subscription_billing_events, village.integration_tenant_mappings.
- PostGIS st_estimatedextent overloads are exposed as SECURITY DEFINER to anon/authenticated according to Advisor.
- Additional SECURITY DEFINER functions callable by authenticated include admin household linking/directory functions and regional dashboard/resident/household RPCs; each requires function-body and caller-scope review.
- Leaked-password protection is disabled.
- PostGIS is installed in public; extension relocation requires compatibility/dependency testing.
- Production ACL inspection found `anon` and `authenticated` have explicit ALL privileges on extension-owned `public.spatial_ref_sys`, while PUBLIC has read access. A targeted migration proposal is tracked in PR #144; it must pass disposable migration tests before deployment.

### Safe triage order
1. Capture complete Advisor output and exact grants/function definitions.
2. Confirm each finding's exposure, data sensitivity and intended callers.
3. For each SECURITY DEFINER RPC, test auth.uid(), assignment validity, scope matching, bounded pagination, selected fields, search_path and exact grants.
4. For each RLS-enabled/no-policy table, verify expected denial and whether trusted server-side workflows are the only intended access path. Do not add broad policies to silence the finding.
5. Review PostGIS objects with Supabase/PostGIS guidance; do not blanket-revoke or enable RLS on extension-managed tables without dependency analysis.
6. Enable leaked-password protection after reviewing auth settings and user impact.
7. Re-run Advisor and all regression tests after each narrowly scoped migration.

## C. Required automated tests

- No JWT / invalid JWT → 401; no database mutation.
- Valid JWT but no active assignment → 403; no mutation.
- Missing territory with multiple assignments → explicit validation failure; no mutation.
- Wrong territory type, inactive territory, future/expired assignment, revoked assignment, sibling/parent/unrelated territory → denied; no mutation.
- Mismatched role/action/domain → denied; no mutation.
- HEALTH/EDUCATION access without explicit scope and permission → denied; no sensitive payload in response.
- Malformed JSON, non-object payload, missing required fields and body > 64 KiB → controlled 400/413; no mutation.
- Repeated idempotency key → one logical record only.
- Database write succeeds but audit write fails → behavior matches documented atomicity/outbox policy; no silent audit loss.
- Browser cannot submit a forged role, user ID, organization ID, status, classification or approval result.
- Valid supported RT submission → expected row, exact territory, audit event, and no unrelated side effects.
- Anonymous/authenticated RPC tests verify exact intended grants for all identified SECURITY DEFINER functions.

## D. Production safety

Do not deploy a speculative patch directly to production. Use an isolated Supabase test project/branch and synthetic data; obtain reviewed migrations and authenticated test identities; compare source/hash; then deploy a single reviewed change, verify read-back and run smoke tests. Keep commercialTrialEnabled and aiCompanionEnabled disabled until their separate release gates pass.
