# Phase 18 — Administrator Access Management

## Tujuan
Menyediakan pengelolaan assignment akses produksi melalui server-side Edge Function, tanpa privilege escalation dari browser.

## Kontrak akses
User → Role → Scope Territory → Action → RLS.

Role yang tersedia:
- RT_OPERATOR
- RW_REVIEWER
- VILLAGE_VALIDATOR
- PLATFORM_ADMIN
- PILOT_VIEWER

## Implementasi
### Edge Function
`admin-access-management`
- ACTIVE, JWT required.
- Hanya caller dengan active `PLATFORM_ADMIN` yang dapat mengakses.
- `list`: membaca role assignments.
- `assign`: membuat assignment.
- `deactivate`: menonaktifkan assignment dan mengisi `ends_at`.
- Self-escalation dan self-deactivation ditolak.
- Role non-admin wajib memiliki territory scope.
- `PLATFORM_ADMIN` harus global dan tidak menerima territory scope.
- Perubahan akses dicatat ke `audit_logs`.

### UI
Admin → Access Management:
- menampilkan assignment saat administrator terautentikasi.
- Admin Preview tidak membuat atau mengubah privilege produksi.
- Tidak ada direct Auth user administration dari browser.
- Tidak ada JavaScript privilege bypass.

## Kondisi bootstrap
Saat Phase 18 dibuat, database memiliki user Auth tetapi belum memiliki active `role_assignments`. Karena itu fungsi access management sengaja tidak melakukan auto-promotion terhadap user pertama. Pembuatan `PLATFORM_ADMIN` awal adalah administrative gate yang harus dilakukan secara eksplisit.

## Acceptance
- [x] Edge Function aktif dan JWT protected.
- [x] Server-side authorization memakai role assignment database.
- [x] Self-escalation blocked.
- [x] Self-deactivation blocked.
- [x] Audit event untuk assignment/deactivation.
- [x] UI Access Management ditambahkan.
- [x] Admin Preview tetap demo-only.
- [ ] Seed first real PLATFORM_ADMIN — menunggu tindakan administratif eksplisit.
- [ ] Authenticated E2E assignment — setelah first PLATFORM_ADMIN tersedia.
- [ ] Aktivasi RT/RW Digital untuk user nyata — setelah assignment dan scope tersedia.

## Security note
Service-role key hanya digunakan di Edge Function dan tidak dikirim ke browser. Frontend memakai Supabase client/session biasa.
