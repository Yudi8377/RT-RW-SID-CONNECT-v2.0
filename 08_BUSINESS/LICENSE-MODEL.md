# RT/RW-SID CONNECT — License Model v1.0

Status: DESIGN

## Goals

The license layer must preserve Community access, support offline operation, protect paid entitlements, avoid destructive expiry behavior, provide auditable license state, and keep entitlement decisions out of easily edited UI flags.

## Suggested license record

Conceptual fields: edition, organization_id, installation_id, issued_at, expires_at, features, license_id, signature, issuer. Exact serialization and cryptographic implementation will be specified separately during engineering.

## Community

Permanent, usable offline, and not dependent on online activation for basic operation.

## Trial

Grants Pro entitlements for a defined period. It may require one-time activation when internet is available and continues to support offline operation during the valid period. It must not delete or lock user data after expiry.

## Paid licenses

Paid licenses should use signed entitlement records rather than a client-editable premium flag.

Possible states: PRO_ACTIVE, INSTITUTION_ACTIVE, PARTNER_MANAGED, EXPIRED, REVOKED.

Revocation and suspension rules require explicit policy before implementation.

## Offline limitation

A fully offline trial has weaker anti-abuse guarantees than an online activation model. The system should document this trade-off rather than pretending local clock/device controls are perfect.
