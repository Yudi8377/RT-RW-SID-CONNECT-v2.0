import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const path = new URL("../tests/fixtures/rt-rw-cross-menu-sample-data.json", import.meta.url);
const data = JSON.parse(await readFile(path, "utf8"));
assert.equal(data.meta.synthetic, true);
assert.equal(data.meta.generated_for, "testing_only");
assert.equal(data.data_warga.length, 20);
assert.equal(data.data_keluarga_kk.length, 5);
assert.equal(Object.keys(data.data_menu).length, 34);

const residents = new Map(data.data_warga.map((row) => [row.id, row]));
const families = new Map(data.data_keluarga_kk.map((row) => [row.id, row]));
assert.equal(residents.size, data.data_warga.length, "ID warga harus unik");

for (const resident of residents.values()) {
  assert.ok(families.has(resident.family_id), `KK tidak ditemukan: ${resident.id}`);
  assert.equal(resident.is_synthetic, true);
  assert.match(resident.nik_demo, /^DEMO-NIK-/);
}
for (const family of families.values()) {
  assert.equal(family.is_synthetic, true);
  for (const id of family.anggota_ids) {
    assert.ok(residents.has(id), `Anggota KK tidak ditemukan: ${id}`);
    assert.equal(residents.get(id).family_id, family.id);
  }
}

let recordCount = 0;
let linkedCount = 0;
for (const [menu, rows] of Object.entries(data.data_menu)) {
  assert.equal(rows.length, 10, `Jumlah data menu tidak tepat: ${menu}`);
  for (const row of rows) {
    recordCount++;
    assert.equal(row.is_synthetic, true);
    assert.ok(residents.has(row.resident_id), `Warga referensi tidak ditemukan: ${menu}/${row.id}`);
    assert.ok(families.has(row.family_id), `KK referensi tidak ditemukan: ${menu}/${row.id}`);
    for (const key of ["rt_id", "rw_id", "desa_id", "kecamatan_id", "kabupaten_kota_id"]) {
      assert.ok(row[key], `Wilayah kosong: ${menu}/${row.id}/${key}`);
    }
    if (row.sumber_menu) {
      linkedCount++;
      assert.ok(Object.hasOwn(data.data_menu, row.sumber_menu), `sumber_menu tidak dikenal: ${row.sumber_menu}`);
    }
  }
}
assert.equal(recordCount, 340);
console.log(JSON.stringify({ result: "PASS", residents: residents.size, families: families.size, menus: Object.keys(data.data_menu).length, menuRecords: recordCount, linkedAggregateRows: linkedCount }, null, 2));
