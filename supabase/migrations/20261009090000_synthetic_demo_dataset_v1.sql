-- Synthetic demo dataset for RT/RW–SID CONNECT.
-- Safe to re-run. All identifiers are clearly synthetic; do not use as official resident records.
-- This migration adds 60 demo residents, 20 demo family cards, death/movement examples,
-- and module activity examples. Existing production records are not modified.

-- Demo territory hierarchy: a fictional pilot village with 2 RW and 5 RT.
insert into public.territories(parent_id,territory_type,code,name)
select null,'PROVINCE','DEMO-PROV-01','Provinsi Contoh'
where not exists(select 1 from public.territories where code='DEMO-PROV-01');
insert into public.territories(parent_id,territory_type,code,name)
select p.id,'REGENCY_CITY','DEMO-KAB-01','Kabupaten Contoh' from public.territories p
where p.code='DEMO-PROV-01' and not exists(select 1 from public.territories where code='DEMO-KAB-01');
insert into public.territories(parent_id,territory_type,code,name)
select p.id,'DISTRICT','DEMO-KEC-01','Kecamatan Contoh' from public.territories p
where p.code='DEMO-KAB-01' and not exists(select 1 from public.territories where code='DEMO-KEC-01');
insert into public.territories(parent_id,territory_type,code,name)
select p.id,'VILLAGE','DEMO-DESA-01','Desa Contoh' from public.territories p
where p.code='DEMO-KEC-01' and not exists(select 1 from public.territories where code='DEMO-DESA-01');
insert into public.territories(parent_id,territory_type,code,name)
select v.id,'RW',format('DEMO-RW-%s',lpad(rw::text,2,'0')),format('RW %s',lpad(rw::text,2,'0'))
from public.territories v cross join generate_series(1,2) rw
where v.code='DEMO-DESA-01'
and not exists(select 1 from public.territories t where t.code=format('DEMO-RW-%s',lpad(rw::text,2,'0')));
insert into public.territories(parent_id,territory_type,code,name)
select rw.id,'RT',format('DEMO-RT-%s',lpad(rt::text,2,'0')),format('RT %s',lpad(rt::text,2,'0'))
from generate_series(1,5) rt
join public.territories rw on rw.code=format('DEMO-RW-%s',lpad((case when rt<=3 then 1 else 2 end)::text,2,'0'))
where not exists(select 1 from public.territories t where t.code=format('DEMO-RT-%s',lpad(rt::text,2,'0')));

-- Address and household records (20 family cards).
insert into public.addresses(territory_id,address_line,postal_code)
select t.id,format('Jalan Contoh Blok %s No. %s, RT %s/RW %s',chr(64+((g-1)/4)+1),lpad(((g-1)%4)+1::text,2,'0'),lpad(((g-1)%5)+1::text,2,'0'),lpad((case when ((g-1)%5)+1<=3 then 1 else 2 end)::text,2,'0')),'00000'
from generate_series(1,20) g
join public.territories t on t.code=format('DEMO-RT-%s',lpad((((g-1)%5)+1)::text,2,'0'))
where not exists(select 1 from public.addresses a where a.address_line like format('Jalan Contoh Blok %s No. %s,%%',chr(64+((g-1)/4)+1),lpad(((g-1)%4)+1::text,2,'0')));

insert into public.households(household_number_hash,address_id,status)
select format('DEMO-KK-%s',lpad(g::text,4,'0')),a.id,'ACTIVE'
from generate_series(1,20) g
join public.addresses a on a.address_line like format('Jalan Contoh Blok %s No. %s,%%',chr(64+((g-1)/4)+1),lpad(((g-1)%4)+1::text,2,'0'))
where not exists(select 1 from public.households h where h.household_number_hash=format('DEMO-KK-%s',lpad(g::text,4,'0')));

-- 60 synthetic residents. The generated names and DEMO identifiers are not real civil records.
with name_pool as (
 select array['Adi','Budi','Citra','Dewi','Eko','Fitri','Gilang','Hana','Indra','Joko','Kartika','Lestari','Maya','Nanda','Oki','Putri','Raka','Sari','Tono','Wulan']::text[] firsts,
        array['Santoso','Wijaya','Pratama','Lestari','Saputra','Kusuma','Hidayat','Permata','Nugraha','Setiawan']::text[] lasts
), demo_people as (
 select g,
        (firsts[((g-1)%array_length(firsts,1))+1]||' '||lasts[((g*3-1)%array_length(lasts,1))+1]||case when g>20 then ' '||g::text else '' end) full_name
 from generate_series(1,60) g cross join name_pool
)
insert into public.persons(national_id_hash,full_name,birth_place,birth_date,gender,phone,classification,status)
select format('DEMO-NIK-%s',lpad(g::text,6,'0')),full_name,'Kota Contoh',
       (date '1960-01-01' + ((g*173)%16000))::date,
       case when g%2=0 then 'FEMALE' else 'MALE' end,
       format('08%09s',g::text),'CONFIDENTIAL',
       case when g in (58,59) then 'DECEASED' else 'ACTIVE' end
