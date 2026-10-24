"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MoneyAccountType } from "@/types/database";
import { toMinorUnits } from "@/lib/money";

export async function createMoneyAccountAction(orgId: string, formData: FormData) {
  const supabase = await createClient();
  const currency = String(formData.get("currency"));
  const openingBalanceInput = String(formData.get("opening_balance") ?? "0");

  const { error } = await supabase.from("money_accounts").insert({
    org_id: orgId,
    name: String(formData.get("name")),
    type: String(formData.get("type")) as MoneyAccountType,
    currency,
    bank_name: String(formData.get("bank_name") ?? "") || null,
    account_number_last4: String(formData.get("account_number_last4") ?? "") || null,
    opening_balance: toMinorUnits(openingBalanceInput || "0", currency),
    opening_date: String(formData.get("opening_date") ?? new Date().toISOString().slice(0, 10)),
  });

  if (error) throw error;

  revalidatePath(`/${orgId}/accounts`);
}
