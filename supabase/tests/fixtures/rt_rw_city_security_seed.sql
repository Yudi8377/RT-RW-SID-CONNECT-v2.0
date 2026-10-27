-- RT/RW/SID CONNECT — synthetic cross-level security fixture
-- SAFE BY DESIGN:
-- * Uses only pre-existing active territory rows with DEMO-* codes.
-- * Inserts only into demo_operational_records.
-- * Never inserts/updates persons, households, addresses, role_assignments, or real operational tables.
-- * No person_id / household_id, NIK, phone, email, or names of real people.
-- * Idempotent: fixture key is payload.fixture + record_type + territory.
-- Run only after reviewing the target project and its DEMO-* territory rows.

DO $seed$
DECLARE
  expected_count integer;
BEGIN
  SELECT count(*) INTO expected_count
  FROM public.territories
  WHERE active = true
    AND (code, territory_type) IN (
      ('DEMO-PROV-01','PROVINCE'),
      ('DEMO-KAB-01','REGENCY_CITY'),
      ('DEMO-KEC-01','DISTRICT'),
      ('DEMO-DESA-01','VILLAGE'),
      ('DEMO-RW-01','RW'),
      ('DEMO-RT-01','RT')
    );

  IF expected_count <> 6 THEN
    RAISE EXCEPTION 'Refusing to seed: expected all 6 active DEMO hierarchy nodes; found %', expected_count;
  END IF;

  INSERT INTO public.demo_operational_records
    (territory_id, module_code, submenu_code, record_type, title, status, priority, classification, payload)
  SELECT t.id, v.module_code, v.submenu_code, v.record_type, v.title, v.status,
         v.priority, v.classification, v.payload::jsonb
  FROM (VALUES
    ('DEMO-RT-01','RT_DIGITAL','community_issues','SECURITY_TEST','[DATA DEMO] RT: laporan lampu jalan mati','SUBMITTED','MEDIUM','INTERNAL','{"fixture":"RT_RW_CITY_SECURITY_20261027","synthetic":true,"contains_personal_data":false,"workflow_stage":"RT_SUBMITTED","public_publishable":false,"purpose":"uji input dan batas akses RT"}'),
    ('DEMO-RW-01','RW_DIGITAL','review_queue','SECURITY_TEST','[DATA DEMO] RW: verifikasi laporan lampu jalan','RW_VERIFIED','MEDIUM','INTERNAL','{"fixture":"RT_RW_CITY_SECURITY_20261027","synthetic":true,"contains_personal_data":false,"workflow_stage":"RW_VERIFIED","public_publishable":false,"purpose":"uji verifikasi lintas RT dalam lingkup RW"}'),
    ('DEMO-DESA-01','DESA_DIGITAL','validation_queue','SECURITY_TEST','[DATA DEMO] Desa: validasi kebutuhan penerangan','VILLAGE_VALIDATED','MEDIUM','INTERNAL','{"fixture":"RT_RW_CITY_SECURITY_20261027","synthetic":true,"contains_personal_data":false,"workflow_stage":"VILLAGE_VALIDATED","public_publishable":false,"purpose":"uji validasi desa dan rekap tanpa identitas warga"}'),
    ('DEMO-KEC-01','KECAMATAN_DIGITAL','regional_aggregation','SECURITY_TEST','[DATA DEMO] Kecamatan: rekap kebutuhan penerangan','IN_REVIEW','LOW','INTERNAL','{"fixture":"RT_RW_CITY_SECURITY_20261027","synthetic":true,"contains_personal_data":false,"workflow_stage":"DISTRICT_REVIEW","aggregate_only":true,"public_publishable":false,"purpose":"uji agregasi lintas desa"}'),
    ('DEMO-KAB-01','KOTA_KABUPATEN_DIGITAL','featured_review','SECURITY_TEST','[DATA DEMO] Kabupaten: kurasi program penerangan','IN_REVIEW','LOW','INTERNAL','{"fixture":"RT_RW_CITY_SECURITY_20261027","synthetic":true,"contains_personal_data":false,"workflow_stage":"REGENCY_CURATION","aggregate_only":true,"public_publishable":false,"purpose":"uji kurasi tingkat kabupaten/kota"}'),
    ('DEMO-PROV-01','PROVINSI_DIGITAL','regional_indicators','SECURITY_TEST','[DATA DEMO] Provinsi: indikator kebutuhan infrastruktur','DRAFT','LOW','INTERNAL','{"fixture":"RT_RW_CITY_SECURITY_20261027","synthetic":true,"contains_personal_data":false,"workflow_stage":"PROVINCE_AGGREGATE","aggregate_only":true,"public_publishable":false,"purpose":"uji indikator agregat tingkat provinsi"}')
  ) AS v(code,module_code,submenu_code,record_type,title,status,priority,classification,payload)
  JOIN public.territories t ON t.code = v.code AND t.active = true
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.demo_operational_records d
    WHERE d.territory_id = t.id
      AND d.record_type = 'SECURITY_TEST'
      AND d.payload->>'fixture' = 'RT_RW_CITY_SECURITY_20261027'
  );
END
$seed$;
