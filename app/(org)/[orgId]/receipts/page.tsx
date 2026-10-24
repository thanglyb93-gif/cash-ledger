import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReviewQueueItem } from "@/components/receipts/ReviewQueueItem";
import type { ReceiptExtraction } from "@/lib/validations/receipt-extraction";

export default async function ReceiptsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const supabase = await createClient();

  const [{ data: documents }, { data: org }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, storage_path, mime, extracted_json, extraction_status")
      .eq("org_id", orgId)
      .eq("kind", "receipt")
      .is("linked_transaction_id", null)
      .order("created_at", { ascending: false }),
    supabase.from("orgs").select("base_currency").eq("id", orgId).single(),
    supabase
      .from("money_accounts")
      .select("id, name, type, currency")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("name"),
    supabase.from("categories").select("id, name, kind").eq("org_id", orgId).order("name"),
  ]);

  const withUrls = await Promise.all(
    (documents ?? []).map(async (doc) => {
      const { data: signed } = await supabase.storage.from("receipts").createSignedUrl(doc.storage_path, 3600);
      return { ...doc, signedUrl: signed?.signedUrl ?? null };
    })
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Receipt review queue</h1>
        <Link
          href={`/${orgId}/receipts/upload`}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + Upload receipts
        </Link>
      </div>

      {withUrls.length === 0 && (
        <p className="text-sm text-zinc-500">Nothing waiting for review. Upload a receipt to get started.</p>
      )}

      <div className="flex flex-col gap-6">
        {withUrls.map((doc) => (
          <ReviewQueueItem
            key={doc.id}
            documentId={doc.id}
            orgId={orgId}
            imageUrl={doc.signedUrl}
            mime={doc.mime}
            extraction={doc.extracted_json as ReceiptExtraction | null}
            extractionStatus={doc.extraction_status}
            baseCurrency={org?.base_currency ?? "VND"}
            moneyAccounts={accounts ?? []}
            categories={categories ?? []}
          />
        ))}
      </div>
    </div>
  );
}
