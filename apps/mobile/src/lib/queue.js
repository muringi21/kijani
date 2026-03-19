/**
 * queue.js — Offline batch queue backed by AsyncStorage
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "KIJANI_QUEUE_V2";

/** Get all queued batches. */
export async function getQueue() {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

/** Add a batch to the queue. Returns updated queue. */
export async function enqueue(batch) {
  const q = await getQueue();
  q.push(batch);
  await AsyncStorage.setItem(KEY, JSON.stringify(q));
  return q;
}

/** Overwrite the entire queue (used after a successful flush). */
export async function setQueue(items) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

/** Remove all items from the queue. */
export async function clearQueue() {
  await AsyncStorage.removeItem(KEY);
}
