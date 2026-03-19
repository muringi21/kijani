import { z } from "zod";

// ── Core enums ──────────────────────────────────────────────
export const HideGrade = z.enum(["A", "B", "C", "reject"]);
export const ProductType = z.enum(["hides", "skins"]);

// ── Single‑hide record (captured by agent in the field) ─────
export const HideSchema = z.object({
  qrCode:    z.string().min(1, "QR code required"),
  weight:    z.number().positive().optional(),
  grade:     HideGrade.optional(),
  species:   z.string().optional(),
  note:      z.string().max(500).optional(),
});

// ── Batch = one upload from an agent ────────────────────────
export const BatchSchema = z.object({
  id:          z.string().uuid(),
  tenantId:    z.string().min(1),
  agentId:     z.string().min(1),
  productType: ProductType.default("hides"),
  hides:       z.array(HideSchema).min(1),
  gps:         z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  capturedAt:  z.string().datetime(),
  uploadedAt:  z.string().datetime().optional(),
});
