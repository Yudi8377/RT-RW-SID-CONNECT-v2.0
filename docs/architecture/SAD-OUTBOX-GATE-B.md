# RT/RW CONNECT → SAD: Gate B source outbox

## Current status

This change adds the first source-side queue for the initial event type, `service_request.submitted`. It is **not a live synchronization** and intentionally does not call SAD over the network. SAD ingress, approved credentials, and an operator-approved deployment target are still prerequisites.

## Files

- `supabase/migrations/20261009150000_sad_integration_outbox_v1.sql`: approved scope mapping and service-role-only outbox.
- `supabase/functions/sad-integration-outbox/index.ts`: authenticated enqueue endpoint.
- This document: setup and acceptance checklist.

## Security behavior

- Requires a valid Supabase user session and active role assignment for the exact territory.
- Supports only `rt_service_requests` records that are already in an allowed submitted/review status.
- Requires an active mapping row linking the exact source organization and territory to approved SAD references. No automatic territory creation.
- Sends only source record UUID, service type, status and timestamps to the queue. Names, NIK, phone, address, free-text payload, health details and other source payload fields are not copied.
- Outbox and mapping tables have no browser-role grants or RLS policies; the Edge Function uses service-role access only after verifying the user's JWT and scope.
- Duplicate enqueue calls for the same source record version return the existing event.
- No sender/dispatcher exists in this phase. Queue rows remain `PENDING` until a separately reviewed dispatcher is implemented.

## Required deployment configuration

The Edge Function relies on existing Supabase function secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Do not place the service-role key in frontend code, config files, GitHub Pages, or this repository.

Before a mapping can be activated, the system owner must confirm the destination organization's and territory's stable identifiers. A mapping row is inactive by default and can only be activated when `approved_by` and `approved_at` are set. Use an authorized administrative process; do not seed guessed IDs.

## Acceptance checklist

1. Anonymous request returns 401.
2. Authenticated user without a role assignment for the exact territory returns 403.
3. Draft/rejected/missing source request is not queued.
4. No approved mapping returns 409 and does not create an outbox row.
5. Approved mapping queues a minimized payload and creates an audit record.
6. Repeating the same request returns the same `event_id` and does not duplicate the row.
7. Outbox and mapping tables are not readable/writable using anon/authenticated Data API grants.
8. No outbound request is made and response reports `delivery_enabled: false`.
9. Test with synthetic records in a non-production environment before any production activation.

## Known Gate C dependency

The connected GitHub identity currently lacks write permission in `n30AK/SISTEM-ADMINISTRASI-DESA`. SAD ingress cannot be implemented in that repository until its owner grants branch/PR write access. The source queue should remain staged and non-transmitting until Gate C and Gate D pass.
