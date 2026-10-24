import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { receiptExtractionSchema, type ReceiptExtraction } from "@/lib/validations/receipt-extraction";

const MODEL = "claude-sonnet-5-5";

const EXTRACTION_PROMPT = `You are extracting structured data from a receipt or invoice photo for a
small business in Vietnam. Receipts may be in Vietnamese or English, and handwritten receipts are
common. Return ONLY a JSON object matching this exact shape, with no extra commentary:

{
  "vendor_name": string | null,
  "vendor_tax_code": string | null,
  "invoice_number": string | null,
  "date": string | null,          // ISO yyyy-mm-dd if you can determine it, else null
  "currency": string | null,      // ISO 4217, e.g. "VND" or "USD"
  "subtotal": number | null,
  "vat_rate": number | null,      // as a percentage, e.g. 10 for 10%
  "vat_amount": number | null,
  "total": number | null,
  "line_items": [ { "description": string | null, "qty": number | null, "unit_price": number | null, "amount": number | null } ],
  "payment_method_hint": string | null,
  "confidence": { "<field name>": number }  // 0-1 confidence per top-level field you filled in
}

If a field is illegible or absent, use null rather than guessing. For handwritten receipts, lower the
confidence score for any field you had to infer rather than read directly.`;

function mediaTypeFor(mime: string): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  if (mime === "image/png" || mime === "image/webp" || mime === "image/gif") return mime;
  return "image/jpeg";
}

export async function extractReceipt(params: {
  fileBase64: string;
  mime: string;
}): Promise<ReceiptExtraction> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  if (params.mime === "application/pdf") {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: params.fileBase64 } },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });
    return parseResponse(response);
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaTypeFor(params.mime), data: params.fileBase64 },
          },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      },
    ],
  });
  return parseResponse(response);
}

function parseResponse(response: Anthropic.Message): ReceiptExtraction {
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content for receipt extraction");
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude response did not contain a JSON object");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return receiptExtractionSchema.parse(parsed);
}
