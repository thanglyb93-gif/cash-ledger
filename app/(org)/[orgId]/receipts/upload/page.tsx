import { ReceiptUploader } from "@/components/receipts/ReceiptUploader";

export default async function ReceiptUploadPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Upload receipts</h1>
      <ReceiptUploader orgId={orgId} />
    </div>
  );
}
