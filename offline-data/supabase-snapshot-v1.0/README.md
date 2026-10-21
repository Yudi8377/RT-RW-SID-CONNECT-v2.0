# RT/RW-SID CONNECT Offline Data Package v1.0.0

This package is a controlled bootstrap snapshot extracted from Supabase project `gzdusguveeeflmlvvmwe`.

## Included

- Platform metadata
- Pilot territory hierarchy
- Roles and permissions
- Role-permission assignments
- Pilot organization
- Approved data-exchange dataset definitions

## Intentionally excluded

This is **not** a full production database dump. Personal and operational production data is excluded, including resident/person, household, address, health, death, service-transaction and audit-log records.

The Windows offline application must create its own local operational database and use an authenticated sync layer for cloud synchronization.

## Source

- Supabase project: Yudi8377's Project
- PostgreSQL: 17
- Region: ap-southeast-1
- Export mode: controlled-seed
- Package version: 1.0.0

## Installer behavior

The Electron Builder configuration already packages repository content into the Windows application resources. This directory therefore becomes available to the offline installer without embedding Supabase service-role credentials.

## Security gate

Supabase currently reports two RLS-enabled tables without policies:

- `public.emergency_notifications`
- `public.emergency_response_events`

Supabase also reports leaked-password protection disabled. These are recorded for a later security hardening gate and are not changed automatically by this data export.
