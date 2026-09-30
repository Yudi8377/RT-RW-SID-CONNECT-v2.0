# Phase 35 — Emergency Response Workflow

## Tujuan
Mengubah Emergency Location dari sekadar titik lokasi menjadi kasus respons terkontrol.

## Lifecycle
`OPEN → ACKNOWLEDGED → RESPONDING → RESOLVED`

Alternatif pembatalan:
`ACKNOWLEDGED → CANCELLED`

## Kontrol
- hanya petugas emergency berwenang;
- dibatasi scope territory;
- ACK wajib sebelum RESPONDING/RESOLVED/CANCELLED;
- resolusi dapat menyimpan catatan;
- setiap transisi menulis audit log;
- tidak ada continuous tracking;
- lokasi tetap memiliki expiry dan consent dari warga.

## Data
Tabel `public.emergency_response_cases` menghubungkan satu `location_event_id` ke satu kasus respons.

## UI
GIS → Emergency Location kini menampilkan status kasus dan kontrol:
- ACK
- RESPOND
- Resolve
- Cancel
- Google Maps

## Boundary
Tidak mengubah core RT/RW yang LOCKED/PENDING dan tidak mengubah workflow F-1.02 → F-1.09.
