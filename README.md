#Kijani Traceability
Kijani is a leather supply chain traceability platform I've been building for the Kenyan market. Field agents use the mobile app to scan QR-tagged hides, log weight/grade/species, and batch-upload records to the API — even offline. Tanneries can then look up any hide's provenance by scanning its QR code.

This repo is the MVP monorepo: a Fastify REST API backed by SQLite, and an Expo React Native agent app.

Status
Active development — core batch upload and offline queue are working. Next: multi-tenant auth and Postgres migration.

Packages
Package	Tech	Purpose
apps/api	Fastify + SQLite	REST API — batch upload, list, single-batch lookup
apps/mobile	Expo React Native	Agent app — QR scan, offline queue, GPS, batched uploads
packages/shared	Zod	Shared BatchSchema used by both API and mobile
Prerequisites
Node.js 18+

npm 9+ (workspaces)

Expo Go on your phone (for mobile dev), or an iOS/Android simulator

Quick Start
bash
# 1. Install all workspaces
npm install

# 2. Copy & edit the API env file
cp apps/api/.env.example apps/api/.env

# 3. Start the API (Terminal 1)
npm run dev:api

# 4. Start Expo (Terminal 2)
npm run dev:mobile
Physical device? Edit apps/mobile/src/config.js and set API_BASE_URL to your laptop's local IP (e.g. http://192.168.1.50:3333).

API Endpoints
All endpoints except /health require the x-api-key header.

Method	Path	Description
GET	/health	Liveness check (no auth)
POST	/v1/batches	Upload one batch or array of batches
GET	/v1/batches?limit=50	List recent batches
GET	/v1/batches/:id	Single batch + hides (QR provenance lookup)
Example — upload a batch:

bash
curl -X POST http://localhost:3333/v1/batches \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key-change-me" \
  -d '{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tenantId": "demo-tenant",
    "agentId": "agent-01",
    "productType": "hides",
    "hides": [
      { "qrCode": "KJ-001", "weight": 12.5, "grade": "A", "species": "cattle" }
    ],
    "capturedAt": "2026-03-19T10:00:00.000Z"
  }'
Mobile App Screens
Main (Agent) — Scan QR tags, enter weight/grade/species, build a batch, save offline, upload when connected

Scan — Camera-based QR/barcode scanner (capture mode for agents, lookup mode for tanneries)

Batch Detail — Provenance view: all hide records, GPS coords, timestamps

Architecture Notes
SQLite (better-sqlite3): zero-config for MVP. Plan to migrate to Postgres/Supabase before scaling to multiple tenants

API key auth: simple x-api-key header for the pilot. Will swap to JWT when multi-tenant support is added

Offline-first: batches saved to AsyncStorage immediately on the device. Auto-flush every 5 min + manual "Upload Now"

Partial-success uploads: if some batches in an array fail validation, valid ones still save. Failed indices are returned so the client retries only those

Duplicate protection: batch IDs are UUIDs generated on the phone; the DB rejects duplicate inserts gracefully

Project Structure
text
kijani/
├── package.json              # root workspace config
├── apps/
│   ├── api/
│   │   ├── server.js         # Fastify routes + auth hook
│   │   ├── db.js             # SQLite schema + queries
│   │   ├── .env.example
│   │   └── package.json
│   └── mobile/
│       ├── App.js            # navigation stack
│       ├── index.js          # entry point
│       ├── app.json          # Expo config (permissions)
│       ├── metro.config.js   # monorepo resolution
│       └── src/
│           ├── config.js     # API URL, keys, intervals
│           ├── lib/
│           │   ├── queue.js  # AsyncStorage offline queue
│           │   └── api.js    # HTTP client + flush logic
│           └── screens/
│               ├── MainScreen.js
│               ├── ScanScreen.js
│               └── BatchDetailScreen.js
└── packages/
    └── shared/
        └── src/index.js      # Zod BatchSchema + HideSchema