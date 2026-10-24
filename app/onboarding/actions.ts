"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createOrgAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const baseCurrency = String(formData.get("base_currency") ?? "VND");

  if (!name) {
    throw new Error("Business name is required");
  }

  const supabase = await createClient();
  const { data: orgId, error } = await supabase.rpc("create_org", {
    org_name: name,
    base_currency: baseCurrency,
  });

  if (error) throw error;

  redirect(`/${orgId}/accounts`);
}
