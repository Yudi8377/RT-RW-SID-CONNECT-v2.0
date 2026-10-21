# RT/RW License & System Control Center — Specification

## Scope
Control Center mengelola unit RT/RW, bukan Desa sebagai pelanggan utama.

## Per RT/RW
- Organization ID
- RT/RW identity
- wilayah administratif
- License ID
- Installation IDs
- Edition
- entitlement
- activation history
- payment/support status
- last seen
- version
- audit log

## Status
ACTIVE
PAYMENT_DUE
GRACE
EXPIRED
SUSPENDED
REVOKED
OFFLINE

## Security
Control Center tidak boleh menjadi jalur untuk membaca isi database warga secara bebas. Operator lisensi hanya mendapatkan metadata minimum.

## Activation
1. registrasi;
2. verifikasi organisasi;
3. penerbitan license;
4. signed entitlement;
5. import/online activation;
6. local verification;
7. audit record.

## Offline
Signed license token harus dapat diverifikasi tanpa internet. Private signing key hanya berada di issuer.

## Pembayaran
Payment provider/webhook harus berada di server-side. Jangan memasukkan secret/payment credentials ke installer.

## Future implementation gate
Implementasi database/payment/entitlement production membutuhkan review schema, RLS, API authorization dan test negative cases sebelum diaktifkan.
