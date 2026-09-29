# Phase 19 — Canonical Citizen 360 & Cross-Module Data Reuse

Tanggal: 2026-09-29

## Tujuan
Membuktikan bahwa satu entitas warga pada `public.persons` dapat menjadi canonical identity yang direferensikan oleh modul lain, bukan mengulang nama sebagai identitas utama.

## Implementasi
- Warga Portal → Profil Warga memiliki workspace **Citizen 360**.
- Registry mengambil canonical records dari `public.persons`.
- Relasi profile menggunakan `person_id`:
  - `rt_employment_profiles`
  - `rt_education_profiles`
  - `rt_health_observations`
  - `rt_volunteer_profiles`
- Permohonan layanan ditelusuri melalui `rt_service_requests.payload.person_id`.
- Detail warga menampilkan hubungan lintas modul dalam satu tampilan.
- Search nama/email dilakukan pada dataset yang sudah dimuat.
- RLS tetap menjadi boundary; UI tidak memberikan privilege tambahan.

## Dataset Pilot
Database pilot saat verifikasi berisi data sintetis lintas modul. Seed demo sebelumnya membuat 250 person records dan berbagai profile/service records terkait. Data tersebut diberi penanda demo/sintetis dan bukan data penduduk nyata.

## Security
- Tidak menyimpan NIK nyata dalam seed demo.
- Health observations tetap classified sebagai data sensitif dan hanya ditampilkan sesuai RLS.
- Citizen 360 tidak mengubah role, scope, atau policy.
- Tidak ada browser-side privilege bypass.

## Acceptance
- [x] Branch Phase 19 dibuat dari main.
- [x] Citizen 360 workspace ditambahkan.
- [x] Canonical person registry digunakan.
- [x] Cross-module profile relations ditampilkan.
- [x] Service request reference ditampilkan.
- [ ] GitHub Pages runtime verification.
- [ ] Authenticated E2E dengan akun RT_OPERATOR.
- [ ] Final merge setelah workflow Pages PASS.

## Next Gate
Setelah runtime UI diverifikasi, lanjut ke authenticated F-1.02 E2E:
SUBMITTED → RT_VERIFIED → RW_REVIEW → VILLAGE_VALIDATED → AUTHORIZED_PROCESSING → F-1.09 mapping.
