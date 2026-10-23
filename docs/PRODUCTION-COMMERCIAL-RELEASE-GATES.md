# Production and Commercial Release Gates

Last reviewed: 2026-10-23

## What is live

- GitHub Pages deploy #489 for main commit `a6e0f8f4c7c693681a7d93b5c60360cd31aef2c5` succeeded; Android Test APK #209 was still running at last check.
- Separate RT, RW, Desa/Kelurahan, Kecamatan, Kabupaten/Kota, and Platform Admin workspaces remain in the application.
- Resident and household reads now fail closed through authenticated, territory-scoped RPCs; there is no direct browser fallback to the canonical `persons` table.
- Platform Admin has a household-link workbench in the UI and its server RPC migration is installed. Authenticated production use still requires a valid admin session, scope, and E2E verification.
- Disposable PostgreSQL regression suites cover regional scope, resident directory, membership linking, subscription trial, and device limit behavior.

## Production gates that remain closed

### 1. Supabase migration history — deployed; verify behavior end to end

The production migration ledger was queried directly and includes this additive chain:

1. `20261023075802` — `regional_dashboard_roles`
2. `20261023075806` — `regional_dashboard_summary_rpc`
3. `20261023075811` — `server_authoritative_entitlements`
4. `20261023075816` — `device_entitlement_enforcement`
5. `20261023075820` — `scoped_resident_directory`
6. `20261023075825` — `household_membership_admin_workbench`

The production Edge Functions `start-trial` and `register-device` are ACTIVE with JWT verification enabled. The disposable migration/trial regression workflows passed after these changes. The remaining blocker is authenticated end-to-end verification against the actual production organization, role assignment, and device—not migration deployment. Keep the commercial UI flag off until that flow passes.

### 2. Role assignment scope and organization

Read-only production verification confirms the active `RT_OPERATOR` assignment is scoped to a `VILLAGE` territory and has no `organization_id`. The resident RPC correctly rejects this mismatch rather than exposing village-wide data to an RT operator. The only other active assignments are Platform Admin and Warga; there are no active assignments for RW, Desa/Kelurahan, Kecamatan, or Kabupaten/Kota. No role assignment was changed automatically.

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
