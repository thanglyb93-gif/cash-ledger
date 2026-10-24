import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";

function monthBounds(month: string) {
  const [year, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = new Date(year, m, 1).toISOString().slice(0, 10); // first day of next month
  return { start, end };
}

export default async function MonthlyReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { orgId } = await params;
  const { month = new Date().toISOString().slice(0, 7) } = await searchParams;
  const { start, end } = monthBounds(month);

  const supabase = await createClient();

  const [{ data: org }, { data: accounts }, { data: txns }] = await Promise.all([
    supabase.from("orgs").select("base_currency").eq("id", orgId).single(),
    supabase
      .from("money_accounts")
      .select("id, name, type, currency, opening_balance, opening_date")
      .eq("org_id", orgId)
      .eq("is_active", true),
    supabase
      .from("transactions")
      .select("id, txn_date, direction, amount, currency, money_account_id, category:categories(name, kind)")
      .eq("org_id", orgId)
      .neq("status", "void")
      .lt("txn_date", end),
  ]);

  const currency = org?.base_currency ?? "VND";
  const cashAccounts = (accounts ?? []).filter((a) => a.type === "cash" || a.type === "bank");
  const creditCardAccounts = (accounts ?? []).filter((a) => a.type === "credit_card");
  const cashAccountIds = new Set(cashAccounts.map((a) => a.id));
  const creditCardAccountIds = new Set(creditCardAccounts.map((a) => a.id));

  let openingCash = cashAccounts.reduce((sum, a) => sum + a.opening_balance, 0);
  const inByCategory = new Map<string, number>();
  const outByCategory = new Map<string, number>();
  let creditCardCharged = 0;

  for (const t of txns ?? []) {
    const sign = t.direction === "in" ? 1 : -1;
    const category = Array.isArray(t.category) ? t.category[0] : t.category;
    const categoryName = category?.name ?? "Uncategorized";

    if (cashAccountIds.has(t.money_account_id)) {
      if (t.txn_date < start) {
        openingCash += sign * t.amount;
      } else {
        const bucket = t.direction === "in" ? inByCategory : outByCategory;
        bucket.set(categoryName, (bucket.get(categoryName) ?? 0) + t.amount);
      }
    } else if (creditCardAccountIds.has(t.money_account_id) && t.direction === "out" && t.txn_date >= start) {
      creditCardCharged += t.amount;
    }
  }
  const closingCash =
    openingCash +
    [...inByCategory.values()].reduce((a, b) => a + b, 0) -
    [...outByCategory.values()].reduce((a, b) => a + b, 0);

  const totalIn = [...inByCategory.values()].reduce((a, b) => a + b, 0);
  const totalOut = [...outByCategory.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Monthly cash summary</h1>
        <form method="GET" className="flex items-center gap-2">
          <input type="month" name="month" defaultValue={month} className="rounded-md border border-zinc-300 px-2 py-1 text-sm" />
          <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100">
            Go
          </button>
        </form>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Opening cash</p>
          <p className="text-lg font-semibold">{formatMoney(openingCash, currency)}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Closing cash</p>
          <p className="text-lg font-semibold">{formatMoney(closingCash, currency)}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-700">Charged to card, not yet paid</p>
          <p className="text-lg font-semibold text-amber-800">{formatMoney(creditCardCharged, currency)}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-emerald-700">Cash in by category</h2>
          <table className="w-full text-sm">
            <tbody>
              {[...inByCategory.entries()].map(([name, amount]) => (
                <tr key={name} className="border-t border-zinc-100">
                  <td className="py-1">{name}</td>
                  <td className="py-1 text-right">{formatMoney(amount, currency)}</td>
                </tr>
              ))}
              <tr className="border-t border-zinc-200 font-semibold">
                <td className="py-1">Total in</td>
                <td className="py-1 text-right">{formatMoney(totalIn, currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-red-700">Cash out by category</h2>
          <table className="w-full text-sm">
            <tbody>
              {[...outByCategory.entries()].map(([name, amount]) => (
                <tr key={name} className="border-t border-zinc-100">
                  <td className="py-1">{name}</td>
                  <td className="py-1 text-right">{formatMoney(amount, currency)}</td>
                </tr>
              ))}
              <tr className="border-t border-zinc-200 font-semibold">
                <td className="py-1">Total out</td>
                <td className="py-1 text-right">{formatMoney(totalOut, currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Per account</h2>
        <p className="text-xs text-zinc-500">
          Credit card spend is tracked separately and only reduces cash once a card payment is recorded from a
          cash/bank account.
        </p>
      </div>
    </div>
  );
}
