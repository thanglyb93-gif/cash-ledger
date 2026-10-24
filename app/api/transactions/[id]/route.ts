import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { TransactionRow } from "@/types/database";

const EDITABLE_FIELDS = ["description", "reference", "evidence_status", "category_id", "counterparty_id"] as const;

type TransactionUpdate = Partial<Pick<TransactionRow, (typeof EDITABLE_FIELDS)[number]>>;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();

  if (body.void === true) {
    const { error } = await supabase.rpc("void_transaction", { p_txn_id: id });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const update: TransactionUpdate = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in body) update[key] = body[key];
  }

  const { error } = await supabase.from("transactions").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
