# Portal Kota/Kabupaten, Ruang Chat, dan Video Warga

## URL setelah deployment
- Website warga: website/index.html#ruang-warga
- Portal publik daerah: website/kota-kabupaten/index.html
- Dashboard pengelola: website/kota-kabupaten/admin.html

## Ruang Warga
- Chat menggunakan Supabase Auth, community_chat_rooms, community_chat_members, dan community_chat_messages.
- Pesan hanya dapat dibaca anggota ruang yang sudah login. Ruang lintas RT/RW tersedia untuk komunikasi antarwilayah.
- Realtime menggunakan Supabase Realtime pada community_chat_messages.
- Jangan mengirim NIK, alamat rinci, data kesehatan, kata sandi, atau data pribadi ke ruang komunitas.

## Video
- Kontributor login lalu mengajukan URL HTTPS YouTube, Vimeo, atau berkas video HTTPS .mp4, .webm, .ogg.
- Pengajuan dimulai sebagai DIAJUKAN; video tidak otomatis publik.
- Pengelola berwenang harus meninjau isi, izin publikasi, dan catatan keputusan sebelum TERBIT.
- Browser tidak mengunggah berkas video besar ke Supabase Storage; versi awal menyimpan tautan HTTPS. Upload Storage terkelola dapat ditambahkan pada tahap berikutnya.

## Portal dan dashboard daerah
- Portal publik merangkum konten CMS berstatus TERBIT atau UNGGULAN dan menampilkan pilihan unggulan per wilayah.
- Dashboard membutuhkan akun Supabase yang telah diberi role REGENCY_CITY_ADMIN, DISTRICT_COORDINATOR, atau PLATFORM_ADMIN dengan scope_territory_id yang sesuai.
- Role baru ditambahkan ke katalog roles oleh migration. Penetapan role ke pengguna tetap harus dilakukan melalui proses administrasi identitas yang berwenang; tidak ada role admin otomatis.
- Dashboard dapat memilih berita publik yang sudah diterbitkan sebagai unggulan daerah dan memoderasi antrean video dalam cakupan wilayah yang terhubung pada pohon territories.
- Berita unggulan daerah adalah kurasi tambahan; tidak mengubah keputusan editorial sumber.

## Migrasi database
- 202610220005_community_chat_and_video.sql
- 202610220006_regional_video_moderation.sql
- 202610220007_video_submission_scope.sql
- 202610220008_regional_curator_scope.sql
- 202610220009_public_column_grants.sql

Ketiganya diterapkan pada project Supabase gzdusguveeeflmlvvmwe; tabel baru menggunakan RLS aktif dan FORCE RLS. Realtime publication mencakup community_chat_messages.

## Batasan tahap pertama
- Belum ada penyimpanan video file langsung; gunakan URL HTTPS.
- Akun harus sudah terdaftar dan diverifikasi bila pengaturan Supabase Auth mewajibkan konfirmasi email.
- Role dan scope daerah perlu ditetapkan oleh admin yang berwenang sebelum dashboard menampilkan data terproteksi.
- TemplateMo Leadership Event digunakan sebagai inspirasi tata letak dan hierarki visual; halaman daerah ditulis ulang untuk konteks Smart Village, bukan menyalin seluruh template.
