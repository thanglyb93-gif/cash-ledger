import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { EvidenceBadge } from "@/components/transactions/EvidenceBadge";
import { VoidButton } from "@/components/transactions/VoidButton";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; id: string }>;
}) {
  const { orgId, id } = await params;
  const supabase = await createClient();

  const { data: txn } = await supabase
    .from("transactions")
    .select(
      "id, txn_date, direction, amount, currency, description, reference, vat_amount, status, evidence_status, journal_entry_id, money_account:money_accounts(name, type), category:categories(name, gl_code), counterparty:counterparties(name)"
    )
    .eq("org_id", orgId)
    .eq("id", id)
    .single();

  if (!txn) notFound();

  const { data: documents } = await supabase
    .from("documents")
    .select("id, storage_path, mime, kind")
    .eq("linked_transaction_id", id);

  const { data: journalLines } = txn.journal_entry_id
    ? await supabase
        .from("journal_lines")
        .select("id, gl_account, debit, credit, currency")
        .eq("entry_id", txn.journal_entry_id)
    : { data: [] };

  const moneyAccount = Array.isArray(txn.money_account) ? txn.money_account[0] : txn.money_account;
  const category = Array.isArray(txn.category) ? txn.category[0] : txn.category;
  const counterparty = Array.isArray(txn.counterparty) ? txn.counterparty[0] : txn.counterparty;

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase text-zinc-400">{txn.txn_date}</p>
            <p
              className={`text-2xl font-semibold ${
                txn.direction === "out" ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {txn.direction === "out" ? "-" : "+"}
              {formatMoney(txn.amount, txn.currency)}
            </p>
          </div>
          <EvidenceBadge status={txn.evidence_status} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-zinc-500">Description</dt>
          <dd>{txn.description || "—"}</dd>
          <dt className="text-zinc-500">Category</dt>
          <dd>{category?.name ?? "Uncategorized"}</dd>
          <dt className="text-zinc-500">{txn.direction === "out" ? "Vendor" : "Customer"}</dt>
          <dd>{counterparty?.name ?? "—"}</dd>
          <dt className="text-zinc-500">Paid from</dt>
          <dd>{moneyAccount?.name}</dd>
          <dt className="text-zinc-500">Reference</dt>
          <dd>{txn.reference || "—"}</dd>
          {txn.vat_amount ? (
            <>
              <dt className="text-zinc-500">VAT</dt>
              <dd>{formatMoney(txn.vat_amount, txn.currency)}</dd>
            </>
          ) : null}
          <dt className="text-zinc-500">Status</dt>
          <dd className="capitalize">{txn.status}</dd>
        </dl>

        {txn.status !== "void" && <VoidButton orgId={orgId} txnId={txn.id} />}
      </div>

      {documents && documents.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">Evidence</h2>
          <ul className="space-y-1 text-sm text-zinc-600">
            {documents.map((d) => (
              <li key={d.id}>
                {d.kind} — {d.storage_path.split("/").pop()}
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="rounded-lg border border-zinc-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
          Accountant view (journal entry)
        </summary>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase text-zinc-400">
            <tr>
              <th className="py-1">GL account</th>
              <th className="py-1 text-right">Debit</th>
              <th className="py-1 text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            {(journalLines ?? []).map((line) => (
              <tr key={line.id} className="border-t border-zinc-100">
                <td className="py-1">{line.gl_account}</td>
                <td className="py-1 text-right">
                  {line.debit > 0 ? formatMoney(line.debit, line.currency) : ""}
                </td>
                <td className="py-1 text-right">
                  {line.credit > 0 ? formatMoney(line.credit, line.currency) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
