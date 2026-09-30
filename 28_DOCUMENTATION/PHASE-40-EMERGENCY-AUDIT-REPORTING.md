# PHASE 40 — EMERGENCY AUDIT & REPORTING

## Status
IMPLEMENTED — pending PR/CI/runtime verification.

## Tujuan
Phase 40 menambahkan lapisan audit dan pelaporan operasional untuk Emergency Response tanpa membuka identitas warga atau actor ID pada UI.

## Cakupan
- Ringkasan kasus: OPEN, ACKNOWLEDGED, RESPONDING, RESOLVED, CANCELLED.
- Monitoring SLA dan jumlah eskalasi.
- Rata-rata waktu ACK dan penyelesaian.
- Audit status notification: PENDING, DELIVERED, READ, DISMISSED.
- Timeline event operasional terbaru.
- Scope report mengikuti role emergency dan territory assignment.
- Tidak ada endpoint publik baru.
- Tidak mengubah workflow inti RT/RW dan tidak membuka tabel audit/event dengan policy generik.

## Definisi metrik
- Rata-rata ACK: acknowledged_at - created_at untuk kasus yang telah di-ACK.
- Rata-rata penyelesaian: resolved_at - created_at untuk kasus yang telah selesai.
- SLA breached: SLA due terlewati sebelum ACK untuk kasus yang masih aktif; metrik dapat diperketat pada fase observability berikutnya untuk menghitung breach pasca-ACK secara eksplisit.
- Escalated: escalation_level > 0.

## Privasi
Report hanya dapat dipanggil oleh RT_OPERATOR, RW_REVIEWER, VILLAGE_VALIDATOR, atau PLATFORM_ADMIN. Data user_id/actor_user_id tidak dikembalikan ke UI report.

## Perubahan
- supabase/functions/citizen-location/index.ts — action report.
- website/app.js — Emergency Audit & Reporting workspace.
- Dokumentasi Phase 40.

## Gate
Phase 40 tidak dianggap selesai sampai:
1. Edge Function ACTIVE dengan JWT required.
2. GitHub PR merged.
3. GitHub Pages workflow sukses.
4. Runtime report diuji dengan akun berwenang dan scope yang sesuai.