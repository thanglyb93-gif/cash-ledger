import type { EvidenceStatus } from "@/types/database";

const STYLES: Record<EvidenceStatus, string> = {
  attached: "bg-emerald-50 text-emerald-700",
  missing: "bg-amber-50 text-amber-700",
  not_required: "bg-zinc-100 text-zinc-500",
};

const LABELS: Record<EvidenceStatus, string> = {
  attached: "Evidence attached",
  missing: "Evidence missing",
  not_required: "No evidence needed",
};

export function EvidenceBadge({ status }: { status: EvidenceStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