from demo_people
where not exists(select 1 from public.persons p where p.national_id_hash=format('DEMO-NIK-%s',lpad(g::text,6,'0')));

insert into public.residencies(person_id,address_id,household_id,residency_status,valid_from,verification_status)
select p.id,h.address_id,h.id,
       case when substring(p.national_id_hash from '([0-9]+)$')::int between 55 and 57 then 'TEMPORARY'
            when substring(p.national_id_hash from '([0-9]+)$')::int between 51 and 54 then 'MOVED'
            else 'ACTIVE' end,
       date '2024-01-01' + ((substring(p.national_id_hash from '([0-9]+)$')::int*13)%900),
       'VILLAGE_VALIDATED'
from public.persons p
join public.households h on h.household_number_hash=format('DEMO-KK-%s',lpad((((substring(p.national_id_hash from '([0-9]+)$')::int-1)/3)+1)::text,4,'0'))
where p.national_id_hash like 'DEMO-NIK-%'
and not exists(select 1 from public.residencies r where r.person_id=p.id and r.address_id=h.address_id);

-- Death records are explicitly synthetic and linked only to the demo residents.
insert into public.death_records(person_id,household_id,date_of_death,place_of_death,cause_category,verification_status,notes)
select p.id,h.id,date '2025-02-01' + (substring(p.national_id_hash from '([0-9]+)$')::int-58),
       'Rumah Sakit Contoh','NATURAL','VILLAGE_VALIDATED','DATA SIMULASI — bukan catatan kematian resmi'
from public.persons p
left join public.residencies r on r.person_id=p.id
left join public.households h on h.id=r.household_id
where p.national_id_hash in ('DEMO-NIK-000058','DEMO-NIK-000059')
and not exists(select 1 from public.death_records d where d.person_id=p.id);

create table if not exists public.demo_residency_movements(
 id uuid primary key default gen_random_uuid(),
 demo_code text not null unique,
 person_id uuid references public.persons(id) on delete cascade,
 movement_type text not null check(movement_type in ('PENDATANG','PINDAH_MASUK','PINDAH_KELUAR','PINDAH_RT','PINDAH_RW')),
 event_date date not null,
 origin_label text,
 destination_label text,
 status text not null default 'RT_VERIFIED' check(status in ('DRAFT','RT_VERIFIED','RW_REVIEW','VILLAGE_VALIDATED','REJECTED')),
 notes text not null default 'DATA SIMULASI'
);
alter table public.demo_residency_movements enable row level security;
drop policy if exists demo_residency_movements_authenticated_read on public.demo_residency_movements;
create policy demo_residency_movements_authenticated_read on public.demo_residency_movements for select to authenticated using (true);
grant select on public.demo_residency_movements to authenticated;

insert into public.demo_residency_movements(demo_code,person_id,movement_type,event_date,origin_label,destination_label,status,notes)
select 'DEMO-MOVE-'||x.code,p.id,x.kind,date '2026-01-01'+x.offset_days,x.origin,x.dest,x.state,'DATA SIMULASI — hanya untuk demonstrasi menu'
from (values
 ('001','PENDATANG',12,'Kabupaten Tetangga','RT 01 / RW 01','RT_VERIFIED',55),
 ('002','PENDATANG',24,'Kota Contoh','RT 02 / RW 01','RW_REVIEW',56),
 ('003','PINDAH_MASUK',36,'RT 03 / RW 01','RT 04 / RW 02','VILLAGE_VALIDATED',57),
 ('004','PINDAH_KELUAR',48,'RT 01 / RW 01','Kabupaten Lain','RT_VERIFIED',51),
 ('005','PINDAH_RT',61,'RT 02 / RW 01','RT 03 / RW 01','RW_REVIEW',52),
 ('006','PINDAH_RW',74,'RW 01','RW 02','RT_VERIFIED',53)
) x(code,kind,offset_days,origin,dest,state,person_no)
join public.persons p on p.national_id_hash='DEMO-NIK-'||lpad(x.person_no::text,6,'0')
where not exists(select 1 from public.demo_residency_movements m where m.demo_code='DEMO-MOVE-'||x.code);

