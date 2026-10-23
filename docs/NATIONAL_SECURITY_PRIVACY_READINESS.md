# National Security & Privacy Readiness — RT/RW-SID CONNECT

**Status:** Working control register. Findings below reflect checks recorded on 2026-10-23; rerun before release. This is not certification or legal advice.

## 1. Known blockers

- Commercial trial and AI Companion frontend flags remain disabled. Keep disabled until dedicated authenticated end-to-end evidence passes.
- Production rt-transaction was last recorded at version 5 and had not been verified to contain all reviewed main-branch hardening. Diff reviewed source against deployed source before deployment.
- Production assignments included RT_OPERATOR and PLATFORM_ADMIN attached to a VILLAGE territory; RT operator lacked organization mapping. RW, village validator, district and regency/city assignments were not present. Correct only through identity-verified, audited admin workflow.
- No complete authenticated trial/device lifecycle evidence: organization → trial → device → expiry/denial → audit.
- Security Advisor findings require individual triage: RLS-enabled tables without policies, public.spatial_ref_sys (production ACL inspection confirmed anon/authenticated have all table privileges on this PostGIS extension table while PUBLIC has read access), PostGIS function grants, extension schema placement, other SECURITY DEFINER grants, duplicate permissive policies, and leaked-password protection disabled. A targeted candidate migration to remove only API write privileges while preserving SELECT is under PR #144; it is not deployed.
- Existing synthetic/demo resident and household records exist in production. Never assume production is empty or use it as a disposable test database.
- Legacy sv_service_plans and sv_account_entitlements coexist with newer organization entitlements; reconciliation must be explicit.

Reference: [Production Release Gate](PRODUCTION_RELEASE_GATE.md).

## 2. Required security controls before a real-data pilot

### Identity and privileged access
- [ ] Require MFA for platform/regional administrators; test recovery, session revocation and compromised-account response.
- [ ] Remove shared accounts; use unique identities and least privilege.
- [ ] Review active assignments for correct territory type, status, validity dates, grantor and approval event.
- [ ] Separate platform operations from regional data authority.
- [ ] Add time-limited, reason-coded, audited break-glass access and review each use.
- [ ] Test privilege escalation, role self-assignment, organization/territory tampering and IDOR.

### Database, API and storage
- [ ] Inventory exposed schemas, tables, views, RPCs, triggers, Edge Functions, storage buckets and grants.
- [ ] Verify RLS/policy semantics for anon/authenticated/service roles. RLS without policies is deny-by-default but may break workflows; document intended behavior.
- [ ] Review SECURITY DEFINER functions for safe fixed search_path, minimal owner privileges, input validation and exact EXECUTE grants.
- [ ] Check RLS bypass paths through views, service-role calls, functions, exports, jobs and storage policies.
- [ ] Validate request schemas, malformed JSON, UTF-8 byte-size caps, rate limits, pagination limits, timeouts and idempotency.
- [ ] Validate upload type/size, malware scanning strategy, private buckets, signed URL expiry and access logs.
- [ ] Ensure browser bundles contain no service-role keys, database passwords, signing secrets or private AI credentials.
- [ ] Test SQL injection, unsafe dynamic SQL, mass assignment, over-posting, cross-tenant reads/writes and export abuse.

### Sensitive data and AI
- [ ] Classify identifiers, household relationships, death/movement records, health/education, precise location, documents, chat and audit logs.
- [ ] Minimize fields by documented purpose; restrict sensitive domains by role and scope.
- [ ] Default dashboards to aggregate/minimized fields; suppress small cells where needed.
- [ ] Apply the same scope/classification controls to AI retrieval as normal APIs.
- [ ] AI must not invent official policy or write/approve sensitive records without permission-checked workflow and human approval.
- [ ] Do not send personal/sensitive data to external model providers without approved data flow, legal basis, contract, retention and access controls.
- [ ] Log AI tool invocation, policy/model version, result, human approval and fallback without unnecessarily duplicating sensitive prompts.

