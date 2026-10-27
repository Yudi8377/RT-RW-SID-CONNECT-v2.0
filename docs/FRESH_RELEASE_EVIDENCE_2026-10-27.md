# Fresh Release Evidence — 2026-10-27

This file records verified, point-in-time evidence only. It is not a production-readiness certificate.

## Web and Android build

- Repository: `Yudi8377/RT-RW-SID-CONNECT-v2.0`
- Commit: `21fdb9df171fac4b23388a93176501423e1b7ea0`
- GitHub Pages deployment #558: PASS — https://github.com/Yudi8377/RT-RW-SID-CONNECT-v2.0/actions/runs/40426063396
- Android Test APK #278: PASS — https://github.com/Yudi8377/RT-RW-SID-CONNECT-v2.0/actions/runs/40426063425
- Android job log reports `BUILD SUCCESSFUL`; emergency service manifest checks, APK file check, SHA-256 command, and artifact upload all completed.
- APK artifact: `rt-rw-sid-connect-android-test-v1`; artifact ID `12699648274`; size 26,119,231 bytes; expires 2026-11-10.
- APK SHA-256: `bbb59041ae2eb0a1164ac90388db70b0fef94b1be67c9def137459452d7853cf`
- Uploaded artifact ZIP SHA-256 digest: `f3af3e2d6e80c88edb5b51307ff52eb3dbfb86c2bd8a6ae10510aedfad8d13b0`

These results prove CI build and packaging for this commit, not real-device acceptance, Google Play readiness, or production security.

## Fresh Supabase security observation

Read-only checks against Supabase project `gzdusguveeeflmlvvmwe` on 2026-10-27 confirmed:

- PostGIS 3.3.7 is installed in schema `public`.
- `public.spatial_ref_sys` has `relrowsecurity=false` and `relforcerowsecurity=false`.
- `anon` and `authenticated` have SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER privileges on that table according to `information_schema.role_table_grants`.
- Fresh Security Advisor observation at 2026-10-27 00:27 UTC reports RLS disabled on `spatial_ref_sys` (ERROR), PostGIS extension in `public` (WARN), three anon-executable `public.st_estimatedextent` SECURITY DEFINER overloads (WARN), ten authenticated-executable SECURITY DEFINER functions (WARN), and five RLS-enabled tables without policies (INFO).

No production database mutations were made during these checks. Do not blindly revoke grants, add generic policies, drop/recreate PostGIS, or use CASCADE. Follow the provider-supported remediation plan in [Issue #201](https://github.com/Yudi8377/RT-RW-SID-CONNECT-v2.0/issues/201) and the [PostGIS remediation runbook](../28_DOCUMENTATION/POSTGIS_SUPPORT_REMEDIATION_RUNBOOK.md).

## Release decision

**NO-GO for commercial activation with real resident data remains unchanged.** Web/Android CI passing does not close the security, authorization E2E, personal-data, backup/restore, subscription lifecycle, monitoring, or release-owner approval gates in [the release evidence register](./RELEASE_EVIDENCE_REGISTER.md).
