# RT/RW-SID CONNECT — National Program Reference Architecture

**Status:** Proposed target architecture for due diligence; not a claim of certification or government approval.
**Product originator:** AKVISIO, subject to documented chain-of-title verification.
**Technology and operations:** selected IT partner under written agreement.
**Public program authority:** government only after formal appointment and governance instruments.

## 1. Design principles

1. Free core access for residents. No resident subscription, device fee, or payment condition for essential community participation. Program operating costs are funded through a separately approved institutional arrangement.
2. Federated administration, centrally governed platform. Preserve Platform Admin as a platform/security role. Regional roles receive explicit, time-bound scopes; a UI preview or selected role never grants authorization.
3. Data minimization and purpose limitation. Collect only data needed for a defined service; separate public information from personal, sensitive, and restricted records.
4. Secure by default and fail closed. Authorize every read/write server-side, including RPCs, Edge Functions, storage, exports, background jobs, and AI tools.
5. Interoperability without uncontrolled replication. Use documented APIs, stable identifiers, schema versions, provenance, idempotency, and least-privilege credentials.
6. Portable operation. Source, migrations, backups, logs, runbooks, keys and transition paths must be documented; avoid dependency on one vendor account.
7. Progressive deployment. Synthetic tests → isolated staging → controlled pilot → independent assessment → regional rollout → national scale only after evidence-based gates.

## 2. Logical layers

- Experience: responsive web/PWA and mobile; citizen portal; RT, RW, Desa/Kelurahan, Kecamatan, Kabupaten/Kota and future provincial/national workspaces; accessible Indonesian-first UX.
- Identity and access: verified identities, MFA for privileged users, session revocation, role + territory + permission + classification + purpose + context checks, separation of duties and approval for privileged changes.
- Service/API: versioned contracts, server-side validation, rate limits, payload limits, idempotency, consistent errors and correlation IDs; no privileged keys in browsers.
- Domain: canonical resident/household records, service requests, announcements, community modules, approvals and audit events. Each domain has a data owner/steward and retention rule.
- Data: PostgreSQL with reviewed schema/constraints; RLS as defense-in-depth; narrowly scoped RPCs; private object storage; encryption in transit/at rest; tested backups and recovery.
- Integration: adapters for approved government systems; explicit legal basis and data-sharing terms; schema mapping, retries, dead-letter handling and reconciliation.
- AI/automation: retrieval limited to approved knowledge; tools scoped to authenticated authority; no mutation of sensitive records without permission-checked workflow and human approval; audit source/config/tool calls and outcomes.
- Operations: protected CI/CD, review, secret/dependency scanning, SBOM, automated tests, deployment approvals, monitoring, incident response, rollback and disaster recovery.

## 3. Regional authority model

| Workspace | Intended authority | Default visibility |
|---|---|---|
| RT | Manage permitted RT workflows in assigned RT | Own scope only |
| RW | Review/coordinate permitted child RT activity | Child summaries; person-level data only when explicitly authorized |
| Desa/Kelurahan | Validate/coordinate village services | Village scope; sensitive details by purpose and permission |
| Kecamatan | Coordinate subdistrict services | Aggregated descendants by default |
| Kabupaten/Kota | Regional oversight and approved analytics | Aggregated descendants by default |
| Province/National (future) | Program monitoring and policy analytics | Aggregated/minimized data; no default unrestricted resident-level access |
| Platform Admin | Platform configuration, security and operations | No blanket right to inspect citizen data; audited break-glass access only |

This is a product design proposal, not a legal delegation of authority. Every assignment must bind user identity, role, territory ID/type, actions, validity window, status, grantor and approval/audit event. Reject missing, inactive, mismatched, future-dated, expired, parent/sibling or unrelated scopes. Never infer jurisdiction from a display label.

## 4. Canonical data and reporting

- Maintain authoritative territory hierarchy with stable IDs, effective dates, boundary/source provenance and controlled corrections.
- Keep canonical records and explicit relationship keys; avoid duplicating resident/household records at each level.
- Reconcile aggregates against authorized source rows; document filters, freshness, denominators, suppression and provenance.
- Prevent re-identification in small groups where aggregates could expose a person.
- Require approval, limits, logging and expiry for bulk exports.
- Mark synthetic demo data clearly and isolate it from real records.

## 5. National-scale deployment approach

Do not guess final infrastructure sizing. Measure representative traffic and data volume first.

Required work:
- Separate development, test, staging and production; never copy production data into test without approved de-identification.
- Design high availability and failover against the selected hosting contract.
- Model peak sessions, request rates, storage, GIS queries, uploads, queues, AI inference and regional aggregates.
- Review indexes/queries; use bounded pagination, connection pooling, caching only for appropriate data and async jobs for heavy work.
- Run load, soak, burst, rate-limit and graceful-degradation tests with approved targets.
- Test backups and restore; obtain program-owner approval for recovery point/time objectives (RPO/RTO).
- Monitor latency, errors, saturation, queue age, authorization denials, suspicious access, data drift and cost.
- Maintain deployment/rollback runbooks, change approvals and region-by-region feature flags.

Current GitHub Pages + Supabase is not by itself evidence of national availability, hosting/residency, procurement, support or service-level readiness. Reassess infrastructure and contracts against government requirements before national production.

## 6. Data protection and governance gates

Before real resident data at scale:
- identify controller(s), processor(s), data steward(s), purpose, legal basis, notices, rights-handling, retention and cross-party responsibilities;
- map personal/sensitive data flows, subprocessors, hosting, backups, logs, analytics and AI providers;
- conduct privacy impact assessment and threat modelling; validate applicable Indonesian PDP, public information, archival, electronic systems, procurement and sector rules with qualified counsel and prospective government owner;
- execute processing, confidentiality, security, incident-notification, data-sharing and exit/return/deletion terms;
- define incident triage, evidence preservation, notification decision authority and applicable legal timelines;
- validate encryption/key management, privileged access, vulnerability management and independent penetration testing.

Do not claim regulatory compliance until evidence and qualified review exist.

## 7. Proposed service objectives

The program owner and operator must approve SLOs after pilot measurements: availability, API latency, successful request rate, incident response, backup restore, accessibility, support hours and data freshness. Do not advertise an SLA before it is contractually backed and tested.

## 8. Rollout gates

1. G0 Ownership/governance: chain of title, third-party licenses, roles of AKVISIO/partner/government, data responsibilities.
2. G1 Security: critical/high findings triaged, grants reviewed, privileged paths tested, threat model approved.
3. G2 Functionality: RT→RW→Desa→Kecamatan→Kab/Kota workflows and negative authorization tests pass.
4. G3 Reliability: backup restore, failure-mode, load, mobile/browser and accessibility tests pass.
5. G4 Pilot readiness: authorized/synthetic data, support desk, incident runbook, training, notices and rollback.
6. G5 Pilot acceptance: written acceptance against agreed measures.
7. G6 Expansion: each region activated through verified approval, capacity and support readiness.
8. G7 National operations: independent security/privacy assessment, staffing, legal/procurement instruments, capacity plan and signed service governance.

No gate passes through source inspection alone; attach evidence, owner, date, commit/deployment ID and residual risk.
