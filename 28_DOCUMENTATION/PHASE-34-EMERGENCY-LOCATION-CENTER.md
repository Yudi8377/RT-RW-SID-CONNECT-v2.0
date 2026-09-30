# Phase 34 — Emergency Location Center

## Tujuan
Menyediakan workspace GIS terproteksi bagi petugas berwenang untuk melihat lokasi darurat warga yang sedang aktif.

## Perilaku
- Warga tetap harus secara eksplisit membagikan lokasi.
- Center mengambil snapshot lokasi aktif melalui Edge Function `citizen-location`.
- Tombol Refresh digunakan untuk mengambil kondisi terbaru.
- Google Maps menampilkan konteks lokasi aktif pertama dan setiap kasus memiliki tautan Google Maps.
- Setiap kasus memiliki kode tampilan `EMG-xxxxxxxx`, waktu berbagi, akurasi, alasan, dan waktu kedaluwarsa.
- Lokasi tidak masuk dashboard publik.

## Akses
Workspace berada di modul GIS dan mengikuti model role/scope yang sudah ada. VILLAGE_VALIDATOR dapat mengakses GIS; PLATFORM_ADMIN memiliki akses penuh.

## Batas
Tidak ada continuous tracking. Tidak ada perubahan pada workflow F-1.02/F-1.09 atau core RT/RW yang sedang locked/pending.

## Catatan
Edge Function saat ini memiliki action `active` yang hanya dapat dipanggil oleh role operasional yang berwenang dan membatasi hasil berdasarkan scope territory.