# National Identifier Protection and Migration Plan

**Status:** Proposed migration plan; no identity values were read and no identifier data was changed. Requires product, security, database and privacy review before implementation.

## 1. Why this is a release gate

Read-only schema/source inspection recorded:
- a plaintext `public.sv_master_persons.national_id` column exists;
- `public.persons.national_id_hash` exists;
- the current RT transaction source derives SHA-256 directly from the supplied 16-digit NIK for lookup.

These observations confirm schema and source patterns, not whether the plaintext column is populated, how many rows contain values, or whether an unauthorized party accessed it. A deterministic unsalted hash of a short, structured identifier is not equivalent to anonymization: the identifier space is enumerable. Do not describe either field as anonymous without a reviewed threat model.

## 2. Immediate controls — before migration

1. Inventory every consumer of both fields: application bundles, Edge Functions, RPCs, views, triggers, import/export jobs, logs, audit payloads, AI retrieval, backups and partner integrations.
2. Use metadata and counts only for discovery; never select or export raw NIK values for an audit report.
3. Ensure list/search/dashboard responses never return raw NIK unless a narrowly approved workflow requires it.
4. Remove NIK and related identity keys from generic JSON payloads, telemetry, logs and AI prompts; test recursively nested fields and string values.
5. Restrict direct table access using a reviewed policy matrix. Do not assume a table is safe because RLS is enabled.
6. Establish retention and access authority with the prospective data controller and qualified Indonesian counsel.

## 3. Target design decision

Compare and document at least these approaches:
- **Keyed HMAC/tokenization:** stable lookup tokens generated server-side using a secret held outside the database and rotated through a versioned key strategy.
- **Dedicated identity service:** identity resolution handled by a narrowly privileged service; application domains store an internal person ID rather than a NIK-derived lookup token.
- **Legacy compatibility:** retain an explicit, temporary dual-read period only when needed to migrate existing records; no client or general-purpose API may request raw NIK.

The chosen design must define collision handling, normalization, key rotation, backup/restore, authorized matching, operational recovery and separation of duties. A plain unsalted SHA-256 hash should not be treated as a secure NIK token.

## 4. Safe phased migration

### Phase A — inventory and baseline
- Map every read/write path and record owner, purpose, privilege, downstream dependency and test.
- Determine whether the legacy plaintext column is populated using aggregate counts only; never expose values.
- Capture schema, grants, policies and query dependencies; establish rollback and retention requirements.
- Create synthetic NIK fixtures for automated tests. Never embed real NIK in test fixtures or logs.

### Phase B — implement a versioned token service
- Add a server-only tokenization/HMAC function with strict 16-digit normalization and key version metadata.
- Keep secret material in approved secret management, never in source control, SQL rows, client bundles or logs.
- Deny direct client invocation and ensure only authorized identity-resolution workflows can call it.
- Add tests for malformed identifiers, repeatability within a key version, key-version rotation, access control, error handling and no raw-value logging.

### Phase C — dual-write and backfill
- Add a new versioned token column/table without dropping the old field.
- Dual-write tokens only through the approved server-side path.
- Backfill in bounded batches, with checkpoints, row counts, retry/idempotency and a dead-letter report containing internal IDs only.
- Never log raw identifiers or place them in job payloads that are broadly accessible.
- Compare match rates and duplicate/collision counts using aggregates and synthetic known fixtures.

### Phase D — shadow-read and cutover
- Compute both old and new lookup results in a restricted server-side process; do not return either token to clients.
- Measure mismatches by aggregate reason codes without raw NIK.
- Require review of unmatched/duplicate cases and documented recovery procedure.
- Switch reads to the new token only after acceptance criteria pass and downstream dependencies are updated.

### Phase E — retire legacy exposure
- Remove old-hash and plaintext-field consumers in separate reviewed changes.
- Confirm no active dependency through schema/query/code search and production telemetry.
- Retire plaintext storage only after legal retention review, signed data-owner approval, tested backups, and an approved irreversible-change plan.
- Expire old backups according to policy and verify the field is not reintroduced through restore or sync jobs.

## 5. Required tests

- Raw NIK is absent from all ordinary list/detail/dashboard/API responses.
- Generic payload sanitizer removes nested identity keys and redacts NIK-like digit strings.
- Unauthorized role cannot call tokenization/identity resolution.
- Token lookup does not reveal whether a NIK exists to an unauthorized caller.
- Rate limits prevent bulk enumeration; errors do not distinguish sensitive match outcomes unnecessarily.
- No raw NIK in application, Edge Function, database, audit, analytics, crash or AI logs.
- Token version rotation works with controlled dual-read and rollback.
- Backfill is idempotent and does not change person/household relationships.
- Cross-territory matching is denied even if a valid token exists.
- Restore test preserves token-key version metadata and recovery process without placing secrets in backups.
- Aggregate audit proves migration coverage without exporting identity values.

## 6. Acceptance gates

Do not declare identifier protection complete until:
- a named data owner approves purpose and retention;
- every consumer has been mapped;
- the token strategy and key lifecycle are reviewed;
- migration and rollback are tested on synthetic/de-identified data;
- shadow-read mismatch rate is understood and accepted;
- raw identifier exposure is tested across APIs/logs/AI/exports;
- security and privacy reviewers sign the evidence record.

This plan does not establish legal compliance by itself. Applicable Indonesian personal-data and public-sector requirements must be reviewed by qualified counsel and the prospective government data controller.
