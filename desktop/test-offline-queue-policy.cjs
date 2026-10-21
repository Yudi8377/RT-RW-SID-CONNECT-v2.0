const fs = require("fs");
const os = require("os");
const path = require("path");
const { openLocalDatabase, SCHEMA_VERSION } = require("./local-db.cjs");
const { OfflineQueueEngine, QUEUE_STATUSES } = require("./offline-queue.cjs");

(async () => {
  const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "rtrw-sid-queue-policy-"));
  const seedPath = path.resolve(__dirname, "..", "offline-data", "supabase-snapshot-v1.0", "master-data.json");
  const db = await openLocalDatabase({ userDataPath, seedPath });
  const queue = new OfflineQueueEngine(db);

  assert(SCHEMA_VERSION === 2, "schema version should be 2");

  const first = queue.enqueue({
    entityType: "resident",
    operation: "UPSERT",
    payload: { id: "resident-001", name: "Offline Test" },
    idempotencyKey: "event-resident-001"
  });
  const duplicate = queue.enqueue({
    entityType: "resident",
    operation: "UPSERT",
    payload: { id: "resident-001", name: "Changed Payload Must Not Duplicate" },
    idempotencyKey: "event-resident-001"
  });
  assert(first.id === duplicate.id && duplicate.duplicate === true, "duplicate idempotency event was not deduplicated");
  assert(db.getStatus().queuePending === 1, "duplicate event created an extra queue row");

  const second = queue.enqueue({
    entityType: "letter",
    operation: "CREATE",
    payload: { id: "letter-001", title: "Test Letter" },
    maxRetries: 2,
    conflictKey: "letter:letter-001"
  });

  const replay = await queue.replay(async (item) => {
    assert(item.payload && item.payload.id, "queue payload missing");
    return { accepted: true, entityType: item.entityType };
  });
  assert(replay.synced === 2 && replay.deadLetter === 0, "successful replay mismatch");
  assert(db.getStatus().queuePending === 0, "pending queue should be empty after replay");

  const retry = queue.enqueue({
    entityType: "resident",
    operation: "UPSERT",
    payload: { id: "resident-retry" },
    idempotencyKey: "event-retry",
    maxRetries: 2
  });
  const retry1 = await queue.replay(async () => {
    const error = new Error("temporary sync failure");
    error.code = "NETWORK_UNAVAILABLE";
    throw error;
  });
  assert(retry1.failed === 1 && retry1.deadLetter === 0, "first retryable failure should return to pending");
  const retryRow1 = db.listQueue({ status: QUEUE_STATUSES.PENDING, limit: 10 }).find((row) => row.id === retry.id);
  assert(retryRow1 && retryRow1.retryCount === 1, "retry count did not increment");

  const retry2 = await queue.replay(async () => {
    const error = new Error("temporary sync failure");
    error.code = "NETWORK_UNAVAILABLE";
    throw error;
  });
  assert(retry2.deadLetter === 1, "max retry should move item to dead letter");
  const dead = db.listQueue({ status: QUEUE_STATUSES.DEAD_LETTER, limit: 10 }).find((row) => row.id === retry.id);
  assert(dead && dead.retryCount === 2, "dead-letter retry metadata mismatch");

  const conflict = queue.enqueue({
    entityType: "letter",
    operation: "UPDATE",
    payload: { id: "letter-conflict" },
    idempotencyKey: "event-conflict",
    maxRetries: 5,
    conflictKey: "letter:letter-conflict"
  });
  const conflictReplay = await queue.replay(async () => {
    const error = new Error("server version conflict");
    error.code = "CONFLICT";
    throw error;
  });
  assert(conflictReplay.deadLetter === 1, "conflict must not be retried automatically");
  const conflictRow = db.listQueue({ status: QUEUE_STATUSES.DEAD_LETTER, limit: 20 }).find((row) => row.id === conflict.id);
  assert(conflictRow && conflictRow.retryCount === 1 && conflictRow.errorCode === "CONFLICT", "conflict policy metadata mismatch");

  db.close();
  const reopened = await openLocalDatabase({ userDataPath, seedPath });
  assert(reopened.getStatus().queueDeadLetter === 2, "dead-letter rows did not persist across reopen");
  reopened.close();

  console.log(JSON.stringify({
    ok: true,
    schemaVersion: SCHEMA_VERSION,
    idempotency: "PASS",
    retryPolicy: "PASS",
    conflictPolicy: "PASS",
    persistence: "PASS"
  }, null, 2));
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
