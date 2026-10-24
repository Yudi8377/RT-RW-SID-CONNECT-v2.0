import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const data = JSON.parse(await readFile(new URL("../tests/fixtures/rt-rw-cross-menu-sample-data.json", import.meta.url), "utf8"));
assert.equal(data.meta.synthetic, true);
assert.equal(data.meta.generated_for, "testing_only");
assert.equal(data.data_warga.length, 20);
assert.equal(data.data_keluarga_kk.length, 5);
assert.equal(Object.keys(data.data_menu).length, 34);
const residents = new Map(data.data_warga.map((x) => [x.id, x]));
const families = new Map(data.data_keluarga_kk.map((x) => [x.id, x]));
for (const x of residents.values()) {
  assert.equal(x.is_synthetic, true);
  assert.match(x.nik_demo, /^DEMO-NIK-/);
  assert.ok(families.has(x.family_id), `KK tidak ditemukan: ${x.id}`);
}
for (const family of families.values()) {
  assert.equal(family.is_synthetic, true);
  for (const id of family.anggota_ids) {
    assert.ok(residents.has(id), `Anggota KK tidak ditemukan: ${id}`);
    assert.equal(residents.get(id).family_id, family.id);
  }
}
let total = 0;
let linked = 0;
for (const [menu, rows] of Object.entries(data.data_menu)) {
  assert.equal(rows.length, 10, `Jumlah contoh salah: ${menu}`);
  for (const row of rows) {
    total++;
    assert.equal(row.is_synthetic, true);
    assert.ok(residents.has(row.resident_id), `Warga tidak ditemukan: ${menu}/${row.id}`);
    assert.ok(families.has(row.family_id), `KK tidak ditemukan: ${menu}/${row.id}`);
    for (const key of ["rt_id", "rw_id", "desa_id", "kecamatan_id", "kabupaten_kota_id"]) assert.ok(row[key], `Wilayah kosong: ${menu}/${row.id}/${key}`);
    if (row.sumber_menu) {
      linked++;
      assert.ok(["data_warga", "data_keluarga_kk"].includes(row.sumber_menu) || Object.hasOwn(data.data_menu, row.sumber_menu), `Sumber tidak dikenal: ${row.sumber_menu}`);
    }
  }
}
assert.equal(total, 340);
console.log(JSON.stringify({ result: "PASS", warga: residents.size, keluarga: families.size, menu: Object.keys(data.data_menu).length, rekamanMenu: total, referensiAgregasi: linked }, null, 2));
