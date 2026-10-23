# Production and Commercial Release Gates

Last reviewed: 2026-10-23

## What is live

- GitHub Pages deploy for main commit `8b9a70bc529e79237bb24cb64488fcc4245b7b0a` succeeded.
- Separate RT, RW, Desa/Kelurahan, Kecamatan, Kabupaten/Kota, and Platform Admin workspaces remain in the application.
- Resident and household reads now fail closed through authenticated, territory-scoped RPCs; there is no direct browser fallback to the canonical `persons` table.
- Platform Admin has a verified household-link workbench in the UI. The workbench stays unavailable until its server RPC migration is installed.
- Disposable PostgreSQL regression suites cover regional scope, resident directory, membership linking, subscription trial, and device limit behavior.

## Production gates that remain closed

### 1. Supabase migration history

The production migration history currently ends at `20261021201949`. These repository migrations are pending in order:

1. `202610230001_server_authoritative_entitlements.sql`
2. `202610230002_device_entitlement_enforcement.sql`
3. `202610230003_scoped_resident_directory.sql`
4. `202610230004_household_membership_admin_workbench.sql`

Do not run a partial subset. Reconcile the remote migration ledger, apply the full dependency chain in order, and ensure the local migration filenames match the recorded remote versions before enabling the affected UI. The first two migrations explicitly require validation against a disposable/staging Supabase environment before production application.

### 2. Role assignment scope and organization

Read-only production preflight found an active `RT_OPERATOR` assignment scoped to a `VILLAGE` territory and without an `organization_id`. The resident RPC correctly rejects this mismatch rather than exposing village-wide data to an RT operator. No role assignment was changed automatically.

Before live resident operations:
- assign each operational role to a matching territory type (RT, RW, VILLAGE, DISTRICT, or REGENCY_CITY);
- explicitly link the role assignment to the correct active organization;
- keep `PLATFORM_ADMIN` global and separately audited;
- verify the effective role and scope with authenticated smoke tests.

### 3. Verified resident-to-household relationships

Production currently has 340 households and 510 canonical persons (60 confidential records, including 2 deceased; 450 internal records). No verified canonical person-to-household membership links are present.

Do not infer relationships from names, record order, or household hashes. After migrations are installed, use the Platform Admin workbench to verify documents and create links. The workbench records an audit event and never displays or stores a national identity number in the verification note.

### 4. Commercial trial activation

`config.js` keeps `commercialTrialEnabled: false` intentionally. Do not turn it on until:

- both entitlement migrations are installed and migration history is reconciled;
- the deployed `start-trial` and `register-device` Edge Functions pass authenticated smoke tests against the installed RPCs;
- one trial per organization, seven-day expiry, and one-device enforcement are verified against the real organization/role assignment;
- the pilot organization's role assignment has an explicit organization mapping;
- customer-facing terms, privacy notice, support contact, and billing/payment flow are ready.

Only `TRIAL_7_DAY` is configured as active by the entitlement migration. Paid plans and payment-provider verification remain unconfigured; a successful Pages deploy is not proof of commercial billing readiness.

## Release sequence

1. Validate the complete migration chain in a disposable/staging Supabase environment.
2. Reconcile and apply the complete migration chain to production in order.
3. Correct role-to-territory and role-to-organization assignments through the audited admin process.
4. Use the workbench to link only document-verified resident/household pairs.
5. Run authenticated regional, resident, membership, trial, and device-limit smoke tests.
6. Enable the commercial trial UI only after the preceding checks pass.
7. Keep paid-plan activation disabled until a trusted payment-verification flow is deployed and tested.
