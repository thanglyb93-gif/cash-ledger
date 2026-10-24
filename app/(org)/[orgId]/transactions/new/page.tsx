import { createClient } from "@/lib/supabase/server";
import { TransactionForm } from "@/components/transactions/TransactionForm";

export default async function NewTransactionPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const supabase = await createClient();

  const [{ data: org }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("orgs").select("base_currency").eq("id", orgId).single(),
    supabase
      .from("money_accounts")
      .select("id, name, type, currency")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("name"),
    supabase.from("categories").select("id, name, kind").eq("org_id", orgId).order("name"),
  ]);

  if (!accounts || accounts.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Add a money account before logging transactions.{" "}
        <a href={`/${orgId}/accounts`} className="font-medium underline">
          Go to Accounts
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">New transaction</h1>
      <TransactionForm
        orgId={orgId}
        baseCurrency={org?.base_currency ?? "VND"}
        moneyAccounts={accounts}
        categories={categories ?? []}
      />
    </div>
  );
}
