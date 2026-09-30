# Phase 36 — Emergency Command & Notification

## Scope
Additive emergency-response layer. The locked RT/RW transaction core is not modified.

## Runtime
- `citizen-location` ACTIVE version 5, JWT required.
- `share` creates an emergency response case in OPEN state.
- SLA target: HIGH 20 minutes; CRITICAL 10 minutes.
- Every transition is appended to `emergency_response_events`.
- In-app notifications are queued in `emergency_notifications`.
- `command` returns scoped cases, timelines, and notifications to authorized emergency roles.
- Exact location remains restricted to authorized emergency roles.

## Lifecycle
OPEN -> ACKNOWLEDGED -> RESPONDING -> RESOLVED
OPEN/ACKNOWLEDGED may be CANCELLED.

## Escalation
ACK -> RW_REVIEWER notification.
RESPONDING -> VILLAGE_VALIDATOR notification.
Automatic scheduler is intentionally not enabled yet; SLA is exposed as data so automation can be enabled after runtime acceptance.

## Verification
- Supabase Edge Function deployment: ACTIVE v5, JWT required.
- GitHub implementation branch: feature/emergency-command-20260930.
- Public RT/RW core remains locked.
