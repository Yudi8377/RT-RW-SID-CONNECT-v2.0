# RT/RW-SID CONNECT — Installer Edition Flow v1.0

Status: DESIGN / NO PRODUCTION ENFORCEMENT YET
Target: Windows Offline Installer v2.0.1+ planning

## Proposed flow

1. Welcome
2. Language
3. License / terms
4. Choose usage model
5. Configure installation
6. Install
7. First-run edition status

## Choose usage model

### Community — Gratis
Untuk RT/RW, komunitas, relawan, desa kecil, dan penggunaan non-komersial.

### Trial Pro — 30 hari
Coba kemampuan Pro untuk periode terbatas. Data tidak dihapus saat trial berakhir.

### Professional
Aktifkan lisensi Pro yang sudah dimiliki atau lanjutkan proses pembelian/permintaan lisensi melalui kanal resmi.

### Community Support
Gunakan Community tanpa kewajiban membeli. Pengguna dapat memberikan kontribusi sukarela untuk keberlanjutan proyek.

### License Key
Untuk pengguna yang sudah memiliki license record.

## Critical UX rule

Community must be presented as a legitimate first-class option, not as an intentionally crippled or embarrassing fallback.

## Trial expiry

After trial expiry:
- application remains launchable where Community runtime is supported
- local data remains intact
- Community capabilities remain available
- Pro capabilities require an active entitlement
- the user sees neutral information about licensing and support

## Offline considerations

Community should not require online activation for basic operation.

A Trial may use one-time activation when internet is available. The application can then operate offline for the valid trial period. A completely offline trial has weaker anti-abuse guarantees and should not be represented as tamper-proof.

## Pricing UI rule

v2.0.1 should not hard-code final commercial prices before pricing approval. The installer may show model descriptions without binding the technical release to a price list.

## First-run status

Suggested status card:

Edition: Community
License: Permanent
Connectivity: Offline capable
Support: Community

or

Edition: Pro Trial
Trial remaining: N days
License: Trial
Connectivity: Offline capable

## Future implementation boundary

This document defines product UX and policy only. It does not authorize adding paid feature gates to the current release branch. Engineering changes require a separate implementation plan and verification gate.
