"use client";

import { useState } from "react";
import { createMoneyAccountAction } from "@/app/(org)/[orgId]/accounts/actions";

export function NewAccountForm({ orgId, baseCurrency }: { orgId: string; baseCurrency: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        + Add account
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await createMoneyAccountAction(orgId, formData);
        setOpen(false);
      }}
      className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <label className="col-span-2 flex flex-col gap-1 text-sm">
        Name
        <input name="name" required className="rounded-md border border-zinc-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Type
        <select name="type" required className="rounded-md border border-zinc-300 px-3 py-2">
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
          <option value="credit_card">Credit card</option>
          <option value="owner_funds">Owner funds</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Currency
        <select name="currency" defaultValue={baseCurrency} className="rounded-md border border-zinc-300 px-3 py-2">
          <option value="VND">VND</option>
          <option value="USD">USD</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Bank name (optional)
        <input name="bank_name" className="rounded-md border border-zinc-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Last 4 digits (optional)
        <input name="account_number_last4" maxLength={4} className="rounded-md border border-zinc-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Opening balance
        <input name="opening_balance" defaultValue="0" inputMode="decimal" className="rounded-md border border-zinc-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Opening date
        <input
          type="date"
          name="opening_date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <div className="col-span-2 flex gap-2">
        <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          Save account
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
