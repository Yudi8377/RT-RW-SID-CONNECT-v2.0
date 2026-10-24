# Gerbang Keamanan Produksi — 24 Oktober 2026

Status dokumen: audit operasional; bukan sertifikat kepatuhan atau pernyataan siap produksi.

## Sudah diverifikasi

- Paket aktif `TRIAL_7_DAY` memiliki nama `Trial 7 Hari` dan `duration_days = 7`.
- Fungsi `public.start_organization_trial(uuid,uuid,text)` hanya dapat dieksekusi oleh `service_role` pada pemeriksaan ACL terakhir.
- Fungsi `public.start_organization_trial_with_device(uuid,uuid,text,text,text)` juga dibatasi ke `service_role`; Edge Function `start-trial` menggunakan RPC ini.
- Migrasi trial produksi tercatat pada versi `20261024125347`. Berkas migrasi harus menggunakan versi yang sama agar riwayat repository dan database tidak drift.
- Workflow GitHub Pages dan workflow kualitas regional, workspace, trial, dan Android pada commit sebelumnya dilaporkan lulus; hal tersebut tidak menggantikan pengujian transaksi autentikasi end-to-end.

## Gerbang yang masih terbuka

1. **PostGIS `public.spatial_ref_sys`:** tabel dimiliki `supabase_admin`; ACL menunjukkan hak tulis langsung untuk `anon` dan `authenticated`. Migrasi pencabutan hak sebelumnya gagal karena sesi migrasi berjalan sebagai `postgres`, bukan pemilik tabel dan bukan anggota `supabase_admin`. Jangan mengklaim ini telah diperbaiki. Perlu penanganan yang didukung pemilik/penyedia untuk tabel ekstensi; jangan mengubah pemilik atau memindahkan ekstensi secara spekulatif.
2. **RLS tanpa kebijakan (informational, server-only):** lima tabel—`public.household_person_memberships`, `public.organization_devices`, `public.subscription_audit_events`, `public.subscription_billing_events`, dan `village.integration_tenant_mappings`—sudah diverifikasi memiliki RLS aktif dan ACL tabel hanya untuk `postgres`/`service_role`, tanpa GRANT langsung kepada `anon` atau `authenticated`. Tidak perlu menambahkan kebijakan pengguna generik; pertahankan akses lewat backend tepercaya dan uji Edge Function yang memerlukannya.
3. **Fungsi SECURITY DEFINER:** periksa isi dan izin untuk fungsi administrasi/territory dan `st_estimatedextent`; fungsi yang memang untuk backend harus dibatasi, sedangkan fungsi pengguna harus memvalidasi identitas dan cakupan wilayah di dalam badan fungsi.
4. **Auth:** aktifkan perlindungan kata sandi bocor melalui pengaturan Auth setelah evaluasi dampak pengguna.
5. **E2E trial:** jalankan dengan organisasi, pengguna, dan perangkat sintetis. Buktikan pembuatan trial tepat satu kali, batas satu perangkat, penolakan akses lintas organisasi, masa 7 hari, dan penulisan audit. Jangan memakai data warga nyata untuk tes.
6. **Isolasi wilayah:** uji akun RT, RW, Desa/Kelurahan, Kecamatan, Kabupaten/Kota, dan Admin Utama terhadap data sintetis lintas wilayah.

## Gerbang rilis

Jangan aktifkan `commercialTrialEnabled` atau `aiCompanionEnabled` untuk semua pengguna dan jangan memasukkan data warga nyata sampai blocker kritis ditutup, hasil tes E2E dicatat, dan Security Advisor ditinjau ulang. Status Edge Function ACTIVE hanya membuktikan fungsi terpasang, bukan keberhasilan seluruh alur.

## Referensi teknis

- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase database linter: https://supabase.com/docs/guides/database/database-linter
- Supabase password security: https://supabase.com/docs/guides/auth/password-security
