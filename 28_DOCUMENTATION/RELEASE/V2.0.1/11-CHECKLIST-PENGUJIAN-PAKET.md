# CHECKLIST PENGUJIAN COMMUNITY / PRO / ENTERPRISE

| Skenario | Community | Pro | Enterprise |
|---|---|---|---|
| Login | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Fitur dasar | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Fitur Pro | DENY/ALLOW | ALLOW | ALLOW |
| Fitur Enterprise | DENY | DENY/ALLOW | ALLOW |
| Role enforcement | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Scope wilayah | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Restart | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Expiry | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Upgrade | N/A | PASS/FAIL | PASS/FAIL |
| Downgrade | N/A | PASS/FAIL | PASS/FAIL |
| Offline entitlement | PASS/FAIL | PASS/FAIL | PASS/FAIL |

## Security negative tests
1. Ubah local flag plan → akses Pro tetap harus DENY untuk Community.
2. Panggil endpoint Pro langsung → backend harus menolak Community.
3. Manipulasi token entitlement → signature/validation harus gagal.
4. License expired/revoked → akses harus mengikuti kebijakan expiry/revocation.
5. Restart/reinstall → entitlement sah harus dipulihkan sesuai desain.

## Acceptance gate
Sebuah paket dinyatakan berjalan sebagaimana mestinya hanya setelah fungsi, authorization, upgrade/downgrade, expiry, dan negative security tests lulus.
