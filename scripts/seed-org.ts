// Creates an org, makes an existing (or new) user its owner, and adds starter money accounts.
// Usage: npx tsx scripts/seed-org.ts "Hoang Long Coffee" owner@example.com VND
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local -- this talks to auth.users directly
// and bypasses RLS, so only ever run it from your own machine, never from client code.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}

const [orgName, ownerEmail, baseCurrency = "VND"] = process.argv.slice(2);

if (!orgName || !ownerEmail) {
  console.error('Usage: npx tsx scripts/seed-org.ts "Business name" owner@example.com [VND|USD]');
  process.exit(1);
}

async function main() {
  const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  let userId: string;
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing?.users.find((u) => u.email === ownerEmail);

  if (found) {
    userId = found.id;
    console.log(`Using existing user ${ownerEmail}`);
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: ownerEmail,
      email_confirm: true,
    });
    if (error || !created.user) throw error ?? new Error("could not create user");
    userId = created.user.id;
    console.log(`Created user ${ownerEmail} -- they'll sign in via magic link.`);
  }

  const { data: org, error: orgError } = await admin
    .from("orgs")
    .insert({ name: orgName, base_currency: baseCurrency })
    .select("id")
    .single();
  if (orgError || !org) throw orgError ?? new Error("could not create org");

  await admin.from("org_members").insert({ org_id: org.id, user_id: userId, role: "owner" });
  await admin.rpc("seed_default_categories", { target_org: org.id });

  const defaultAccounts =
    baseCurrency === "VND"
      ? [{ name: "Cash drawer", type: "cash", currency: "VND" }, { name: "Main bank account", type: "bank", currency: "VND" }]
      : [{ name: "Cash drawer", type: "cash", currency: "USD" }, { name: "Main bank account", type: "bank", currency: "USD" }];

  for (const account of defaultAccounts) {
    await admin.from("money_accounts").insert({
      org_id: org.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      opening_balance: 0,
      opening_date: new Date().toISOString().slice(0, 10),
    });
  }

  console.log(`Org "${orgName}" created: ${org.id}`);
  console.log(`Owner: ${ownerEmail} (${userId})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
