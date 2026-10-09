# RT/RW CONNECT → SAD Integration Contract (Draft v1)

Status: **design contract; not yet an active data sync**  
Prepared: 2026-10-09  
Source repository: `Yudi8377/RT-RW-SID-CONNECT-v2.0`  
Target system: `n30AK/SISTEM-ADMINISTRASI-DESA`

## 1. Goal and system boundary

RT/RW CONNECT remains the operational source for RT/RW field intake. SAD remains the village-level system of record for village administration and decisions. Data must move only through an explicitly approved, authenticated, versioned API contract. A shared Supabase project or matching table names must never be treated as authorization to read/write across applications.

This document is a contract proposal. It does **not** claim that a production endpoint, destination credentials, or end-to-end sync currently exists.

## 2. Safe delivery model

1. A user submits or changes a record in RT/RW CONNECT under an authenticated role and authorized territory.
2. Only records explicitly eligible for sharing are placed in an integration outbox after validation. Drafts, rejected records, and demo/seed records are excluded by default.
3. A server-side worker sends a signed/authenticated request to a SAD ingress endpoint. Secrets stay in server environment variables; never in `config.js`, browser bundles, Git history, or public Pages.
4. SAD authenticates the source system, validates the contract and its own organization/territory mapping, then stores the event in an import/reconciliation queue.
5. SAD returns an acknowledgement with an event ID and outcome. The source records delivery status and retries transient failures with bounded exponential backoff.
6. Records are not considered accepted into official village data until SAD-side validation/review succeeds. An HTTP success only means the request was received, not that it became an official record.

**Prerequisite:** SAD maintainers must provide/approve the ingress URL, authentication method, destination schema mapping, and deployment secrets before any live transmission can be enabled. The connected GitHub identity currently has read access to the SAD repository but does not have permission to create a branch there.

## 3. Minimum event envelope

```json
{
  "contract": "rtrw-sad/v1",
  "event_id": "stable UUID generated once at source",
  "event_type": "service_request.submitted",
  "source_system": "RT_RW_SID_CONNECT",
  "source_record_id": "source UUID",
  "source_updated_at": "ISO-8601 UTC timestamp",
  "organization_mapping_key": "approved stable mapping key",
  "territory_mapping_key": "approved stable mapping key",
  "classification": "INTERNAL",
  "purpose_code": "VILLAGE_SERVICE_PROCESSING",
  "verification_status": "SUBMITTED",
  "data": {}
}
```

This is an envelope example, not a claim that the example IDs or endpoint exist. The payload schema must be allow-listed per event type; do not send entire database rows by default.

## 4. Initial event allow-list

| RT/RW source domain | SAD destination purpose | Default sharing rule |
|---|---|---|
| Organization and territory | Organization/territory mapping | Stable IDs; explicit mapping review |
| Service request | Public-service intake queue | Minimum necessary fields; status and audit |
| Planning/infrastructure proposal | Village planning review | Submitted/verified proposals only |
| Community organization/activity | Institutions and activity registry | Approved fields, source and date |
| Business/work/agriculture | Village economy analytics | Aggregated or access-restricted data |
| Resident/household | Resident/family reconciliation queue | No blind overwrite; identity reconciliation and deduplication |
| Health/education/disaster observation | Indicators and authorized follow-up | Aggregate by default; sensitive detail restricted |
| RT/RW cash records | Oversight/reconciliation only | Never auto-post to village books/APB Desa |

The source must exclude NIK, phone numbers, precise household details, health data, and free-text notes unless the event contract specifically authorizes those fields for a lawful purpose and the receiving role is authorized.

## 5. Idempotency, conflicts and retries

- `event_id` is immutable across retries. SAD must enforce uniqueness for the source system plus event ID.
- Upserts must use a documented source key and version/timestamp check; never use fuzzy name matching to overwrite an identity.
- A replay of an already accepted event must return the original acknowledgement without duplicating data.
- A stale update must be rejected or queued as a conflict, not silently overwrite a newer record.
- Retry only network errors, rate limits, and server-side transient errors. Validation/authorization failures go to a review queue.
- Maintain an operator-visible queue for pending, delivered, accepted, rejected, retrying, and conflict states.

## 6. Security and privacy requirements

- Server-to-server authentication; rotate credentials and scope them to the integration.
- Enforce organization and territory authorization at both ends. Do not trust organization IDs supplied only by a browser.
- Keep credentials in Supabase Edge Function secrets or another approved server-side secret store.
- Verify request timestamp/signature or use an equivalent replay-resistant authenticated transport.
- Apply payload schema validation, field allow-lists, size limits, rate limits, and content-type checks.
- Audit actor/source, purpose, event ID, target scope, decision, timestamp, and error class; avoid copying sensitive payloads into logs.
- Use TLS; do not log tokens, full NIK, phone numbers, or sensitive free text.
- Demo/test data must be clearly labelled and blocked from production synchronization unless a separate test environment is explicitly configured.
- Respect retention, correction, export, and deletion procedures approved by both system owners.

## 7. Mapping and reconciliation

A mapping registry must explicitly relate source organization/territory IDs to SAD organization/territory IDs. Mapping entries require review and active/inactive status. Unknown or ambiguous mappings must be rejected into reconciliation; do not create a new village or territory automatically.

For resident/family data, SAD performs matching/reconciliation and keeps source provenance. No identity is declared officially verified merely because it was received from RT/RW CONNECT.

## 8. Operational monitoring

Track at minimum: events created, delivered, accepted, rejected, retry count, oldest pending event, duplicate/replay count, mapping failures, schema failures, and last successful exchange. Dashboards must show source and last-updated time. Alert on persistent failures without exposing personal data.

## 9. Acceptance tests before enabling live sync

- Unauthenticated and invalidly authenticated requests are rejected.
- A source user cannot submit data outside their assigned organization/territory.
- An unknown territory mapping is quarantined and does not create a destination record.
- Replaying the same event twice creates one destination event only.
- An older update cannot silently overwrite a newer destination record.
- Demo records and disallowed sensitive fields are excluded.
- Sensitive domains are hidden from unauthorized roles and public dashboards.
- A transient outage queues events and retries without duplication.
- Every accepted/rejected event is traceable by event ID with an audit entry.
- A real test from source submission through SAD acknowledgement and destination UI is captured as evidence before declaring integration live.

## 10. Implementation gates

**Gate A — contract and ownership:** SAD owner confirms event schema, endpoint, auth method, field allow-list, mappings, and test environment.

**Gate B — source outbox:** add an outbox table and server-side dispatcher with idempotent retries and dead-letter/reconciliation states.

**Gate C — SAD ingress:** implement authenticated ingress and import queue in the SAD repository; this requires write access from the SAD maintainer.

**Gate D — end-to-end proof:** run security and functional tests against a non-production target, then document evidence and enable production only after explicit approval.

Until Gates A–D pass, the integration status must remain **planned / not yet end-to-end verified**.
