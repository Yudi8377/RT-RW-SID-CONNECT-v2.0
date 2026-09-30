# GIS Emergency Location — Phase 33

## Tujuan
Menambahkan mekanisme **Emergency Location Share** pada GIS publik. Warga dapat membagikan posisi perangkatnya secara sadar untuk kebutuhan keadaan darurat.

## Prinsip privasi
- Lokasi **tidak dibaca otomatis** saat halaman dibuka.
- Browser meminta izin lokasi hanya setelah warga menekan **Bagikan lokasi darurat**.
- Data memiliki masa berlaku terbatas: 5–60 menit, default 30 menit.
- Saat berbagi baru dilakukan, lokasi aktif sebelumnya milik user dinonaktifkan.
- Koordinat tidak dipublikasikan sebagai dashboard umum.
- Operasi berbagi dicatat pada audit log.
- Geolocation membutuhkan HTTPS dan persetujuan pengguna.
- Tahap ini tidak mengaktifkan continuous tracking/background tracking.

## Google Maps
GIS tetap menampilkan Google Maps sebagai peta konteks. Jika warga memberikan lokasi, peta berpindah ke koordinat yang dibagikan dan menyediakan tautan untuk membuka Google Maps.

Google Maps Embed/Maps Platform memiliki persyaratan penggunaan dan kebijakan atribusi; integrasi produksi harus mempertahankan kebijakan privasi/terms yang relevan.

## Backend
Edge Function: `citizen-location`

Actions:
- `share` — menyimpan lokasi darurat sementara.
- `mine` — melihat lokasi aktif milik sendiri.
- `active` — jalur terproteksi untuk petugas berwenang pada territory yang sesuai.

Table:
`public.citizen_location_events`

Role yang dapat mengakses daftar lokasi aktif:
- RT_OPERATOR
- RW_REVIEWER
- VILLAGE_VALIDATOR
- PLATFORM_ADMIN

## Batas fase
UI operator untuk melihat lokasi aktif **belum dipasang ke RT/RW Digital yang sedang dikunci/pending**. Backend sudah menyiapkan jalur terproteksi agar fase berikutnya dapat menambahkan Emergency Location Center tanpa membuka kembali perubahan pada core yang dikunci.

## Alur
Warga → GIS → Bagikan lokasi darurat → izin browser → koordinat + akurasi → penyimpanan sementara → petugas berwenang dapat mengambil lokasi aktif → otomatis kedaluwarsa.

