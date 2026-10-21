const fs = require("fs");
const os = require("os");
const path = require("path");
const initSqlJs = require("sql.js");
const { openLocalDatabase, SCHEMA_VERSION } = require("./local-db.cjs");
const { OfflineQueueEngine, QUEUE_STATUSES } = require("./offline-queue.cjs");

(async () => {
  const seedPath = path.resolve(__dirname, "..", "offline-data", "supabase-snapshot-v1.0", "master-data.json");
  await testV1Migration(seedPath);
  await testStaleProcessingRecovery(seedPath);
  console.log(JSON.stringify({
    ok: true,
    schemaVersion: SCHEMA_VERSION,
    migration: "PASS",
    staleProcessingRecovery: "PASS",
    retryMetadataPersistence: "PASS"
  }, null, 2));
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});

async function testV1Migration(seedPath) {
  const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "rtrw-sid-migration-"));
  const db = await openLocalDatabase({ userDataPath, seedPath });
  const queue = new OfflineQueueEngine(db);
  const legacyItem = queue.enqueue({
    entityType: "resident",
    operation: "UPSERT",
    payload: { id: "legacy-resident", name: "Legacy Queue Row" },
    idempotencyKey: "legacy-event-001"
  });
  db.close();

  const dbPath = path.join(userDataPath, "data", "rt-rw-sid-connect.sqlite");
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, "node_modules", "sql.js", "dist", file)
  });
  const legacyDb = new SQL.Database(fs.readFileSync(dbPath));

  legacyDb.run("ALTER TABLE offline_queue RENAME TO offline_queue_v2");
  legacyDb.run("CREATE TABLE offline_queue (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, operation TEXT NOT NULL, payload_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', created_at TEXT NOT NULL, synced_at TEXT, error_message TEXT)");
  legacyDb.run("INSERT INTO offline_queue(id, entity_type, operation, payload_json, status, created_at, synced_at, error_message) SELECT id, entity_type, operation, payload_json, status, created_at, synced_at, error_message FROM offline_queue_v2");
  legacyDb.run("DROP TABLE offline_queue_v2");
  legacyDb.run("UPDATE local_meta SET value='1' WHERE key='schema_version'");
  fs.writeFileSync(dbPath, Buffer.from(legacyDb.export()));
  legacyDb.close();

  const migrated = await openLocalDatabase({ userDataPath, seedPath });
  assert(migrated.getStatus().schemaVersion === 2, "v1 database did not migrate to schema 2");
  const rows = migrated.listQueue({ limit: 10 });
  const row = rows.find((item) => item.id === legacyItem.id);
  assert(row, "legacy queue row was lost during migration");
  assert(row.status === QUEUE_STATUSES.PENDING, "legacy queue row status changed during migration");
  assert(row.idempotencyKey === legacyItem.id, "legacy idempotency key was not backfilled");
  assert(row.retryCount === 0 && row.maxRetries === 3, "legacy retry defaults were not backfilled");
  assert(migrated.getStatus().tableCounts.organizations === 1, "seeded data was damaged during migration");
  migrated.close();
}

async function testStaleProcessingRecovery(seedPath) {
  const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "rtrw-sid-recovery-"));
  const db = await openLocalDatabase({ userDataPath, seedPath });
  const queue = new OfflineQueueEngine(db);
  const item = queue.enqueue({
    entityType: "letter",
    operation: "CREATE",
    payload: { id: "stale-letter" },
    idempotencyKey: "stale-event-001",
    maxRetries: 3
  });

  db.markQueueProcessing(item.id);

  const dbPath = path.join(userDataPath, "data", "rt-rw-sid-connect.sqlite");
  db.close();
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, "node_modules", "sql.js", "dist", file)
  });
  const rawDb = new SQL.Database(fs.readFileSync(dbPath));
  rawDb.run("UPDATE offline_queue SET last_attempt_at=? WHERE id=?", [
    new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    item.id
  ]);
  fs.writeFileSync(dbPath, Buffer.from(rawDb.export()));
  rawDb.close();

  const reopened = await openLocalDatabase({ userDataPath, seedPath });
  const reopenedQueue = new OfflineQueueEngine(reopened);
  const before = reopened.listQueue({ status: QUEUE_STATUSES.PROCESSING, limit: 10 });
  assert(before.length === 1, "test fixture did not restore PROCESSING state");

  await reopenedQueue.replay(async () => ({ recovered: true }));
  const recovered = reopened.listQueue({ limit: 10 }).find((row) => row.id === item.id);
  assert(recovered && recovered.status === QUEUE_STATUSES.SYNCED, "stale PROCESSING row was not recovered and replayed");
  assert(recovered.errorCode === null, "stale recovery metadata was not cleared after sync");
  assert(recovered.retryCount === 0, "stale recovery should not increment retry count");
  reopened.close();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
