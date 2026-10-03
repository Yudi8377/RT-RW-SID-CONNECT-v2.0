# Smart Village Mobile v3 — Deployment Contract

## Scope

This release changes the mobile entry experience into the Smart Village shell:

- public Smart Village landing page
- Sign In / Sign Up
- five operational registration choices: WARGA, KETUA_RT, PENGURUS_RT, KETUA_RW, PENGURUS_RW
- role requests remain pending until verified
- master territory/address/household/person foundation
- RT/RW GIS map foundation
- explicit-consent emergency location
- role-specific room shell
- picture-card news and scrollable details
- agenda details

## Data model

Migration 20261003120000_smart_village_master_gis_emergency_v1.sql is additive and introduces:

- sv_master_territories
- sv_master_addresses
- sv_master_households
- sv_master_persons
- sv_role_registry
- sv_role_requests
- sv_emergency_events

sv_master_households is deliberately not readable by the mobile client. Sensitive household membership must be served through scoped server-side workflows.

## Role security

Selecting a role during registration does not grant privilege.

- WARGA is auto-approved and receives the existing WARGA assignment.
- KETUA_RT / PENGURUS_RT / KETUA_RW / PENGURUS_RW become pending role requests.
- Actual privileges remain controlled by verified role assignments and territory scope.

## GIS

The Android build uses react-native-maps with PROVIDER_GOOGLE. Expo SDK 54 documents react-native-maps 1.20.1 as the recommended version.

A production binary needs a Google Maps Android API key restricted to package id.rtrwsid.connect and the release signing SHA-1.

Required build environment:

- GOOGLE_MAPS_API_KEY
- EXPO_PUBLIC_SUPABASE_URL (optional because the project has a safe default)
- EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (optional because the project has a safe default)

Do not commit the Google Maps key.

## Emergency privacy contract

The mobile app requests foreground location only when the user explicitly asks for Lokasi saya or Kirim lokasi darurat.

Emergency events contain requester identity, coordinates, consent timestamp, 30-minute expiry and lifecycle status.

The app does not implement silent background tracking.

## Release gate

Before store deployment:

1. Apply Supabase migrations.
2. Configure a restricted Google Maps Android API key.
3. Configure GOOGLE_MAPS_API_KEY in the build environment.
4. Run TypeScript validation and Expo Android export/build.
5. Install the release APK on a real Android device.
6. Validate public landing, five registration choices, WARGA activation, RT/RW pending verification, role-specific room, Google Map, RT/RW polygons, location permission, emergency event creation/expiry, Kabar Desa picture cards, Baca selengkapnya and Agenda detail scroll.
7. Promote only the verified binary to Play Console testing.

The existing Windows Installer v2.0.1 is outside this change and must remain untouched.
