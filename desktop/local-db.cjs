const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");

const SCHEMA_VERSION = 1;

async function openLocalDatabase({ userDataPath, seedPath }) {
  const dataDir = path.join(userDataPath, "data");
  const dbPath = path.join(dataDir, "rt-rw-sid-connect.sqlite");
  fs.mkdirSync(dataDir, { recursive: true });
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, "node_modules", "sql.js", "dist", file)
  });
  const db = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database();
  db.run("CREATE TABLE IF NOT EXISTS local_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);");
  db.run("CREATE TABLE IF NOT EXISTS offline_queue (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, operation TEXT NOT NULL, payload_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', created_at TEXT NOT NULL, synced_at TEXT, error_message TEXT);");
  const version = scalar(db, "SELECT value FROM local_meta WHERE key='schema_version'");
  if (!version) {
    seedDatabase(db, seedPath);
    db.run("INSERT OR REPLACE INTO local_meta(key,value) VALUES ('schema_version', ?)", [String(SCHEMA_VERSION)]);
    db.run("INSERT OR REPLACE INTO local_meta(key,value) VALUES ('seed_package', ?)", ["supabase-snapshot-v1.0"]);
    persist(db, dbPath);
  } else if (Number(version) !== SCHEMA_VERSION) {
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
        queueFailed: Number(scalar(db, "SELECT COUNT(*) FROM offline_queue WHERE status='FAILED'") || 0),
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
    enqueue({ id, entityType, operation, payload, createdAt }) {
      db.run("INSERT INTO offline_queue(id, entity_type, operation, payload_json, status, created_at, synced_at, error_message) VALUES (?, ?, ?, ?, 'PENDING', ?, NULL, NULL)", [
        id, entityType, operation, JSON.stringify(payload), createdAt
      ]);
      persist(db, dbPath);
      return { id, status: "PENDING" };
    },
    listQueue({ status = null, limit = 100 } = {}) {
      const sql = status
        ? "SELECT id, entity_type, operation, payload_json, status, created_at, synced_at, error_message FROM offline_queue WHERE status=? ORDER BY created_at ASC, id ASC LIMIT ?"
        : "SELECT id, entity_type, operation, payload_json, status, created_at, synced_at, error_message FROM offline_queue ORDER BY created_at ASC, id ASC LIMIT ?";
      const result = status ? db.exec(sql, [status, limit]) : db.exec(sql, [limit]);
      return rows(result);
    },
    markQueueProcessing(id) {
      db.run("UPDATE offline_queue SET status='PROCESSING' WHERE id=? AND status='PENDING'", [id]);
      persist(db, dbPath);
    },
    markQueueSynced(id) {
      db.run("UPDATE offline_queue SET status='SYNCED', synced_at=?, error_message=NULL WHERE id=?", [new Date().toISOString(), id]);
      persist(db, dbPath);
    },
    markQueueFailed(id, error) {
      const message = error instanceof Error ? error.message : String(error);
      db.run("UPDATE offline_queue SET status='FAILED', error_message=? WHERE id=?", [message, id]);
      persist(db, dbPath);
    },
    close() { persist(db, dbPath); db.close(); }
  };
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
      errorMessage: row.error_message
    }));
}
function persist(db, dbPath) { fs.writeFileSync(dbPath, Buffer.from(db.export())); }
module.exports = { openLocalDatabase, SCHEMA_VERSION };