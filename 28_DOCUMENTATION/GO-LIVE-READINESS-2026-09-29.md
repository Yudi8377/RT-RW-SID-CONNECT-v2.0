# GO-LIVE READINESS — RT/RW–SID CONNECT v2.0

Tanggal: 2026-09-29

## Keputusan
Production target tetap:
https://yudi8377.github.io/RT-RW-SID-CONNECT-v2.0/

Platform: GitHub Pages + Supabase.
Tidak menggunakan Vercel/Hatchable/VPS untuk production aplikasi ini.

## Sudah siap
- [x] GitHub Pages deployment workflow
- [x] Supabase production project terhubung
- [x] Publishable key only pada frontend
- [x] Administrator Control Center
- [x] Server-side admin access management
- [x] RT/RW role foundation
- [x] Government Form Compliance baseline
- [x] F-1.02 input → F-1.09 result mapping
- [x] Workflow Edge Functions
- [x] Canonical Citizen 360
- [x] Synthetic pilot dataset
- [x] Phase documentation
- [x] Cache-busting index untuk Phase 19

## Belum dijadikan blocker
Authenticated F-1.02 E2E masih ditunda atas keputusan operasional: pekerjaan non-E2E dilanjutkan dahulu sampai platform siap go-live.

Ini berarti kesiapan arsitektur dan deployment dapat dilanjutkan, tetapi status workflow transaksi produksi harus tetap dianggap **pilot verification pending** sampai E2E benar-benar dijalankan.

## Go-live gates yang tersisa
1. GitHub Pages workflow PASS untuk commit go-live.
2. Runtime smoke test halaman publik.
3. Verifikasi login/auth tanpa privilege bypass.
4. Verifikasi Admin Control Center dengan akun admin.
5. Verifikasi RT/RW Digital secara authenticated.
6. Verifikasi RLS dan Edge Function authorization.
7. Authenticated F-1.02 E2E.
8. Final production sign-off.

## Data
Dataset 250 warga dibuat sebagai data demo sintetis. Jangan diperlakukan sebagai data penduduk nyata dan jangan diekspor ke pihak luar.

## Security
- Service role tidak boleh berada di browser.
- ADMIN_PREVIEW hanya demo.
- Role assignment production harus server-side.
- Leaked Password Protection pada plan saat ini merupakan optional paid feature dan bukan deployment blocker yang digunakan dalam gate ini.
- Perubahan schema/RLS/privilege production tetap memerlukan gate terpisah.

## Status
READY FOR FINAL HARDENING / PILOT GO-LIVE PREPARATION.
NOT YET DECLARED FULL PRODUCTION-GO-LIVE.
