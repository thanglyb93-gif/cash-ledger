import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserOrgs } from "@/lib/orgs";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  const orgs = await getUserOrgs();

  if (orgs.length === 0) {
    redirect("/onboarding");
  }

  redirect(`/${orgs[0].org_id}/transactions`);
}
