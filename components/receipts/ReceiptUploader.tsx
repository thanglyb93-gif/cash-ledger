"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReceiptUploader({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "extracting" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function handleUpload() {
    if (files.length === 0) return;
    setStatus("uploading");
    setError("");

    const formData = new FormData();
    formData.set("org_id", orgId);
    for (const file of files) formData.append("files", file);

    const res = await fetch("/api/receipts/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Upload failed");
      setStatus("error");
      return;
    }

    const { documents } = await res.json();
    setStatus("extracting");

    await Promise.all(
      documents.map((doc: { id: string }) =>
        fetch("/api/receipts/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document_id: doc.id }),
        }).catch(() => null)
      )
    );

    setStatus("done");
    router.push(`/${orgId}/receipts`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4">
      <label className="flex flex-col gap-1 text-sm">
        Upload receipt photos or PDFs
        <input
          type="file"
          multiple
          accept="image/*,.pdf"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="text-sm"
        />
      </label>

      {files.length > 0 && (
        <ul className="text-sm text-zinc-600">
          {files.map((f) => (
            <li key={f.name}>{f.name}</li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleUpload}
        disabled={files.length === 0 || status === "uploading" || status === "extracting"}
        className="rounded-md bg-zinc-900 px-4 py-3 text-base font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {status === "uploading" && "Uploading..."}
        {status === "extracting" && "Reading receipts..."}
        {(status === "idle" || status === "done" || status === "error") && "Upload"}
      </button>
    </div>
  );
}
