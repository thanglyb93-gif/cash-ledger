import { createClient } from "@/lib/supabase/server";
import type { OrgRole } from "@/types/database";

export interface UserOrg {
  org_id: string;
  role: OrgRole;
  org: { id: string; name: string; base_currency: string };
}

/** Orgs the current user belongs to, for the org switcher and the root redirect. */
export async function getUserOrgs(): Promise<UserOrg[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_members")
    .select("org_id, role, org:orgs(id, name, base_currency)");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    org_id: row.org_id,
    role: row.role,
    org: Array.isArray(row.org) ? row.org[0] : row.org,
  })) as UserOrg[];
}

/** Throws if the current user is not a member of orgId; otherwise returns their role. */
export async function requireOrgMembership(orgId: string): Promise<OrgRole> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .single();

  if (error || !data) {
    throw new Error("not a member of this org");
  }

  return data.role;
}
