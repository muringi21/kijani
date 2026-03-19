/**
 * db.js — SQLite persistence layer using better-sqlite3
 *
 * Stores batches + hides in two tables. Synchronous API (better-sqlite3),
 * so no need for async/await on DB calls — keeps things simple for MVP.
 */
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "kijani.db");

const db = new Database(DB_PATH);

// ── WAL mode for better concurrent read/write ───────────────
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS batches (
    id           TEXT PRIMARY KEY,
    tenant_id    TEXT NOT NULL,
    agent_id     TEXT NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'hides',
    gps_lat      REAL,
    gps_lng      REAL,
    captured_at  TEXT NOT NULL,
    uploaded_at  TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS hides (
    rowid    INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL REFERENCES batches(id),
    qr_code  TEXT NOT NULL,
    weight   REAL,
    grade    TEXT,
    species  TEXT,
    note     TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_hides_batch ON hides(batch_id);
  CREATE INDEX IF NOT EXISTS idx_batches_tenant ON batches(tenant_id);
`);

// ── Prepared statements ─────────────────────────────────────
const insertBatch = db.prepare(`
  INSERT INTO batches (id, tenant_id, agent_id, product_type, gps_lat, gps_lng, captured_at, uploaded_at)
  VALUES (@id, @tenantId, @agentId, @productType, @gpsLat, @gpsLng, @capturedAt, @uploadedAt)
`);

const insertHide = db.prepare(`
  INSERT INTO hides (batch_id, qr_code, weight, grade, species, note)
  VALUES (@batchId, @qrCode, @weight, @grade, @species, @note)
`);

const selectBatches = db.prepare(`
  SELECT * FROM batches ORDER BY created_at DESC LIMIT ?
`);

const selectBatchById = db.prepare(`
  SELECT * FROM batches WHERE id = ?
`);

const selectHidesByBatch = db.prepare(`
  SELECT * FROM hides WHERE batch_id = ?
`);

// ── Public API ──────────────────────────────────────────────

/**
 * Insert a validated batch + its hides inside a transaction.
 * @param {import("@kijani/shared").Batch} batch
 */
export function saveBatch(batch) {
  const txn = db.transaction((b) => {
    insertBatch.run({
      id:          b.id,
      tenantId:    b.tenantId,
      agentId:     b.agentId,
      productType: b.productType,
      gpsLat:      b.gps?.lat ?? null,
      gpsLng:      b.gps?.lng ?? null,
      capturedAt:  b.capturedAt,
      uploadedAt:  b.uploadedAt ?? new Date().toISOString(),
    });
    for (const h of b.hides) {
      insertHide.run({
        batchId: b.id,
        qrCode:  h.qrCode,
        weight:  h.weight ?? null,
        grade:   h.grade ?? null,
        species: h.species ?? null,
        note:    h.note ?? null,
      });
    }
  });
  txn(batch);
}

/**
 * Save multiple batches atomically.
 * @param {import("@kijani/shared").Batch[]} batches
 */
export function saveBatches(batches) {
  const txn = db.transaction((list) => {
    for (const b of list) saveBatch(b);
  });
  txn(batches);
}

/**
 * List recent batches (without hides — keep list endpoint light).
 */
export function listBatches(limit = 50) {
  return selectBatches.all(limit);
}

/**
 * Get a single batch by ID, including its hides array.
 * Returns null if not found.
 */
export function getBatchById(id) {
  const row = selectBatchById.get(id);
  if (!row) return null;
  const hides = selectHidesByBatch.all(id);
  return { ...row, hides };
}

export default db;