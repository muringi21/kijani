/**
 * App configuration — change API_BASE_URL per environment.
 *
 *   iOS Simulator   → http://localhost:3333
 *   Android Emulator → http://10.0.2.2:3333
 *   Physical device  → http://<your-laptop-ip>:3333
 */
export const CONFIG = {
  API_BASE_URL: "http://localhost:3333",
  API_KEY: "dev-key-change-me",

  TENANT_ID: "demo-tenant",
  AGENT_ID: "agent-01",
  PRODUCT_TYPE: "hides",

  // Auto‑flush interval (ms) — every 5 min
  FLUSH_INTERVAL_MS: 5 * 60 * 1000,
};
