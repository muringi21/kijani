/**
 * api.js — Thin HTTP client for the Kijani backend
 */
import axios from "axios";
import { CONFIG } from "../config.js";
import { getQueue, clearQueue, setQueue } from "./queue.js";

const client = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: 15_000,
  headers: { "x-api-key": CONFIG.API_KEY },
});

/**
 * Upload all queued batches to the server.
 */
export async function flushQueue() {
  const queue = await getQueue();
  if (queue.length === 0) return { saved: 0, errors: 0, flushed: true };

  const { data } = await client.post("/v1/batches", queue);

  if (data.ok) {
    await clearQueue();
    return { saved: data.saved, errors: 0, flushed: true };
  }

  // Partial success: keep only the items that failed
  if (data.errors?.length) {
    const failedIndices = new Set(data.errors.map((e) => e.index));
    const remaining = queue.filter((_, i) => failedIndices.has(i));
    await setQueue(remaining);
    return { saved: data.saved, errors: data.errors.length, flushed: false };
  }

  return { saved: 0, errors: queue.length, flushed: false };
}

/**
 * Look up a single batch by ID (tannery / inspector use‑case).
 */
export async function fetchBatchById(id) {
  const { data } = await client.get(`/v1/batches/${id}`);
  return data;
}

export default client;
