const fs = require("fs");
const os = require("os");
const path = require("path");
const { openLocalDatabase, SCHEMA_VERSION } = require("./local-db.cjs");

const expected = {
  platform_core: 1,
  territories: 4,
  roles: 5,
  permissions: 6,
  role_permissions: 2,
  organizations: 1,
  exchange_datasets: 5
};

(async () => {
  const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "rtrw-sid-offline-"));
  const seedPath = path.resolve(__dirname, "..", "offline-data", "supabase-snapshot-v1.0", "master-data.json");

  const first = await openLocalDatabase({ userDataPath, seedPath });
  const firstStatus = first.getStatus();
  assert(firstStatus.schemaVersion === SCHEMA_VERSION, "schema version mismatch");
  assert(firstStatus.seeded === true, "database was not seeded");
  assert(firstStatus.queuePending === 0, "unexpected pending queue rows");
  assertDeepEqual(firstStatus.tableCounts, expected, "initial table counts");
  first.close();

  const second = await openLocalDatabase({ userDataPath, seedPath });
  const secondStatus = second.getStatus();
  assertDeepEqual(secondStatus.tableCounts, expected, "persisted table counts");
  assert(secondStatus.queuePending === 0, "queue changed after reopen");
  second.close();

  const seedText = fs.readFileSync(seedPath, "utf8").toLowerCase();
  const shellText = fs.readFileSync(path.join(__dirname, "offline-shell.html"), "utf8").toLowerCase();
  for (const forbidden of ["service_role", "supabase_service_role_key", "sb_secret_"]) {
    assert(!seedText.includes(forbidden), "forbidden credential marker found in seed: " + forbidden);
  }
  assert(!shellText.includes("http://") && !shellText.includes("https://"), "offline shell contains external URL dependency");

  console.log(JSON.stringify({ ok: true, schemaVersion: SCHEMA_VERSION, tableCounts: secondStatus.tableCounts, dbPath: secondStatus.dbPath }, null, 2));
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function assertDeepEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  assert(a === e, label + ": expected " + e + ", got " + a);
}