### Operational security
- [ ] Protect main; require reviews and passing checks for production paths.
- [ ] Enable secret scanning, dependency alerts, lockfile checks, SBOM/artifact provenance and vulnerability triage.
- [ ] Use separate deployment identities and least-privilege CI credentials; rotate secrets after exposure.
- [ ] Centralize security/audit logs with restricted access, retention, clock consistency and suitable tamper resistance.
- [ ] Establish vulnerability disclosure, patch SLAs, incident commander, evidence preservation and communication templates.
- [ ] Run independent penetration testing before national launch and after material changes.

## 3. Privacy and legal governance

Before real-data pilot, name whether each party is controller, processor, joint controller or another role under applicable law. Do not assume the product owner, IT partner and government have identical obligations.

- [ ] Data inventory and flow map, including hosting region, backups, logs, analytics, AI services and subprocessors.
- [ ] Purpose/legal-basis register and clear Indonesian privacy notice.
- [ ] Retention, correction, access, deletion and complaint procedures, subject to lawful archival/public-service duties.
- [ ] Privacy impact assessment and threat model.
- [ ] Data processing agreement, security schedule, incident notification and cooperation obligations.
- [ ] Data sharing/integration agreement for each government system.
- [ ] Access, export, administrative-change and lawful-disclosure records.
- [ ] Contractual exit plan: export, transfer, return/deletion, backup expiry, credential revocation and continuity.
- [ ] Qualified Indonesian legal review against applicable PDP, public information, archives, electronic systems, procurement and sector rules.

Do not state compliant based only on a checklist. Keep evidence and counsel's determination.

## 4. Security Advisor triage rules

1. Export current Advisor results and inspect exact object definitions and grants.
2. Assign each finding an owner, severity, exploitability, data impact and remediation/test.
3. For RLS-enabled tables without policies, verify intended access first. Preserve deny-by-default; add narrow policies only after a test matrix.
4. For PostGIS objects/functions, determine platform-managed status and API exposure. Do not blanket-revoke, move extensions or enable RLS on extension tables without dependency tests and rollback plan.
5. For multiple permissive policies, calculate effective OR semantics; change only after proving the intended access matrix.
6. For leaked-password protection, verify supported Auth configuration and expected user impact before enabling.
7. Rerun Advisor and regression tests after each change; preserve before/after outputs.

## 5. Minimum negative test matrix

Each test asserts both expected response and **no unauthorized mutation**.

- Anonymous user invokes protected resident/household RPC → denied.
- Authenticated user without active assignment → denied.
- RT user requests another RT, sibling RW, parent village or unrelated territory → denied.
- Role code paired with wrong territory type → denied.
- Assignment future-dated, expired, inactive or revoked → denied.
- Client supplies another user ID, organization ID, role, classification or approval state → ignored or denied; server derives identity from verified JWT.
- Restricted health/education fields requested without exact permission/purpose → denied or omitted.
- Invalid JSON, missing fields, wrong types, oversized body, extreme pagination and repeated requests → controlled rejection/rate limiting.
- Expired or wrong-scope storage URL → denied.
- AI attempts cross-scope retrieval or sensitive write without approval → denied and audited.
- Browser attempts to activate a paid plan/change entitlement → denied; trusted server-side workflow only.
- Backup restored into isolated environment → integrity, access and recovery objectives verified.

## 6. Evidence record

For every gate attach control/test ID, environment/data classification, test identity/role/scope (never passwords/tokens), commit and deployed version/hash, repeatable procedure, expected/actual results, evidence URL/artifact/time, reviewer and residual risk, rollback decision.

## 7. Release decision

Until blockers are resolved with recorded evidence, status is **NOT CLEARED FOR REAL-DATA NATIONAL PRODUCTION**. A frontend deploy, migration or anonymous HTTP 401 smoke test is necessary but insufficient.
