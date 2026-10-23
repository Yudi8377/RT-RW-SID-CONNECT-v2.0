# National Program Release-Gate Evidence Template

Use one record per control/test. A checked box without attached evidence is not a passed gate.

| Field | Required value |
|---|---|
| Gate/control ID | Stable identifier, e.g. G1-AUTH-003 |
| Requirement | What must be true |
| Environment | Dev / isolated test / staging / pilot / production |
| Data class | Synthetic / personal / sensitive / public |
| Test identity | Role and territory scope; never credentials or tokens |
| Preconditions | Required role assignment, territory, flags and fixtures |
| Procedure | Repeatable steps or test command |
| Expected result | Status/result and no-mutation expectation |
| Actual result | Observed output |
| Evidence | CI run, query output, artifact, dashboard capture or signed report |
| Source version | Commit SHA and migration/function version/hash |
| Reviewer | Named reviewer and approval date |
| Residual risk | Remaining exposure, mitigation and owner |
| Rollback | Trigger, procedure and responsible operator |
| Decision | Pass / fail / blocked / not applicable with rationale |

## Mandatory national rollout evidence

- [ ] Chain of title, third-party license scan and brand rights reviewed.
- [ ] Data inventory, data-flow map, privacy impact assessment and threat model reviewed.
- [ ] Role × territory × action × data-classification matrix approved.
- [ ] Negative authorization tests pass for wrong, expired, revoked and cross-territory assignments.
- [ ] RLS, grants, views, RPCs, SECURITY DEFINER functions, storage and Edge Function paths reviewed.
- [ ] NIK/PII redaction and restricted identity lookup tests pass; no real NIK in generic payloads, logs, audit JSON, analytics or AI prompts.
- [ ] Authenticated trial/device lifecycle tests pass; no browser-side entitlement activation.
- [ ] Backup restore and recovery objectives tested.
- [ ] Load/soak/burst and graceful-degradation tests pass against approved capacity targets.
- [ ] Incident response, monitoring, support desk and operator training are ready.
- [ ] Pilot acceptance signed by named stakeholders.
- [ ] Government authority, procurement/partnership pathway, funding and data responsibilities are formally documented.
- [ ] Independent security assessment and qualified Indonesian legal/privacy review completed.

## Decision rules

- A CI pass validates only the checks executed by that workflow; it does not prove all application paths secure.
- A successful migration is not a substitute for effective privilege verification after deployment.
- No national launch while any critical finding is open or any gate lacks evidence.
- Resident core access remains Rp0 under the proposed program model; institutional pilot controls must never accidentally expire or bill residents.
- Government adoption, compliance certification, national-scale capacity and revenue must not be represented as confirmed until formally evidenced.
