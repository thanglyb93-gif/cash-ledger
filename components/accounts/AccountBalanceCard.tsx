import { formatMoney } from "@/lib/money";

const TYPE_LABELS: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  credit_card: "Credit card",
  owner_funds: "Owner funds",
};

export function AccountBalanceCard({
  name,
  type,
  currency,
  balance,
  bankName,
  last4,
}: {
  name: string;
  type: string;
  currency: string;
  balance: number;
  bankName?: string | null;
  last4?: string | null;
}) {
  const isLiability = type === "credit_card" || type === "owner_funds";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-900">{name}</p>
          <p className="text-xs text-zinc-500">
            {TYPE_LABELS[type] ?? type}
            {bankName ? ` · ${bankName}` : ""}
            {last4 ? ` ····${last4}` : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isLiability ? "bg-amber-50 text-amber-700" : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {isLiability ? "Owed" : "Balance"}
        </span>
      </div>
      <p className="mt-3 text-xl font-semibold text-zinc-900">{formatMoney(balance, currency)}</p>
    </div>
  );
}
