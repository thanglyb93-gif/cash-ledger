"use client";

import { useRouter } from "next/navigation";

export function OrgSwitcher({
  orgs,
  currentOrgId,
}: {
  orgs: { org_id: string; org: { name: string } }[];
  currentOrgId: string;
}) {
  const router = useRouter();

  return (
    <select
      defaultValue={currentOrgId}
      onChange={(e) => router.push(`/${e.target.value}/transactions`)}
      className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm font-semibold"
    >
      {orgs.map((o) => (
        <option key={o.org_id} value={o.org_id}>
          {o.org.name}
        </option>
      ))}
    </select>
  );
}
