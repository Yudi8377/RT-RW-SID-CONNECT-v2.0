# RT/RW-SID CONNECT Mobile — Implementation Contract

## Scope
Official Expo/React Native client for Android and iOS. The mobile client shares the existing RT/RW-SID CONNECT Supabase backend; it does not create a second database.

## Roles
- Warga: personal services, submissions, status tracking, public information.
- RT: scoped verification and RT services.
- RW: scoped verification and RW coordination.
- Kelurahan/Desa: validation, administration and wider wilayah services.

The backend remains authoritative for role, permission and wilayah scope. The mobile UI must never grant a role locally.

## Offline-first behavior
- Public content remains usable without sign-in.
- Authenticated service submissions may be queued locally when the backend cannot be reached.
- Queue records contain only the minimum request metadata required to replay the operation.
- Replay occurs after a later successful authenticated session.
- No citizen database is duplicated into the mobile app.

## Data boundary
- Supabase publishable key only.
- No service-role key, payment credential or private signing key in the app.
- RLS/Edge Functions remain the authorization boundary.
- Private records are never rendered as public content.

## Navigation
Beranda · Layanan · Kabar · Agenda · Warga

## Delivery target
Phase M1: public experience + authentication + service request queue + CI validation for Android/iOS.
Phase M2: real role-aware RT/RW/Kelurahan workspace.
Phase M3: push notifications, document workflow, camera/upload and richer offline synchronization.
