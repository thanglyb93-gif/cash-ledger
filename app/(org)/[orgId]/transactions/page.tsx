import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { EvidenceBadge } from "@/components/transactions/EvidenceBadge";
import type { EvidenceStatus } from "@/types/database";

const EVIDENCE_STATUSES: EvidenceStatus[] = ["attached", "missing", "not_required"];

export default async function TransactionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{
    month?: string;
    account?: string;
    category?: string;
    evidence?: string;
  }>;
}) {
  const { orgId } = await params;
  const filters = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("transactions")
    .select(
      "id, txn_date, direction, amount, currency, description, status, evidence_status, money_account:money_accounts(name), category:categories(name), counterparty:counterparties(name)"
    )
    .eq("org_id", orgId)
    .neq("status", "void")
    .order("txn_date", { ascending: false })
    .limit(200);

  if (filters.month) {
    const [year, month] = filters.month.split("-").map(Number);
    const start = `${filters.month}-01`;
    const end = new Date(year, month, 1).toISOString().slice(0, 10);
    query = query.gte("txn_date", start).lt("txn_date", end);
  }
  if (filters.account) query = query.eq("money_account_id", filters.account);
  if (filters.category) query = query.eq("category_id", filters.category);
  if (filters.evidence && EVIDENCE_STATUSES.includes(filters.evidence as EvidenceStatus)) {
    query = query.eq("evidence_status", filters.evidence as EvidenceStatus);
  }

  const [{ data: transactions }, { data: accounts }, { data: categories }] = await Promise.all([
    query,
    supabase.from("money_accounts").select("id, name").eq("org_id", orgId).eq("is_active", true),
    supabase.from("categories").select("id, name").eq("org_id", orgId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Transactions</h1>
        <Link
          href={`/${orgId}/transactions/new`}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + New transaction
        </Link>
      </div>

      <form className="flex flex-wrap gap-2 text-sm" method="GET">
        <input
          type="month"
          name="month"
          defaultValue={filters.month}
          className="rounded-md border border-zinc-300 px-2 py-1"
        />
        <select name="account" defaultValue={filters.account ?? ""} className="rounded-md border border-zinc-300 px-2 py-1">
          <option value="">All accounts</option>
          {(accounts ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select name="category" defaultValue={filters.category ?? ""} className="rounded-md border border-zinc-300 px-2 py-1">
          <option value="">All categories</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="evidence" defaultValue={filters.evidence ?? ""} className="rounded-md border border-zinc-300 px-2 py-1">
          <option value="">Any evidence</option>
          <option value="missing">Missing</option>
          <option value="attached">Attached</option>
          <option value="not_required">Not required</option>
        </select>
        <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-100">
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(transactions ?? []).map((t) => {
              const moneyAccount = Array.isArray(t.money_account) ? t.money_account[0] : t.money_account;
              const category = Array.isArray(t.category) ? t.category[0] : t.category;
              const counterparty = Array.isArray(t.counterparty) ? t.counterparty[0] : t.counterparty;
              return (
                <tr key={t.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 whitespace-nowrap">{t.txn_date}</td>
                  <td className="px-3 py-2">
                    <Link href={`/${orgId}/transactions/${t.id}`} className="hover:underline">
                      {t.description || counterparty?.name || "—"}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-zinc-600">{category?.name ?? "Uncategorized"}</td>
                  <td className="px-3 py-2 text-zinc-600">{moneyAccount?.name}</td>
                  <td
                    className={`px-3 py-2 text-right font-medium whitespace-nowrap ${
                      t.direction === "out" ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {t.direction === "out" ? "-" : "+"}
                    {formatMoney(t.amount, t.currency)}
                  </td>
                  <td className="px-3 py-2">
                    <EvidenceBadge status={t.evidence_status} />
                  </td>
                </tr>
              );
            })}
            {(transactions ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-zinc-400">
                  No transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
