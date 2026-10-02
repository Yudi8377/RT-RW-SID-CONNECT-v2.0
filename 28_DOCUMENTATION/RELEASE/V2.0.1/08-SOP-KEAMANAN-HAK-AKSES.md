# SOP KEAMANAN & HAK AKSES

Role dan plan bukan hal yang sama.

Role:
- Warga
- RT
- RW
- Kelurahan/Desa
- Administrator

Plan:
- Community
- Pro
- Enterprise

UI boleh menyembunyikan menu, tetapi **backend/RLS/Edge Functions wajib tetap menolak akses yang tidak berhak**.

Jangan menaruh service-role key, private signing key, atau master secret di APK/EXE.
