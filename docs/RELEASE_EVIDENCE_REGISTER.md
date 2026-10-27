# Release Evidence Register — RT/RW SID CONNECT

**Purpose:** keep the release decision evidence-based. This register is a working checklist, not a certificate, legal opinion, penetration-test report, or assertion of production readiness.

**Baseline reviewed:** 2026-10-27  
**Repository:** `Yudi8377/RT-RW-SID-CONNECT-v2.0`  
**Current decision:** **NO-GO for commercial activation with real resident data** until every release-blocking gate below has fresh evidence and an accountable reviewer.

## Status vocabulary

- **PASS** — evidence is linked, current, reproducible, and reviewed.
- **BLOCKED** — a known dependency or unresolved finding prevents acceptance.
- **NOT RUN** — the required test/evidence is not yet available.
- **N/A** — documented rationale approved by the release owner.

A successful build or static source inspection does not by itself establish runtime security or production readiness.

## Release-blocking gates

| ID | Gate | Current status | Evidence required to pass |
|---|---|---|---|
| SEC-01 | PostGIS extension and `spatial_ref_sys` exposure | BLOCKED | Provider-supported remediation plan; effective grants and schema verified; geometry columns, indexes, dependent views/functions and spatial queries smoke-tested; Security Advisor re-run. Do not drop/recreate PostGIS with CASCADE. |
| SEC-02 | SECURITY DEFINER functions and grants | BLOCKED | Inventory every function's owner, search_path, caller, auth checks, tenant/scope checks and effective EXECUTE grants; tests for permitted and denied callers. No blanket revocation. |
| SEC-03 | RLS and server-only tables | BLOCKED | For each exposed table, documented data classification, intended caller, RLS/policy or server-only rationale, grants, and anon/authenticated/service-role tests. Do not add permissive policies merely to silence an advisor. |
| SEC-04 | Leaked-password protection | BLOCKED | Enable the provider-supported Auth control and verify expected signup/password-change behavior. |
| AUTH-01 | Regional role/scope isolation | NOT RUN | Synthetic accounts for RT, RW, Desa/Kelurahan, Kecamatan, Kabupaten/Kota and Platform Admin; positive in-scope tests plus negative cross-scope, inactive, expired and no-assignment tests. Capture sanitized results. |
| DATA-01 | Personal-data minimization and retention | NOT RUN | Data inventory/classification, purpose and lawful-basis review, retention/deletion schedule, access logging, export controls, incident handling, and privacy notice reviewed for UU PDP obligations. |
| DB-01 | Migration and production parity | NOT RUN | Reconcile migration history with repository and deployed schema; review drift and grants; test migrations on disposable/staging clone before production change. |
| DR-01 | Backup and restore | NOT RUN | Dated backup evidence, restore into isolated environment, integrity checks, and recorded recovery time/data-loss objectives. |
| SUB-01 | Trial and device lifecycle | NOT RUN | Synthetic lifecycle tests: start, duration/expiry, one-device limit, second-device denial, revocation, renewal, audit events and timezone boundaries. Trial quality migration test alone is insufficient. |
| APP-01 | Web and Android release | NOT RUN | Current commit build, smoke tests on desktop/mobile, navigation and form tests, offline/reconnect checks where supported, accessibility review, artifact provenance and checksum. |
| OBS-01 | Monitoring and incident response | NOT RUN | Health/error monitoring, alert routing, incident owner, response runbook, secret rotation and incident communication procedure. |
| WEB3-01 | Web3 privacy/security design | PASS (design baseline only) | Before any pilot: threat model, legal/privacy review, approved event schema, key management, independent smart-contract review, testnet exercises, and documented rollback. No personal/confidential data on-chain. |
| GOV-01 | Standards and claims review | NOT RUN | Independent evidence for any certification/compliance claim. Until then, describe ISO/NIST/OWASP/WCAG as target frameworks, not certifications or proof of compliance. |

## Evidence collection rules

1. Use synthetic or properly anonymized fixtures. Never paste resident identity numbers, full household records, access tokens, passwords, private keys, or unredacted logs into CI artifacts/issues.
2. Each evidence item must record: gate ID, commit SHA, environment, run URL, timestamp, result, reviewer, and any follow-up issue.
3. A source-level check can pass only the source-review subtask; runtime and provider configuration gates remain open until tested.
4. Findings from Security/Performance Advisor must be triaged by impact and workload. Avoid unsafe broad changes that may break spatial operations or remove required application access.
5. Production database changes require a reviewed migration/change plan, backup/restore readiness, rollback plan, and post-change verification.
6. Trial, AI Companion, and other paid/real-data features remain disabled until all relevant gates pass and the release owner records an explicit go/no-go decision.

## Current evidence links

- [Web3 and standards readiness baseline](./WEB3_READINESS_AND_STANDARDS.md)
- [Production release gate](./PRODUCTION_RELEASE_GATE.md)
- [PostGIS provider remediation runbook](../28_DOCUMENTATION/POSTGIS_SUPPORT_REMEDIATION_RUNBOOK.md)
- [Regional authorization/security tracking](https://github.com/Yudi8377/RT-RW-SID-CONNECT-v2.0/issues/177)
- [Trial migration quality run](https://github.com/Yudi8377/RT-RW-SID-CONNECT-v2.0/actions/runs/40344066092)
- [Latest Pages deployment run](https://github.com/Yudi8377/RT-RW-SID-CONNECT-v2.0/actions/runs/40425366873)
- [Latest Android Test APK run](https://github.com/Yudi8377/RT-RW-SID-CONNECT-v2.0/actions/runs/40425366875)

## Web3 release invariants

- The operational database remains the source of truth for resident services.
- Only explicitly approved, non-identifying digests may be considered for anchoring; no resident PII, household records, government documents, secrets, or reversible identifiers are published on-chain.
- Normal users must not need a wallet to use core RT/RW services.
- Chain outage, fee volatility, or key rotation must not interrupt core public services.
- No production contract deployment before threat modeling, testnet validation, independent review, key custody design, and a tested incident/rollback plan.

## Release decision record

| Field | Value |
|---|---|
| Decision | NO-GO for commercial activation with real resident data |
| Decision date | 2026-10-27 |
| Blocking issues | SEC-01 to SEC-04; AUTH-01; DATA-01; DB-01; DR-01; SUB-01; APP-01; OBS-01; GOV-01 |
| Next review | After evidence is linked for all blocking gates |
| Approver | Must be explicitly recorded by the project release owner |
