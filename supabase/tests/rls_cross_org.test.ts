// Proves RLS actually blocks cross-org reads, not just that policies exist.
// Requires a running Supabase instance (local `supabase start` or a test project) with
// migrations applied. Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY from .env.local -- the whole file is skipped if they're missing,
// so it never silently passes in CI without a real database behind it.
//
// Run: npm run test:rls   (after `supabase start` locally)

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const canRun = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

describe.skipIf(!canRun)("RLS: cross-org isolation", () => {
  let admin: SupabaseClient;
  let userAClient: SupabaseClient;
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let userBId: string;
  const userAEmail = `rls-test-a-${Date.now()}@example.com`;
  const userBEmail = `rls-test-b-${Date.now()}@example.com`;
  const password = "test-password-123!";

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

    const { data: userA } = await admin.auth.admin.createUser({
      email: userAEmail,
      password,
      email_confirm: true,
    });
    const { data: userB } = await admin.auth.admin.createUser({
      email: userBEmail,
      password,
      email_confirm: true,
    });
    userAId = userA!.user!.id;
    userBId = userB!.user!.id;

    const { data: orgA } = await admin.from("orgs").insert({ name: "Org A" }).select("id").single();
    const { data: orgB } = await admin.from("orgs").insert({ name: "Org B" }).select("id").single();
    orgAId = orgA!.id;
    orgBId = orgB!.id;

    await admin.from("org_members").insert([
      { org_id: orgAId, user_id: userAId, role: "owner" },
      { org_id: orgBId, user_id: userBId, role: "owner" },
    ]);

    await admin.from("money_accounts").insert([
      { org_id: orgAId, name: "Org A cash", type: "cash", currency: "VND" },
      { org_id: orgBId, name: "Org B cash", type: "cash", currency: "VND" },
    ]);

    userAClient = createClient(SUPABASE_URL!, ANON_KEY!, { auth: { persistSession: false } });
    await userAClient.auth.signInWithPassword({ email: userAEmail, password });
  });

  afterAll(async () => {
    await admin.from("orgs").delete().in("id", [orgAId, orgBId]);
    await admin.auth.admin.deleteUser(userAId);
    await admin.auth.admin.deleteUser(userBId);
  });

  it("lets a user read their own org's data", async () => {
    const { data, error } = await userAClient.from("money_accounts").select("*").eq("org_id", orgAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].name).toBe("Org A cash");
  });

  it("blocks a user from reading another org's data, even by direct id", async () => {
    const { data, error } = await userAClient.from("money_accounts").select("*").eq("org_id", orgBId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0); // RLS filters it out silently, not a query error
  });

  it("blocks a user from reading another org's row directly", async () => {
    const { data: orgBAccounts } = await admin.from("money_accounts").select("id").eq("org_id", orgBId);
    const orgBAccountId = orgBAccounts![0].id;

    const { data } = await userAClient.from("money_accounts").select("*").eq("id", orgBAccountId);
    expect(data).toHaveLength(0);
  });
});
