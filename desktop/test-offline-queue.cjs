const fs = require("fs");
const os = require("os");
const path = require("path");
const { openLocalDatabase } = require("./local-db.cjs");
const { OfflineQueueEngine, QUEUE_STATUSES } = require("./offline-queue.cjs");

(async () => {
  const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "rtrw-sid-queue-"));
  const seedPath = path.resolve(__dirname, "..", "offline-data", "supabase-snapshot-v1.0", "master-data.json");
  const db = await openLocalDatabase({ userDataPath, seedPath });
  const queue = new OfflineQueueEngine(db);

  const first = queue.enqueue({ entityType: "resident", operation: "UPSERT", payload: { id: "resident-001", name: "Offline Test" } });
  const second = queue.enqueue({ entityType: "letter", operation: "CREATE", payload: { id: "letter-001", title: "Test Letter" } });

  assert(db.getStatus().queuePending === 2, "expected two pending queue rows");
  const pending = queue.pending();
  assert(pending.length === 2, "pending queue length mismatch");
  assert(pending[0].id === first.id && pending[1].id === second.id, "queue order mismatch");

  const replay = await queue.replay(async (item) => {
    assert(item.payload && item.payload.id, "queue payload missing");
    return { accepted: true, entityType: item.entityType };
  });
  assert(replay.attempted === 2 && replay.synced === 2 && replay.failed === 0, "successful replay mismatch");
  assert(db.getStatus().queuePending === 0, "pending queue should be empty after replay");

  const failed = queue.enqueue({ entityType: "resident", operation: "UPSERT", payload: { id: "resident-002" } });
  const failedReplay = await queue.replay(async () => { throw new Error("simulated sync failure"); });
  assert(failedReplay.failed === 1, "failed replay count mismatch");
  const failedRow = db.listQueue({ status: QUEUE_STATUSES.FAILED, limit: 10 }).find((row) => row.id === failed.id);
  assert(failedRow && failedRow.errorMessage === "simulated sync failure", "failed queue row was not retained");

  db.close();
  const reopened = await openLocalDatabase({ userDataPath, seedPath });
  const reopenedFailed = reopened.listQueue({ status: QUEUE_STATUSES.FAILED, limit: 10 });
  assert(reopenedFailed.length === 1 && reopenedFailed[0].id === failed.id, "failed queue row did not persist");
  reopened.close();

  console.log(JSON.stringify({ ok: true, successfulReplay: replay, failedReplay, persistedFailedRow: failed.id }, null, 2));
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
