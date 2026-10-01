const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");

const SCHEMA_VERSION = 2;
const DEFAULT_MAX_RETRIES = 3;

async function openLocalDatabase({ userDataPath, seedPath }) {
  const dataDir = path.join(userDataPath, "data");
  const dbPath = path.join(dataDir, "rt-rw-sid-connect.sqlite");
  fs.mkdirSync(dataDir, { recursive: true });
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, "node_modules", "sql.js", "dist", file)
  });
  const db = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database();
  db.run("CREATE TABLE IF NOT EXISTS local_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);");
  db.run("CREATE TABLE IF NOT EXISTS offline_queue (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, operation TEXT NOT NULL, payload_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', created_at TEXT NOT NULL, synced_at TEXT, error_message TEXT, idempotency_key TEXT, retry_count INTEGER NOT NULL DEFAULT 0, max_retries INTEGER NOT NULL DEFAULT 3, last_attempt_at TEXT, next_retry_at TEXT, conflict_key TEXT, error_code TEXT);");

  const version = Number(scalar(db, "SELECT value FROM local_meta WHERE key='schema_version'") || 0);
  if (version === 0) {
    seedDatabase(db, seedPath);
    db.run("INSERT OR REPLACE INTO local_meta(key,value) VALUES ('schema_version', ?)", [String(SCHEMA_VERSION)]);
    db.run("INSERT OR REPLACE INTO local_meta(key,value) VALUES ('seed_package', ?)", ["supabase-snapshot-v1.0"]);
    persist(db, dbPath);
  } else if (version === 1) {
    migrateQueueSchema(db);
    db.run("UPDATE local_meta SET value=? WHERE key='schema_version'", [String(SCHEMA_VERSION)]);
    persist(db, dbPath);
  } else if (version !== SCHEMA_VERSION) {
    throw new Error("Unsupported local database schema version: " + version);
  }

  return {
    dbPath,
    schemaVersion: SCHEMA_VERSION,
    getStatus() {
      return {
        dbPath,
        schemaVersion: SCHEMA_VERSION,
        seeded: Boolean(scalar(db, "SELECT value FROM local_meta WHERE key='seed_package'")),
        queuePending: Number(scalar(db, "SELECT COUNT(*) FROM offline_queue WHERE status='PENDING'") || 0),
        queueProcessing: Number(scalar(db, "SELECT COUNT(*) FROM offline_queue WHERE status='PROCESSING'") || 0),
        queueFailed: Number(scalar(db, "SELECT COUNT(*) FROM offline_queue WHERE status='FAILED'") || 0),
        queueDeadLetter: Number(scalar(db, "SELECT COUNT(*) FROM offline_queue WHERE status='DEAD_LETTER'") || 0),
        tableCounts: {
          platform_core: Number(scalar(db, "SELECT COUNT(*) FROM platform_core") || 0),
          territories: Number(scalar(db, "SELECT COUNT(*) FROM territories") || 0),
          roles: Number(scalar(db, "SELECT COUNT(*) FROM roles") || 0),
          permissions: Number(scalar(db, "SELECT COUNT(*) FROM permissions") || 0),
          role_permissions: Number(scalar(db, "SELECT COUNT(*) FROM role_permissions") || 0),
          organizations: Number(scalar(db, "SELECT COUNT(*) FROM organizations") || 0),
          exchange_datasets: Number(scalar(db, "SELECT COUNT(*) FROM exchange_datasets") || 0)
        }
      };
    },
    enqueue({ id, entityType, operation, payload, createdAt, idempotencyKey, maxRetries = DEFAULT_MAX_RETRIES, conflictKey }) {
      if (maxRetries < 0 || !Number.isInteger(maxRetries)) throw new Error("maxRetries must be a non-negative integer");
      if (idempotencyKey) {
        const existing = db.exec("SELECT id, status, retry_count FROM offline_queue WHERE idempotency_key=? LIMIT 1", [idempotencyKey]);
        if (existing[0]?.values?.[0]) {
          const [existingId, status, retryCount] = existing[0].values[0];
          return { id: existingId, status, retryCount, duplicate: true };
        }
      }
      const resolvedId = id || cryptoRandomId();
      db.run("INSERT INTO offline_queue(id, entity_type, operation, payload_json, status, created_at, synced_at, error_message, idempotency_key, retry_count, max_retries, last_attempt_at, next_retry_at, conflict_key, error_code) VALUES (?, ?, ?, ?, 'PENDING', ?, NULL, NULL, ?, 0, ?, NULL, NULL, ?, NULL)", [
        resolvedId, entityType, operation, JSON.stringify(payload), createdAt, idempotencyKey || resolvedId, maxRetries, conflictKey || null
      ]);
      persist(db, dbPath);
      return { id: resolvedId, status: "PENDING", duplicate: false };
    },
    listQueue({ status = null, limit = 100 } = {}) {
      const sql = status
        ? "SELECT id, entity_type, operation, payload_json, status, created_at, synced_at, error_message, idempotency_key, retry_count, max_retries, last_attempt_at, next_retry_at, conflict_key, error_code FROM offline_queue WHERE status=? ORDER BY created_at ASC, id ASC LIMIT ?"
        : "SELECT id, entity_type, operation, payload_json, status, created_at, synced_at, error_message, idempotency_key, retry_count, max_retries, last_attempt_at, next_retry_at, conflict_key, error_code FROM offline_queue ORDER BY created_at ASC, id ASC LIMIT ?";
      const result = status ? db.exec(sql, [status, limit]) : db.exec(sql, [limit]);
      return rows(result);
    },
    recoverStaleProcessing({ staleAfterMs = 15 * 60 * 1000 } = {}) {
      const cutoff = new Date(Date.now() - staleAfterMs).toISOString();
      db.run("UPDATE offline_queue SET status='PENDING', next_retry_at=NULL, error_message='Recovered stale PROCESSING item', error_code='STALE_PROCESSING' WHERE status='PROCESSING' AND last_attempt_at IS NOT NULL AND last_attempt_at < ?", [cutoff]);
      persist(db, dbPath);
    },
    markQueueProcessing(id) {
      const now = new Date().toISOString();
      db.run("UPDATE offline_queue SET status='PROCESSING', last_attempt_at=?, error_code=NULL WHERE id=? AND status='PENDING' AND (next_retry_at IS NULL OR next_retry_at<=?)", [now, id, now]);
      persist(db, dbPath);
    },
    markQueueSynced(id) {
      db.run("UPDATE offline_queue SET status='SYNCED', synced_at=?, error_message=NULL, error_code=NULL, next_retry_at=NULL WHERE id=?", [new Date().toISOString(), id]);
      persist(db, dbPath);
    },
    markQueueFailed(id, error, { retryable = true, retryDelayMs = 0 } = {}) {
      const message = error instanceof Error ? error.message : String(error);
      const code = error?.code || (retryable ? "SYNC_RETRYABLE" : "SYNC_NON_RETRYABLE");
      const current = db.exec("SELECT retry_count, max_retries FROM offline_queue WHERE id=? LIMIT 1", [id]);
      const row = current[0]?.values?.[0];
      if (!row) throw new Error("Queue item not found: " + id);
      const retryCount = Number(row[0]) + 1;
      const maxRetries = Number(row[1]);
      const exhausted = !retryable || retryCount >= maxRetries;
      const status = exhausted ? "DEAD_LETTER" : "PENDING";
      const nextRetryAt = status === "PENDING" ? new Date(Date.now() + Math.max(0, retryDelayMs)).toISOString() : null;
      db.run("UPDATE offline_queue SET status=?, retry_count=?, error_message=?, error_code=?, next_retry_at=? WHERE id=?", [status, retryCount, message, code, nextRetryAt, id]);
      persist(db, dbPath);
      return { id, status, retryCount, maxRetries, retryable, exhausted, nextRetryAt };
    },
    close() { persist(db, dbPath); db.close(); }
  };
}

