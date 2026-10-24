import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toMinorUnits } from "@/lib/money";
import { findPossibleDuplicate } from "@/lib/duplicates";
import { transactionFormSchema } from "@/lib/validations/transaction";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await params;
  const body = await request.json();
  const parsed = transactionFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const orgId = String(body.org_id ?? "");
  const confirmDuplicate = Boolean(body.confirm_duplicate);

  if (!orgId) {
    return NextResponse.json({ error: "org_id is required" }, { status: 400 });
  }

  const supabase = await createClient();

  let counterpartyId = input.counterparty_id ?? null;
  if (!counterpartyId && input.counterparty_name?.trim()) {
    const { data: created, error: counterpartyError } = await supabase
      .from("counterparties")
      .insert({
        org_id: orgId,
        name: input.counterparty_name.trim(),
        kind: input.direction === "out" ? "vendor" : "customer",
        default_category_id: input.category_id ?? null,
      })
      .select("id")
      .single();

    if (counterpartyError) {
      return NextResponse.json({ error: counterpartyError.message }, { status: 400 });
    }
    counterpartyId = created.id;
  }

  let amount: number;
  let vatAmount: number | null = null;
  try {
    amount = toMinorUnits(input.amount, input.currency);
    if (input.vat_amount?.trim()) {
      vatAmount = toMinorUnits(input.vat_amount, input.currency);
    }
  } catch {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  if (!confirmDuplicate) {
    const duplicate = await findPossibleDuplicate(supabase, {
      orgId,
      counterpartyId,
      amount,
      txnDate: input.txn_date,
    });
    if (duplicate) {
      return NextResponse.json({ duplicate }, { status: 409 });
    }
  }

  const { data: txnId, error } = await supabase.rpc("create_transaction_with_journal", {
    p_org_id: orgId,
    p_txn_date: input.txn_date,
    p_direction: input.direction,
    p_amount: amount,
    p_currency: input.currency,
    p_money_account_id: input.money_account_id,
    p_category_id: input.category_id ?? null,
    p_counterparty_id: counterpartyId,
    p_description: input.description ?? null,
    p_reference: input.reference ?? null,
    p_vat_amount: vatAmount,
    p_source: "receipt_ai",
    p_evidence_status: "attached",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase
    .from("documents")
    .update({ linked_transaction_id: txnId, extraction_status: "reviewed" })
    .eq("id", documentId);

  return NextResponse.json({ id: txnId }, { status: 201 });
}
