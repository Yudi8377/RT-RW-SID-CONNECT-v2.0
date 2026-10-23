# National Pilot Acceptance Test Plan — RT/RW-SID CONNECT

**Status:** Proposed test plan. Targets must be approved by the prospective program owner after baseline measurement. No test is claimed to have run unless an evidence record is attached.

## 1. Purpose and rollout boundaries

Validate that the application can safely support a government-sponsored public-service pilot with free core access for residents, a contracted IT delivery/operator partner, and AKVISIO as product originator/rights holder subject to chain-of-title verification.

The pilot must not be described as national deployment. Begin with synthetic fixtures in an isolated environment. Use real personal data only after documented authority, legal basis, privacy controls, and written approval.

## 2. Test environments

| Environment | Allowed data | Deployment rule |
|---|---|---|
| Development | Synthetic fixtures only | Fast iteration; no production secrets |
| CI/ephemeral database | Synthetic fixtures | Disposable, repeatable migrations and negative tests |
| Staging | Synthetic or approved de-identified fixtures | Production-like policies and deployment process |
| Controlled pilot | Minimum necessary authorized data | Written approvals, trained users, support and incident plan |
| National production | Officially authorized data only | All rollout gates and contracts accepted |

Never copy raw production tables into CI/staging. Never use live resident NIKs or household records as test fixtures.

## 3. Functional acceptance by administrative level

For every scenario, record the test identity, role, territory ID/type, expected result, actual result, evidence and whether unauthorized data or mutation occurred.

### RT
- Submit each supported service form with valid fields.
- Reject malformed, incomplete, oversized and unknown fields.
- Verify resident/household identity resolution is scoped to the assigned territory.
- Verify status, approval, person ID, household ID and territory ID cannot be forged in client payloads.
- Confirm duplicate submission/retry behavior and audit record.

### RW
- Review only permitted child-RT queues and summaries within assigned RW.
- Reject sibling RW, unrelated RT and unrelated village access.
- Verify person-level sensitive fields are absent unless an explicit approved permission permits them.
- Confirm review does not silently overwrite RT-submitted source data.

### Desa/Kelurahan
- Validate permitted RT/RW workflows within assigned village.
- Verify village role cannot access another village, sibling village or unassigned region.
- Verify correction/rejection records preserve actor, reason, timestamp and history.

### Kecamatan and Kabupaten/Kota
- Test approved aggregates across descendant territories only.
- Test boundary cases for changed/missing/inactive territory mappings.
- Ensure dashboard totals reconcile with authorized source data and record freshness.
- Confirm aggregate filters, small-cell suppression and role-based export restrictions.
- Do not grant default unrestricted access to resident-level records.

### Platform Admin
- Platform configuration and access governance work independently from regional data authority.
- Platform Admin alone cannot create or approve territorial records.
- Break-glass access requires reason, time limit, strong authentication and audit.
- Verify admin views do not expose resident data merely because the user has platform privileges.

## 4. Security and privacy negative tests

Each denial test must assert no database mutation and no sensitive response fields:
- anonymous, invalid or expired JWT;
- authenticated user with no assignment;
- inactive, future-dated, expired or revoked assignment;
- role and territory type mismatch;
- missing scope for multi-scope user;
- parent/sibling/unrelated territory identifier tampering;
- forged user/organization/territory/person/household/status/approval fields;
- unauthorized HEALTH/EDUCATION and death-record access;
- unauthorized bulk export, storage object, signed URL, RPC and Edge Function;
- SQL injection, mass assignment, unsafe filter/sort, pagination abuse and rate-limit bypass;
- malformed JSON, wrong shape, invalid encoding, oversized payload and repeated idempotency key;
- audit-write failure and downstream integration timeout;
- AI retrieval across scopes, prompt injection from stored content, and unapproved sensitive writes.

Use separate identities and fixtures for each territory. Do not infer success from UI hiding a button; call the API/RPC directly.

## 5. Reliability and performance plan

### Baseline first
Collect current measurements before setting targets:
- p50/p95/p99 API latency by route and data size;
- successful and failed request rates;
- DB CPU, connections, slow queries, lock waits and pool saturation;
- dashboard aggregation latency and query plans;
- storage throughput and upload/download errors;
- queue age, retries, dead letters and idempotency conflicts;
- memory/CPU, cold starts, timeouts and rate-limit outcomes;
- cost per active territory, active user and representative workflow.

### Test profiles
- **Smoke:** representative critical journeys after each release.
- **Load:** gradual increase to the proposed pilot peak; measure latency/error/saturation.
- **Burst:** sudden traffic spike such as public announcements or emergency reporting.
- **Soak:** sustained representative load long enough to detect leaks, connection exhaustion and queue growth.
- **Stress:** find controlled saturation point in an isolated environment; verify graceful degradation and recovery.
- **Failover/recovery:** simulate database/edge dependency interruption where safe, restore backups in an isolated project, verify consistency and access controls.
- **Regional aggregation:** increase number of descendant territories and records; verify bounded queries and no N+1 query pattern.

Do not test destructive failure modes in production. Agree numeric SLO, peak traffic model, RPO and RTO with the program owner after baseline measurements; do not invent SLA commitments.

## 6. Data protection acceptance

- Confirm inventory of every table, view, RPC, Edge Function, storage bucket, log, export, integration and AI provider.
- Trace NIK/KK, addresses, health/education, movement/death, assistance, precise location, attachments and chat through collection, storage, display, audit, export, backup and deletion/retention.
- Verify plaintext identity fields are not unnecessarily returned by APIs or duplicated in logs/audit JSON/AI prompts.
- Validate identifier tokenization/keyed hashing strategy, key rotation and staged migration before altering existing identifiers.
- Verify purpose/authority, data-minimization, retention and correction workflow.
- Test backup restore and deletion/retention behavior consistent with legal archival duties.
- Confirm privacy notice, complaint channel, incident response and data-sharing terms have named owners.

## 7. Operational acceptance

- Protected branch, code review, CI checks and reproducible deployment artifact.
- Versioned database migrations and rollback/forward-fix plan.
- Secret scanning, dependency/license scan, SBOM and vulnerability triage.
- Centralized monitoring, security alerts, audit log access and retention.
- Incident severity matrix, escalation contact, evidence preservation and communications templates.
- Support desk and regional operator training, accessible Indonesian instructions, and manual fallback.
- Documented service ownership, funding, on-call responsibility, service objectives and vendor exit.
- Confirm no resident subscription or fee gate is introduced into core public service.

## 8. Exit criteria

Pilot can proceed only when:
1. critical findings are remediated or formally risk-accepted by the accountable authority (no unmitigated P0/P1 security issue);
2. authenticated end-to-end workflows pass for all in-scope roles;
3. cross-scope and sensitive-data negative tests pass with no unauthorized mutation;
4. backup restore and incident exercise have evidence;
5. capacity tests meet the approved pilot SLOs with headroom;
6. data protection, legal, operational and support artefacts are reviewed;
7. named stakeholders sign written pilot acceptance and rollback criteria.

National expansion requires a separate gate: regional pilot evidence, independent security/privacy review, approved national capacity and funding model, support coverage, formal government authority, procurement/partnership instruments, and tested regional onboarding/rollback.

## 9. Evidence record

Use docs/RELEASE_GATE_EVIDENCE_TEMPLATE.md for each test. Attach workflow run, commit SHA, deployed function version/hash, environment, synthetic fixture identifiers, expected/actual result, reviewer, residual risk and rollback decision.
