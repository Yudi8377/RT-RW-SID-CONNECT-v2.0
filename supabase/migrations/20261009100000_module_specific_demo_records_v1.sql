-- Seed domain-specific fictional records for auxiliary RT/RW CONNECT menus.
-- Safe to re-run; records are scoped to the fictional pilot village and keyed by module/submenu/title.
with seed(module_code,submenu_code,record_type,title,status,priority,payload) as (
 values
  ('IDENTITY','profil','RT_RW_IDENTITY','Identitas RT/RW Contoh','ACTIVE','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('IDENTITY','pengurus','RT_RW_OFFICERS','Susunan Pengurus Contoh','ACTIVE','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('IDENTITY','kop','LETTERHEAD_TEMPLATE','Template Kop Surat Contoh','ACTIVE','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('JOLIE_BUSINESS','crm','CRM_CUSTOMER','Calon Pelanggan UMKM','ACTIVE','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('JOLIE_BUSINESS','inventory','BUSINESS_INVENTORY','Persediaan Produk Contoh','ACTIVE','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('JOLIE_BUSINESS','sales','BUSINESS_ORDER','Pesanan Usaha Contoh','IN_PROGRESS','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('GIS','map','GIS_LAYER','Layer Batas RT/RW','ACTIVE','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('GIS','layers','GIS_LAYER','Layer Fasilitas Umum','ACTIVE','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('GIS','assets','GIS_ASSET','Titik Fasilitas Warga','ACTIVE','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('WHATSAPP','templates','WHATSAPP_TEMPLATE','Template Pengumuman RT','ACTIVE','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('WHATSAPP','notifications','WHATSAPP_QUEUE','Antrean Notifikasi Contoh','QUEUED','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('WHATSAPP','delivery','WHATSAPP_DELIVERY','Status Pengiriman Simulasi','COMPLETED','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('SID_BRIDGE','mapping','SID_FIELD_MAPPING','Pemetaan Data Kependudukan','ACTIVE','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('SID_BRIDGE','validation','SID_PRE_SYNC_CHECK','Validasi Sebelum Sinkronisasi','REVIEW_REQUIRED','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('SID_BRIDGE','logs','SID_SYNC_LOG','Log Sinkronisasi Contoh','COMPLETED','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('GPFFE_EXCHANGE','catalog','EXCHANGE_DATASET','Katalog Dataset Wilayah','ACTIVE','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('GPFFE_EXCHANGE','requests','EXCHANGE_REQUEST','Permintaan Akses Dataset','SUBMITTED','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('GPFFE_EXCHANGE','audit','EXCHANGE_AUDIT','Audit Pertukaran Data','COMPLETED','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('PLATFORM_ADMIN','tenant','ADMIN_TENANT','Tenant Desa Pilot','ACTIVE','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('PLATFORM_ADMIN','users','ADMIN_USER_ACCESS','Pengguna & Hak Akses Contoh','ACTIVE','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('PLATFORM_ADMIN','audit','ADMIN_AUDIT_EVENT','Audit Aktivitas Admin','COMPLETED','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('DATA_QUALITY','score','DATA_QUALITY_SCORE','Skor Kualitas Data','ACTIVE','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('DATA_QUALITY','duplicate','DATA_DUPLICATE_REVIEW','Antrean Pemeriksaan Duplikat','REVIEW_REQUIRED','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('DATA_QUALITY','consistency','DATA_CONSISTENCY_CHECK','Pemeriksaan Konsistensi KK','ACTIVE','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('COMMUNITY','calendar','COMMUNITY_CALENDAR','Kalender Kegiatan Warga','ACTIVE','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('COMMUNITY','meeting','COMMUNITY_MEETING','Musyawarah Warga Contoh','SCHEDULED','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('COMMUNITY','attendance','COMMUNITY_ATTENDANCE','Presensi Kegiatan Contoh','COMPLETED','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('LAYANAN','requests','SERVICE_REQUEST','Permohonan Surat Pengantar','SUBMITTED','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('LAYANAN','complaints','SERVICE_COMPLAINT','Pengaduan Penerangan Jalan','IN_PROGRESS','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb),
  ('LAYANAN','tracking','SERVICE_TRACKING','Pelacakan Layanan Contoh','COMPLETED','NORMAL','{"data_simulasi":true,"catatan":"Contoh fiktif; bukan data resmi"}'::jsonb)
)
insert into public.demo_operational_records
 (territory_id,module_code,submenu_code,record_type,title,status,priority,classification,payload)
select 'f06b8420-54f5-4ee4-b487-bacc7b374dd2'::uuid,s.module_code,s.submenu_code,s.record_type,s.title,s.status,s.priority,'INTERNAL',s.payload
from seed s
where not exists (
 select 1 from public.demo_operational_records e
 where e.territory_id='f06b8420-54f5-4ee4-b487-bacc7b374dd2'::uuid
 and e.module_code=s.module_code and e.submenu_code=s.submenu_code and e.title=s.title
);
