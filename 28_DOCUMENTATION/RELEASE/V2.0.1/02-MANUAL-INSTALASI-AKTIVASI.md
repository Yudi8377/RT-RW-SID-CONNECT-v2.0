# MANUAL INSTALASI & AKTIVASI

Installer baseline:
`RT-RW-SID-CONNECT-v2.0-Setup-2.0.1.exe`

SHA-256:
`dd1b54e64f7d5c12c720af37b203f5e59a9a47de23848b3e7c261443f88d51f0`

## Prinsip aktivasi
Community, Pro, dan Enterprise sebaiknya memakai **License & Entitlement System**. Installer tidak boleh menjadi sumber kebenaran hak paket.

Online:
Client → Auth → Backend → License/Entitlement → Feature access

Offline:
Client → Signed License Token → Verifier lokal → Cached entitlement

Private signing key dan service-role key tidak boleh berada di aplikasi client.

## Upgrade
Kode upgrade boleh digunakan sebagai voucher/activation code, tetapi kode harus diverifikasi di backend dan ditukar menjadi entitlement resmi yang tercatat. Kode bukan sumber kebenaran permanen.
