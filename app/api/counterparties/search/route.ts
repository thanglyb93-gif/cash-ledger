import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get("orgId");
  const q = request.nextUrl.searchParams.get("q") ?? "";

  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("counterparties")
    .select("id, name, kind, default_category_id")
    .eq("org_id", orgId)
    .ilike("name", `%${q}%`)
    .order("name")
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ counterparties: data });
}
