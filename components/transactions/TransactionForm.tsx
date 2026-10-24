"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DuplicateWarning } from "@/components/receipts/DuplicateWarning";

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

interface Counterparty {
  id: string;
  name: string;
  default_category_id: string | null;
}

export function TransactionForm({
  orgId,
  baseCurrency,
  moneyAccounts,
  categories,
}: {
  orgId: string;
  baseCurrency: string;
  moneyAccounts: MoneyAccount[];
  categories: Category[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [direction, setDirection] = useState<"out" | "in">("out");
  const [txnDate, setTxnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(baseCurrency);
  const [moneyAccountId, setMoneyAccountId] = useState(moneyAccounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [counterpartyQuery, setCounterpartyQuery] = useState("");
  const [counterpartyId, setCounterpartyId] = useState<string | null>(null);
  const [counterpartySuggestions, setCounterpartySuggestions] = useState<Counterparty[]>([]);
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    id: string;
    txn_date: string;
  } | null>(null);

  async function searchCounterparties(q: string) {
    setCounterpartyQuery(q);
    setCounterpartyId(null);
    if (q.trim().length < 2) {
      setCounterpartySuggestions([]);
      return;
    }
    const res = await fetch(`/api/counterparties/search?orgId=${orgId}&q=${encodeURIComponent(q)}`);
    const json = await res.json();
    setCounterpartySuggestions(json.counterparties ?? []);
  }

  function pickCounterparty(c: Counterparty) {
    setCounterpartyId(c.id);
    setCounterpartyQuery(c.name);
    setCounterpartySuggestions([]);
    if (c.default_category_id) setCategoryId(c.default_category_id);
  }

  async function submit(confirmDuplicate: boolean) {
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/transactions", {
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
        counterparty_id: counterpartyId || undefined,
        counterparty_name: counterpartyId ? undefined : counterpartyQuery || undefined,
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
      setError(typeof json.error === "string" ? json.error : "Could not save transaction");
      setSubmitting(false);
      return;
    }

    const { id: txnId } = await res.json();
    const file = fileInputRef.current?.files?.[0];

    if (file) {
      const supabase = createClient();
      const path = `${orgId}/${txnId}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(path, file);

      if (!uploadError) {
        await supabase.from("documents").insert({
          org_id: orgId,
          storage_path: path,
          mime: file.type,
          kind: "other",
          extraction_status: "reviewed",
          linked_transaction_id: txnId,
        });
        await fetch(`/api/transactions/${txnId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evidence_status: "attached" }),
        });
      }
    }

    router.push(`/${orgId}/transactions`);
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4"
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

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            type="date"
            required
            value={txnDate}
            onChange={(e) => setTxnDate(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Amount
          <div className="flex gap-1">
            <input
              type="text"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-md border border-zinc-300 px-2"
            >
              <option value="VND">VND</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Paid from
        <select
          required
          value={moneyAccountId}
          onChange={(e) => setMoneyAccountId(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        >
          {moneyAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.type})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Category
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        >
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="relative flex flex-col gap-1 text-sm">
        {direction === "out" ? "Vendor" : "Customer"}
        <input
          type="text"
          value={counterpartyQuery}
          onChange={(e) => searchCounterparties(e.target.value)}
          placeholder="Search or type a new name"
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
        {counterpartySuggestions.length > 0 && (
          <ul className="absolute top-full z-10 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-md">
            {counterpartySuggestions.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => pickCounterparty(c)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        What was it for
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Reference / invoice no.
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          VAT amount (optional)
          <input
            type="text"
            inputMode="decimal"
            value={vatAmount}
            onChange={(e) => setVatAmount(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Attach receipt (optional)
        <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="text-sm" />
      </label>

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
        disabled={submitting}
        className="rounded-md bg-zinc-900 px-4 py-3 text-base font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Save transaction"}
      </button>
    </form>
  );
}
