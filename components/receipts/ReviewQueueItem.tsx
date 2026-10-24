"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ExtractionStatus } from "@/types/database";
import type { ReceiptExtraction } from "@/lib/validations/receipt-extraction";
import { DuplicateWarning } from "@/components/receipts/DuplicateWarning";

const LOW_CONFIDENCE_THRESHOLD = 0.6;

interface MoneyAccount {
  id: string;
  name: string;
  type: string;
  currency: string;
}

interface Category {
  id: string;
  name: string;
  kind: string;
}

function fieldClass(confidence: Record<string, number> | undefined, field: string) {
  const score = confidence?.[field];
  if (score !== undefined && score < LOW_CONFIDENCE_THRESHOLD) {
    return "rounded-md border border-amber-400 bg-amber-50 px-3 py-2";
  }
  return "rounded-md border border-zinc-300 px-3 py-2";
}

export function ReviewQueueItem({
  documentId,
  orgId,
  imageUrl,
  mime,
  extraction,
  extractionStatus,
  baseCurrency,
  moneyAccounts,
  categories,
}: {
  documentId: string;
  orgId: string;
  imageUrl: string | null;
  mime: string;
  extraction: ReceiptExtraction | null;
  extractionStatus: ExtractionStatus;
  baseCurrency: string;
  moneyAccounts: MoneyAccount[];
  categories: Category[];
}) {
  const router = useRouter();
  const confidence = extraction?.confidence;

  const [direction, setDirection] = useState<"out" | "in">("out");
  const [txnDate, setTxnDate] = useState(extraction?.date ?? new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(extraction?.total != null ? String(extraction.total) : "");
  const [currency, setCurrency] = useState(extraction?.currency ?? baseCurrency);
  const [moneyAccountId, setMoneyAccountId] = useState(moneyAccounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [vendorName, setVendorName] = useState(extraction?.vendor_name ?? "");
  const [reference, setReference] = useState(extraction?.invoice_number ?? "");
  const [vatAmount, setVatAmount] = useState(extraction?.vat_amount != null ? String(extraction.vat_amount) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{ txn_date: string } | null>(null);

  const description =
    extraction?.line_items
      ?.map((li) => li.description)
      .filter(Boolean)
      .join(", ") || vendorName;

  async function submit(confirmDuplicate: boolean) {
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/receipts/${documentId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_id: orgId,
        txn_date: txnDate,
        direction,
        amount,
        currency,
        money_account_id: moneyAccountId,
        category_id: categoryId || undefined,
        counterparty_name: vendorName || undefined,
        description: description || undefined,
        reference: reference || undefined,
        vat_amount: vatAmount || undefined,
        confirm_duplicate: confirmDuplicate,
      }),
    });

    if (res.status === 409) {
      const json = await res.json();
      setDuplicateWarning(json.duplicate);
      setSubmitting(false);
      return;
    }

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(typeof json.error === "string" ? json.error : "Could not confirm receipt");
      setSubmitting(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        {imageUrl && mime !== "application/pdf" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Receipt" className="max-h-96 w-full rounded-md border border-zinc-200 object-contain" />
        ) : imageUrl ? (
          <a href={imageUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">
            View PDF
          </a>
        ) : (
          <p className="text-sm text-zinc-400">No preview available</p>
        )}
        {extractionStatus === "pending" && <p className="text-xs text-zinc-500">Extraction still running...</p>}
        {extractionStatus === "failed" && (
          <p className="text-xs text-red-600">Automatic extraction failed. Fill in the fields manually.</p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
        className="flex flex-col gap-3"
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDirection("out")}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              direction === "out" ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            Money out
          </button>
          <button
            type="button"
            onClick={() => setDirection("in")}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              direction === "in" ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            Money in
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Vendor
          <input
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            className={fieldClass(confidence, "vendor_name")}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Date
            <input
              type="date"
              value={txnDate}
              onChange={(e) => setTxnDate(e.target.value)}
              className={fieldClass(confidence, "date")}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Total
            <div className="flex gap-1">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`min-w-0 flex-1 ${fieldClass(confidence, "total")}`}
              />
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-md border border-zinc-300 px-2">
                <option value="VND">VND</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Paid from
          <select value={moneyAccountId} onChange={(e) => setMoneyAccountId(e.target.value)} className="rounded-md border border-zinc-300 px-3 py-2">
            {moneyAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Category
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rounded-md border border-zinc-300 px-3 py-2">
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Invoice / reference no.
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={fieldClass(confidence, "invoice_number")}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            VAT amount
            <input
              value={vatAmount}
              onChange={(e) => setVatAmount(e.target.value)}
              className={fieldClass(confidence, "vat_amount")}
            />
          </label>
        </div>

        {duplicateWarning && (
          <DuplicateWarning
            txnDate={duplicateWarning.txn_date}
            onConfirm={() => submit(true)}
            onCancel={() => setDuplicateWarning(null)}
          />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !moneyAccountId}
          className="rounded-md bg-zinc-900 px-4 py-3 text-base font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {submitting ? "Confirming..." : "Confirm transaction"}
        </button>
      </form>
    </div>
  );
}