function migrateQueueSchema(db) {
  const columns = new Set((db.exec("PRAGMA table_info(offline_queue)")[0]?.values || []).map((row) => row[1]));
  const additions = [
    ["idempotency_key", "TEXT"],
    ["retry_count", "INTEGER NOT NULL DEFAULT 0"],
    ["max_retries", "INTEGER NOT NULL DEFAULT 3"],
    ["last_attempt_at", "TEXT"],
    ["next_retry_at", "TEXT"],
    ["conflict_key", "TEXT"],
    ["error_code", "TEXT"]
  ];
  for (const [name, definition] of additions) {
    if (!columns.has(name)) db.run("ALTER TABLE offline_queue ADD COLUMN " + name + " " + definition);
  }
  db.run("UPDATE offline_queue SET idempotency_key=id WHERE idempotency_key IS NULL");
}

function seedDatabase(db, seedPath) {
  if (!fs.existsSync(seedPath)) throw new Error("Offline seed not found: " + seedPath);
  const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  db.run("CREATE TABLE IF NOT EXISTS platform_core (id TEXT PRIMARY KEY, platform_name TEXT, platform_version TEXT, environment TEXT, created_at TEXT);");
  db.run("CREATE TABLE IF NOT EXISTS territories (id TEXT PRIMARY KEY, parent_id TEXT, territory_type TEXT, code TEXT, name TEXT, active INTEGER, created_at TEXT);");
  db.run("CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, role_code TEXT, role_name TEXT, critical INTEGER, created_at TEXT);");
  db.run("CREATE TABLE IF NOT EXISTS permissions (id TEXT PRIMARY KEY, permission_code TEXT, permission_name TEXT, critical INTEGER, created_at TEXT);");
  db.run("CREATE TABLE IF NOT EXISTS role_permissions (role_id TEXT NOT NULL, permission_id TEXT NOT NULL, created_at TEXT, PRIMARY KEY(role_id, permission_id));");
  db.run("CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, organization_type TEXT, name TEXT, territory_id TEXT, active INTEGER, created_at TEXT);");
  db.run("CREATE TABLE IF NOT EXISTS exchange_datasets (id TEXT PRIMARY KEY, dataset_code TEXT, dataset_name TEXT, source_system TEXT, consumer_system TEXT, classification TEXT, purpose TEXT, active INTEGER, created_at TEXT);");
  insertRows(db, "platform_core", seed.platform_core, ["id","platform_name","platform_version","environment","created_at"]);
  insertRows(db, "territories", seed.territories, ["id","parent_id","territory_type","code","name","active","created_at"]);
  insertRows(db, "roles", seed.roles, ["id","role_code","role_name","critical","created_at"]);
  insertRows(db, "permissions", seed.permissions, ["id","permission_code","permission_name","critical","created_at"]);
  insertRows(db, "role_permissions", seed.role_permissions, ["role_id","permission_id","created_at"]);
  insertRows(db, "organizations", seed.organizations, ["id","organization_type","name","territory_id","active","created_at"]);
  insertRows(db, "exchange_datasets", seed.exchange_datasets, ["id","dataset_code","dataset_name","source_system","consumer_system","classification","purpose","active","created_at"]);
}

