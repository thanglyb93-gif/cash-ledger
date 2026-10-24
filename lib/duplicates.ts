import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** Same vendor + total + date (±2 days) already on file -- a soft warning, never a block. */
export async function findPossibleDuplicate(
  supabase: SupabaseClient<Database>,
  params: { orgId: string; counterpartyId: string | null; amount: number; txnDate: string }
) {
  if (!params.counterpartyId) return null;

  const date = new Date(params.txnDate);
  const start = new Date(date);
  start.setDate(start.getDate() - 2);
  const end = new Date(date);
  end.setDate(end.getDate() + 2);

  const { data } = await supabase
    .from("transactions")
    .select("id, txn_date, amount, currency, description")
    .eq("org_id", params.orgId)
    .eq("counterparty_id", params.counterpartyId)
    .eq("amount", params.amount)
    .neq("status", "void")
    .gte("txn_date", start.toISOString().slice(0, 10))
    .lte("txn_date", end.toISOString().slice(0, 10))
    .limit(1)
    .maybeSingle();

  return data ?? null;
}
