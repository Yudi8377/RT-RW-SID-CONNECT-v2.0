# RT/RW–SID CONNECT v2.0 — Community Economy & GPFFE Intelligence

## Tujuan

Menjadikan kegiatan sosial RT/RW bukan sekadar kalender, tetapi sumber data operasional yang terverifikasi untuk:
- pelayanan warga;
- hubungan kegiatan dengan peristiwa kependudukan;
- pembukuan arisan;
- kas RT/RW;
- analisis arus ekonomi komunitas;
- observasi sosial-ekonomi rumah tangga;
- evidence lapangan;
- analisis AI yang terukur;
- pertukaran data agregat ke GPFFE.

## Modul Kegiatan & Musyawarah

Submenu:
1. Kalender Komunitas
2. Musyawarah
3. Presensi
4. Notulen & Berita Acara
5. Arisan
6. Rutinan RT/RW
7. Pengajian
8. Tahlilan & Takziah
9. Kegiatan Sosial
10. Kegiatan Lainnya
11. Kas RT/RW
12. Reminder WhatsApp

### Relasi Tahlilan

`community_events.event_type = TAHLILAN` dapat mengacu ke:
- `death_records`
- `persons`
- `households`
- `event_participants`

Relasi tidak menjadikan kegiatan sebagai sumber kebenaran kematian. Data kematian tetap mempunyai workflow verifikasi sendiri.

## Arisan

`arisan_groups` → `arisan_members` → `arisan_transactions`

Jenis transaksi:
- CONTRIBUTION
- PAYOUT
- FEE
- ADJUSTMENT

KPI yang disiapkan:
- jumlah anggota;
- total iuran;
- total pencairan;
- saldo bersih;
- histori per periode;
- kepatuhan pembayaran.

## Kas RT/RW

`rt_rw_cash_accounts` → `rt_rw_cash_transactions`

Transaksi memiliki:
- akun;
- tanggal;
- arah IN/OUT;
- kategori;
- nominal;
- pihak terkait;
- event;
- bukti;
- approval;
- referensi.

View `v_rt_rw_cashflow_monthly` disiapkan untuk analisis:
- cash-in;
- cash-out;
- net cashflow;
- tren bulanan.

Data transaksi individual tidak otomatis dikirim ke GPFFE.

## Social-Economic Intelligence

Relasi:

`persons`
→ `households`
→ `social_economic_observations`
→ `social_economic_assessments`
→ `economic_analysis_snapshots`
→ `gpffe_economic_exchange`
→ `GPFFE`

Dimensi observasi:
- pendapatan;
- pekerjaan;
- pendidikan;
- perumahan;
- listrik;
- aset;
- kesehatan;
- ketahanan pangan;
- dependency;
- perlindungan sosial;
- bisnis;
- pengeluaran.

### Evidence

`social_economic_evidence` mendukung:
- foto;
- dokumen;
- video;
- catatan lapangan.

Setiap evidence mempunyai consent, klasifikasi, status verifikasi, metadata dan storage path.

## Prinsip AI

AI tidak boleh menetapkan secara mandiri bahwa sebuah keluarga "miskin" sebagai status resmi.

AI hanya:
1. menggabungkan data yang sudah diizinkan;
2. menemukan pola;
3. menghitung indikator internal;
4. memberi penjelasan;
5. memberi rekomendasi tindak lanjut;
6. menunjukkan confidence dan evidence;
7. meminta human validation untuk status yang berdampak pada layanan pemerintah.

Field `official_decile` hanya boleh diisi dari sumber resmi/otoritatif atau proses sinkronisasi resmi. `vulnerability_band` adalah klasifikasi internal untuk analisis operasional, bukan pengganti klasifikasi pemerintah.

## Acuan kebijakan data nasional

Per 2026, arsitektur harus mengikuti DTSEN sebagai sumber acuan nasional untuk pemanfaatan data sosial-ekonomi pemerintah. Inpres No. 4 Tahun 2025 menetapkan DTSEN sebagai sumber data utama dalam perencanaan, pelaksanaan dan evaluasi kebijakan sosial-ekonomi. Permensos No. 3 Tahun 2025 mengatur pemutakhiran dan penggunaan DTSEN untuk bantuan sosial, pemberdayaan sosial dan program kesejahteraan sosial. Pedoman berbagi-pakai DTSEN diatur dalam Permen PPN/Kepala Bappenas No. 7 Tahun 2025.

RT/RW–SID CONNECT tidak menggantikan DTSEN. Sistem ini menjadi **upstream community evidence and local intelligence layer** yang membantu validasi, pemutakhiran, needs assessment dan program matching melalui jalur resmi.

## GPFFE Data Exchange

Dataset yang disiapkan:
- `SOCIAL_ECONOMIC_PROFILE_AGGREGATE`
- `COMMUNITY_CASHFLOW_AGGREGATE`
- `COMMUNITY_ACTIVITY_SIGNAL`

Default:
- aggregate_only = true;
- classification minimal INTERNAL;
- purpose wajib;
- scope wajib;
- lineage wajib;
- approval wajib untuk exchange sensitif.

Flow:

`RT/RW data`
→ `verification`
→ `aggregate/quality check`
→ `economic snapshot`
→ `GPFFE data contract`
→ `human approval`
→ `approved export`
→ `GPFFE`

Tidak ada raw database sharing.

## Analisis ekonomi komunitas

Contoh indikator:
- total cash-in per bulan;
- total cash-out;
- net cashflow;
- jumlah aktivitas ekonomi komunitas;
- aktivitas arisan;
- kontribusi kegiatan;
- perubahan pola pengeluaran;
- jumlah rumah tangga dengan sinyal kerentanan;
- coverage evidence;
- perubahan indikator dari waktu ke waktu.

Semua indikator harus memiliki:
- periode;
- wilayah;
- metodologi;
- sumber;
- lineage;
- klasifikasi;
- versi.

## Governance

Human approval wajib untuk:
- publikasi status sosial-ekonomi;
- perubahan metodologi;
- export sensitif ke GPFFE;
- koreksi data kematian;
- penghapusan evidence;
- perubahan klasifikasi;
- tindakan yang berdampak pada hak/layanan warga.