function insertRows(db, table, rows, columns) {
  const placeholders = columns.map(() => "?").join(",");
  const sql = "INSERT OR IGNORE INTO " + table + "(" + columns.join(",") + ") VALUES (" + placeholders + ")";
  for (const row of rows || []) db.run(sql, columns.map((column) => row[column] ?? null));
}
function scalar(db, sql) { const result = db.exec(sql); return result[0]?.values?.[0]?.[0] ?? null; }
function rows(result) {
  const table = result[0];
  if (!table) return [];
  return table.values.map((values) => Object.fromEntries(table.columns.map((column, index) => [column, values[index]])))
    .map((row) => ({
      id: row.id,
      entityType: row.entity_type,
      operation: row.operation,
      payload: JSON.parse(row.payload_json),
      status: row.status,
      createdAt: row.created_at,
      syncedAt: row.synced_at,
      errorMessage: row.error_message,
      idempotencyKey: row.idempotency_key,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      lastAttemptAt: row.last_attempt_at,
      nextRetryAt: row.next_retry_at,
      conflictKey: row.conflict_key,
      errorCode: row.error_code
    }));
}
function persist(db, dbPath) { fs.writeFileSync(dbPath, Buffer.from(db.export())); }
function cryptoRandomId() {
  return require("crypto").randomUUID();
}
module.exports = { openLocalDatabase, SCHEMA_VERSION, DEFAULT_MAX_RETRIES };
