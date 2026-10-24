import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractReceipt } from "@/lib/claude";

export async function POST(request: NextRequest) {
  const { document_id } = await request.json();

  if (!document_id) {
    return NextResponse.json({ error: "document_id is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, storage_path, mime")
    .eq("id", document_id)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: "document not found" }, { status: 404 });
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from("receipts")
    .download(doc.storage_path);

  if (downloadError || !fileBlob) {
    return NextResponse.json({ error: "could not read uploaded file" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    const extraction = await extractReceipt({
      fileBase64: buffer.toString("base64"),
      mime: doc.mime,
    });

    await supabase
      .from("documents")
      .update({ extracted_json: extraction, extraction_status: "done" })
      .eq("id", document_id);

    return NextResponse.json({ extraction });
  } catch (err) {
    await supabase.from("documents").update({ extraction_status: "failed" }).eq("id", document_id);
    const message = err instanceof Error ? err.message : "extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
