# Security / QA / Release Certificate Template

## Produk
RT/RW-SID CONNECT v2.0.1 — Windows Offline Installer

## Release rule
Produk tidak boleh dinyatakan release-ready hanya karena build berhasil.

Wajib:
- build PASS;
- dependency/security audit PASS;
- package integrity PASS;
- installer install PASS;
- launch PASS;
- offline operation PASS;
- local DB PASS;
- queue/restart/persistence PASS;
- reconnect/sync PASS;
- migration/recovery PASS;
- uninstall/reinstall PASS;
- clean first run PASS;
- checksum tersedia;
- manual Windows acceptance A1-A16 PASS;
- legal/compliance checklist reviewed;
- release artifact archived.

## Bukti
Catat:
- commit SHA;
- workflow run;
- installer SHA-256;
- OS version;
- tester;
- tanggal;
- test evidence;
- known limitations.

## Current v2.0.1 gate
**RELEASE BLOCKED sampai seluruh A1-A16 memperoleh PASS dari pengujian Windows yang nyata.**

Automated/unit tests tidak boleh menggantikan bukti manual untuk acceptance gate yang membutuhkan interaksi pengguna.

## Sign-off
- Engineering:
- QA:
- Product:
- Legal/compliance review:
- Release owner:
- Date:
