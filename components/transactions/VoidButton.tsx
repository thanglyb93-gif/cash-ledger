"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function VoidButton({ orgId, txnId }: { orgId: string; txnId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleVoid() {
    if (!confirm("Void this transaction? It will stay on record but no longer count.")) return;
    setLoading(true);
    await fetch(`/api/transactions/${txnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ void: true }),
    });
    router.push(`/${orgId}/transactions`);
    router.refresh();
  }

  return (
    <button
      onClick={handleVoid}
      disabled={loading}
      className="mt-4 w-full rounded-md border border-red-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "Voiding..." : "Void transaction"}
    </button>
  );
}
