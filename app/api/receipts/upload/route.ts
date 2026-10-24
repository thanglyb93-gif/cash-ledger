import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const orgId = String(formData.get("org_id") ?? "");
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (!orgId || files.length === 0) {
    return NextResponse.json({ error: "org_id and at least one file are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const created: { id: string; storage_path: string }[] = [];

  for (const file of files) {
    const path = `${orgId}/${randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("receipts").upload(path, file, {
      contentType: file.type,
    });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const { data: doc, error: insertError } = await supabase
      .from("documents")
      .insert({
        org_id: orgId,
        storage_path: path,
        mime: file.type,
        kind: "receipt",
        extraction_status: "pending",
      })
      .select("id, storage_path")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    created.push(doc);
  }

  return NextResponse.json({ documents: created }, { status: 201 });
}
