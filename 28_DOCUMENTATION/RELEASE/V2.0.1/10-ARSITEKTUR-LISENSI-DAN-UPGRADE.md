# ARSITEKTUR LISENSI & UPGRADE

## Apakah perlu kode khusus untuk upgrade Pro?
**Boleh, tetapi jangan menjadikan kode itu sebagai sumber otorisasi.**

Model yang direkomendasikan:

Customer membeli Pro
→ menerima Activation Code
→ code dikirim ke backend
→ backend memvalidasi code
→ code diikat ke Organization/License
→ entitlement PRO = ACTIVE
→ aplikasi membaca entitlement
→ menu/fungsi Pro aktif

## Sumber kebenaran
License/Entitlement record di server adalah sumber kebenaran. Activation Code hanya alat untuk melakukan redemption.

Contoh record:
- license_id
- organization_id
- plan
- status
- entitlements[]
- issued_at
- expires_at
- seat_limit
- audit metadata

## Offline Windows
Untuk instalasi offline, gunakan signed license/token yang dapat diverifikasi tanpa internet. Public key dapat disertakan pada client; private signing key hanya berada pada issuer/licensing service.

Jangan gunakan:
- `PRO=true` di file lokal;
- kode Pro yang mudah ditebak;
- secret key di APK/EXE;
- service-role key di client;
- unlock menu tanpa validasi backend.

## Authorization
`can(user, action) = role_allows AND entitlement_allows AND scope_allows`

Dengan demikian seseorang tidak mendapatkan hak hanya karena berhasil menampilkan menu Pro.
