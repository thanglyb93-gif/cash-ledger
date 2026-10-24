import { z } from "zod";

// Mirrors the JSON contract we ask Claude to fill in lib/claude.ts.
// Receipts are Vietnamese or English, often handwritten -- every field is optional
// and carries a confidence score so the Review Queue can highlight what to double-check.

export const confidenceSchema = z.record(z.string(), z.number().min(0).max(1));

export const lineItemSchema = z.object({
  description: z.string().nullable(),
  qty: z.number().nullable(),
  unit_price: z.number().nullable(),
  amount: z.number().nullable(),
});

export const receiptExtractionSchema = z.object({
  vendor_name: z.string().nullable(),
  vendor_tax_code: z.string().nullable(),
  invoice_number: z.string().nullable(),
  date: z.string().nullable(), // ISO yyyy-mm-dd when parseable
  currency: z.string().nullable(),
  subtotal: z.number().nullable(),
  vat_rate: z.number().nullable(),
  vat_amount: z.number().nullable(),
  total: z.number().nullable(),
  line_items: z.array(lineItemSchema).default([]),
  payment_method_hint: z.string().nullable(),
  confidence: confidenceSchema.default({}),
});

export type ReceiptExtraction = z.infer<typeof receiptExtractionSchema>;
