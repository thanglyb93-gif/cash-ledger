export function DuplicateWarning({
  txnDate,
  onConfirm,
  onCancel,
}: {
  txnDate: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
      Possible duplicate: a transaction on {txnDate} for this vendor and amount already exists.
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={onConfirm} className="rounded-md bg-amber-600 px-3 py-1 text-white">
          Save anyway
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-amber-300 px-3 py-1">
          Cancel
        </button>
      </div>
    </div>
  );
}
