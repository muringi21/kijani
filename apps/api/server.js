/**
 * Kijani Traceability API — Fastify server
 *
 * Endpoints:
 *   GET  /health           → liveness check
 *   POST /v1/batches       → upload one or many batches
 *   GET  /v1/batches       → list recent batches
 *   GET  /v1/batches/:id   → single batch detail (for QR lookup)
 */
import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { BatchSchema } from "@kijani/shared";
import { saveBatch, listBatches, getBatchById } from "./db.js";

const app = Fastify({ logger: true });

// ── CORS ────────────────────────────────────────────────────
await app.register(cors, { origin: true });

// ── API‑key auth hook ───────────────────────────────────────
const API_KEY = process.env.KIJANI_API_KEY || "dev-key-change-me";

app.addHook("onRequest", async (req, reply) => {
  // Skip auth for health check
  if (req.url === "/health") return;

  const key = req.headers["x-api-key"];
  if (key !== API_KEY) {
    return reply.code(401).send({ error: "Invalid or missing API key" });
  }
});

// ── Global error handler ────────────────────────────────────
app.setErrorHandler((error, _req, reply) => {
  app.log.error(error);

  // Zod / validation errors bubble up as 400
  if (error.validation) {
    return reply.code(400).send({ error: "Validation failed", details: error.message });
  }

  // JSON parse errors
  if (error.statusCode === 400) {
    return reply.code(400).send({ error: "Bad request", details: error.message });
  }

  // Everything else → 500
  reply.code(500).send({ error: "Internal server error" });
});

// ── Routes ──────────────────────────────────────────────────

app.get("/health", async () => ({
  ok: true,
  service: "kijani-api",
  time: new Date().toISOString(),
}));

// Upload one batch OR an array of batches
app.post("/v1/batches", async (req, reply) => {
  const incoming = Array.isArray(req.body) ? req.body : [req.body];

  const saved = [];
  const errors = [];

  for (let i = 0; i < incoming.length; i++) {
    const parsed = BatchSchema.safeParse(incoming[i]);
    if (!parsed.success) {
      errors.push({ index: i, issues: parsed.error.flatten() });
      continue;                                   // skip bad items, save the rest
    }

    // Stamp upload time
    const batch = { ...parsed.data, uploadedAt: new Date().toISOString() };

    try {
      saveBatch(batch);
      saved.push(batch.id);
    } catch (err) {
      // Duplicate id → UNIQUE constraint → skip gracefully
      if (err.message?.includes("UNIQUE")) {
        errors.push({ index: i, issues: "Duplicate batch id — already stored" });
      } else {
        throw err; // unexpected DB error → let global handler catch it
      }
    }
  }

  const status = errors.length && !saved.length ? 400 : 200;
  return reply.code(status).send({
    ok: saved.length > 0,
    saved: saved.length,
    errors: errors.length ? errors : undefined,
  });
});

// List recent batches
app.get("/v1/batches", async (req) => {
  const limit = Math.min(Number(req.query?.limit ?? 50), 200);
  return listBatches(limit);
});

// Single batch by ID (tannery scans QR → looks up full provenance)
app.get("/v1/batches/:id", async (req, reply) => {
  const batch = getBatchById(req.params.id);
  if (!batch) return reply.code(404).send({ error: "Batch not found" });
  return batch;
});

// ── Start ───────────────────────────────────────────────────
const port = process.env.PORT ? Number(process.env.PORT) : 3333;
await app.listen({ port, host: "0.0.0.0" });