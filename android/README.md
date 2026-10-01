# Smart Village Android

Official Android client for RT/RW-SID CONNECT v2.0 / Smart Village — Desa Cerdas Engine.

The Android app is a client of the existing Supabase project, not a second database. It uses the publishable key only and keeps authorization in the existing backend/RLS/Edge Functions.

Initial modules: Beranda, Layanan, Kabar Desa, Agenda Warga, Ruang Warga, authentication.

Local: copy .env.example to .env, set the publishable key, then npm install and npx expo start.

Release signing credentials must stay outside the repository.