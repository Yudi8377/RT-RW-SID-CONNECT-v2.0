# Phase 38 — Emergency Notification Inbox & Operator UX

## Scope
Additive emergency-response operator layer. The locked RT/RW transaction core is untouched.

## Runtime
- `citizen-location` ACTIVE version 6, JWT required.
- Emergency `share` now creates the response case, OPEN timeline event, and RT notification in one flow.
- `command` returns cases, scoped timeline events, and in-app notifications for authorized emergency roles.
- Role-scoped actions: RT ACK, RW RESPOND, Desa RESOLVE; authorized roles may CANCEL only in OPEN/ACKNOWLEDGED.
- Transition validation prevents skipping lifecycle stages.
- ACK creates RW notification; RESPOND creates Desa notification.
- Notification data is limited to the user's emergency role/scope.

## Operator UX
- Emergency Command Center now includes a Notification Inbox.
- Active cases expose SLA countdown and escalation level.
- Operator actions are visible only for the applicable role.
- Refresh reloads current cases and notifications.
- Resolve accepts an optional resolution note.

## Security
- Edge Function remains JWT required.
- Exact location remains restricted to authorized emergency roles.
- No public emergency notification feed.
- The locked F-1.02 → RT → RW → Desa core is not modified.

## Verification
- Edge Function deployment: ACTIVE v6, JWT required.
- Supabase runtime deployment completed from the Phase 38 branch.
- Smoke verification of the SLA processor previously returned `processed=0` when no case was overdue.