-- Give existing menu surfaces realistic synthetic activity examples.
insert into public.demo_events(module,title,detail,severity)
select x.module,x.title,x.detail,x.severity
from (values
 ('WARGA','Data contoh 60 warga dan 20 KK','Dataset simulasi tersedia untuk demo; tidak berisi NIK/KK asli.','INFO'),
 ('KEPENDUDUKAN','Contoh laporan kelahiran dan perubahan data','Contoh alur pengajuan, verifikasi RT, pemeriksaan RW, dan validasi desa.','INFO'),
 ('KEMATIAN','2 catatan kematian simulasi','Catatan demo terhubung ke penduduk sintetis dan tidak menggantikan dokumen resmi.','INFO'),
 ('PENDATANG','2 permohonan pendatang simulasi','Contoh pendatang baru dengan status verifikasi RT/RW.','INFO'),
 ('PINDAH','4 peristiwa perpindahan simulasi','Contoh pindah masuk, pindah keluar, pindah RT, dan pindah RW.','INFO'),
 ('UMKM','57 profil UMKM contoh','Data usaha sintetis untuk menampilkan direktori dan indikator ekonomi.','INFO'),
 ('BERITA_DESA','33 artikel berita contoh','Berita simulasi 2024–2026; konten bukan pengumuman resmi desa.','INFO'),
 ('LAYANAN','Contoh surat dan pelacakan layanan','Surat domisili, keterangan usaha, pengantar, dan permohonan layanan.','INFO'),
 ('KEGIATAN','Contoh agenda warga','Rapat RT/RW, kerja bakti, posyandu, pengajian, dan kegiatan komunitas.','INFO'),
 ('KEUANGAN','Contoh kas RT/RW','Ringkasan penerimaan dan pengeluaran simulasi untuk demonstrasi laporan.','INFO'),
 ('GIS','Contoh wilayah RT/RW','Wilayah contoh bersifat fiktif; koordinat tidak merepresentasikan alamat warga nyata.','INFO'),
 ('BANTUAN_SOSIAL','Contoh registri program bantuan','Status kelayakan merupakan simulasi dan tidak menentukan hak bantuan nyata.','INFO'),
 ('KEAMANAN','Contoh laporan keamanan lingkungan','Gunakan data simulasi; jangan kirim laporan darurat nyata ke demo.','INFO'),
 ('ADMIN','Dataset demo siap ditinjau','Gunakan penanda DEMO untuk membedakan data latihan dari data operasional.','INFO')
) x(module,title,detail,severity)
where not exists(select 1 from public.demo_events e where e.module=x.module and e.title=x.title);

insert into public.demo_requests(request_number,citizen_name,service_name,scope_label,status,classification)
select x.req,x.name,x.service,x.scope,x.status,'INTERNAL'
from (values
 ('DEMO-REQ-2026-001','Adi Santoso','Surat Pengantar','RT 01 / RW 01','SUBMITTED'),
 ('DEMO-REQ-2026-002','Citra Pratama','Surat Keterangan Domisili','RT 02 / RW 01','RT_VERIFIED'),
 ('DEMO-REQ-2026-003','Dewi Kusuma','Surat Keterangan Usaha','RT 03 / RW 01','RW_REVIEW'),
 ('DEMO-REQ-2026-004','Eko Hidayat','Perubahan Kartu Keluarga','RT 04 / RW 02','SUBMITTED'),
 ('DEMO-REQ-2026-005','Fitri Nugraha','Pelaporan Pendatang','RT 05 / RW 02','RT_VERIFIED')
) x(req,name,service,scope,status)
where not exists(select 1 from public.demo_requests r where r.request_number=x.req);

insert into public.demo_documents(document_number,title,document_type,status,signer_label,verification_code)
select x.num,x.title,x.kind,x.status,x.signer,x.code
from (values
 ('DEMO-DOC-2026-001','Surat Keterangan Domisili — Simulasi','SURAT','READY','Ketua RT','DEMO-VERIFY-001'),
 ('DEMO-DOC-2026-002','Surat Keterangan Usaha — Simulasi','SURAT','DRAFT','Ketua RW','DEMO-VERIFY-002'),
 ('DEMO-DOC-2026-003','Laporan Rekap Penduduk — Simulasi','LAPORAN','DRAFT','Operator Desa','DEMO-VERIFY-003')
) x(num,title,kind,status,signer,code)
where not exists(select 1 from public.demo_documents d where d.document_number=x.num);
