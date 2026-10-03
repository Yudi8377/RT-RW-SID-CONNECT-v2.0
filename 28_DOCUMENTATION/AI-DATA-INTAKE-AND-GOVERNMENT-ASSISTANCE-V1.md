# RT/RW-SID CONNECT — AI Data Intake & Government Assistance Intelligence v1

## Tujuan
Menjadikan dokumen/fail lama sebagai pintu masuk data terstruktur tanpa membuat database kedua.

## Input
- Excel / CSV
- PDF
- JPG / PNG / scan
- dokumen administrasi
- input manual/API

## Pipeline
1. Upload/capture
2. OCR/table extraction
3. AI field mapping
4. Normalisasi
5. Matching berdasarkan NIK/No. KK dan atribut pendukung
6. Duplicate/conflict detection
7. Human review gate
8. Commit ke core data

AI tidak boleh menjadi sumber kebenaran tunggal dan tidak boleh mengubah record sensitif tanpa kontrol workflow.

## Government Assistance Intelligence
- Registry program pemerintah
- Versi dan periode berlaku
- Dasar hukum/sumber resmi
- Eligibility rules
- Exclusion rules
- Document requirements
- RT → RW → Desa/Kelurahan verification
- Eligibility reasons dan rule snapshot
- Audit-ready distribution workflow

Sistem tidak memberikan keputusan hukum otomatis. AI menjadi decision-support; keputusan administratif tetap mengikuti kewenangan dan regulasi yang berlaku.

## Print & Queue
- kartu antrian
- kupon bantuan
- kartu penerima
- daftar distribusi
- tanda terima
- QR/public code yang terhubung ke record internal

## Data protection
- tabel baru RLS-enabled
- dokumen KK/KTP ditandai HIGHLY_SENSITIVE secara default
- service-role/private credentials tidak boleh berada di client
- matching sensitif harus melalui backend/authorized workflow
- source document menyimpan hash/path dan hasil ekstraksi, bukan menjadikan AI sebagai sumber kebenaran

## Release boundary
Migration foundation sudah diterapkan pada Supabase project RT/RW-SID CONNECT. UI mobile untuk upload/capture dan AI extraction provider masih merupakan tahap implementasi berikutnya; jangan mengklaim OCR/LLM production-ready hanya karena tabel pipeline sudah tersedia.
