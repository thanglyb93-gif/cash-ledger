import { createClient } from "@/lib/supabase/server";
import { AccountBalanceCard } from "@/components/accounts/AccountBalanceCard";
import { NewAccountForm } from "@/components/accounts/NewAccountForm";

export default async function AccountsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const supabase = await createClient();

  const [{ data: org }, { data: accounts }, { data: balances }] = await Promise.all([
    supabase.from("orgs").select("base_currency").eq("id", orgId).single(),
    supabase
      .from("money_accounts")
      .select("id, name, type, currency, bank_name, account_number_last4, is_active")
      .eq("org_id", orgId)
      .order("created_at"),
    supabase.rpc("get_account_balances", { p_org_id: orgId }),
  ]);

  const balanceByAccount = new Map((balances ?? []).map((b) => [b.money_account_id, b.balance]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Money accounts</h1>
        <NewAccountForm orgId={orgId} baseCurrency={org?.base_currency ?? "VND"} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(accounts ?? [])
          .filter((a) => a.is_active)
          .map((a) => (
            <AccountBalanceCard
              key={a.id}
              name={a.name}
              type={a.type}
              currency={a.currency}
              balance={balanceByAccount.get(a.id) ?? 0}
              bankName={a.bank_name}
              last4={a.account_number_last4}
            />
          ))}
        {(accounts ?? []).length === 0 && (
          <p className="text-sm text-zinc-500">No accounts yet. Add your first cash drawer or bank account.</p>
        )}
      </div>
    </div>
  );
}
