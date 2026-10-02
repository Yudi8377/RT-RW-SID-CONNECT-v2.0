# Smart Village Mobile

Official cross-platform mobile client for RT/RW-SID CONNECT v2.0 / Smart Village — Desa Cerdas Engine.

## Platforms
- Android
- iOS

The app is one client experience over the existing Supabase project; it does not create a second database.

## UX baseline
- Public information is browseable without a trial wall.
- Sign-in is only required for private/personal actions.
- Role and wilayah permissions remain enforced by Supabase/RLS/Edge Functions.
- Visual contract: `DESIGN.md`.

## Run locally
1. Copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Run `npm install`.
4. Run `npx expo start`.
5. Use Expo Go or a development build on Android/iOS.

Release signing credentials must remain outside the repository.
