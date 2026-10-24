# Cash Ledger -- Phase 1

Cash management and bank reconciliation for small businesses (first users: a Vietnamese coffee
brand and a 4-room homestay). Phase 1 scope: multi-tenant double-entry ledger, manual transaction
entry, AI receipt capture, and basic reporting. See the design principles in the migrations under
`supabase/migrations/` -- they're commented with the reasoning, not just the schema.

Stack: Next.js 16 (App Router, TypeScript), Supabase (Postgres, Auth, Storage, RLS), Tailwind,
Claude API (receipt vision extraction), deployed on Vercel.

## Env vars

A Supabase project called **cash-ledger** already exists (org "Thang Ly", region
ap-southeast-1, ref `eqllwhnwvvdgqhukehxn`) with all 10 migrations applied -- separate from the
coffee-website and hoang-long-homestay projects, so this app's data never mixes with theirs.
`.env.local` is already filled in with its URL and anon key; you still need to add:

| Var | Where to get it |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | [Project API settings](https://supabase.com/dashboard/project/eqllwhnwvvdgqhukehxn/settings/api) -> service_role key (never exposed to the browser) |
| `ANTHROPIC_API_KEY` | console.anthropic.com |

Set all four vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`) in Vercel too (Project -> Settings ->
Environment Variables) before deploying -- the app is dynamic end-to-end (every page reads the
session via cookies), so it won't build a usable preview without them.

Starting a different Supabase project instead (your own, or a fresh one)? Run every file in
`supabase/migrations/` against it in order (0001 through 0010) and swap the URL/anon key in
`.env.local`.

## Running locally on Windows

This was built and tested from Git Bash (not PowerShell/cmd) on Windows 11.

```bash
npm install
# fill in SUPABASE_SERVICE_ROLE_KEY and ANTHROPIC_API_KEY in .env.local first (see above)
npm run dev
```

Open http://localhost:3000.

### Running Supabase locally instead (optional)

If you'd rather point at a local Supabase stack than the hosted `cash-ledger` project:

1. **Install Docker Desktop** -- the local Supabase stack runs in containers (the CLI is
   already a devDependency, so `npx supabase` works without a separate install).
2. `npm run supabase:start` -- prints a local URL, anon key, and service role key. It applies
   all migrations automatically on a fresh local db; after editing a migration file, re-apply
   with `npx supabase db reset`.
3. Put the printed local URL/keys in `.env.local` instead of the hosted project's.

## Adding a business (org)

The first user to sign in has no org yet and lands on `/onboarding` to create one -- this calls
the `create_org()` Postgres function, which creates the org, makes you its owner, and seeds the
default chart of accounts in one transaction.

To add a teammate to an existing org (they must have signed in at least once already, so a
Supabase auth user exists for their email), run from the SQL editor or psql, as an org
owner/accountant:

```sql
select add_org_member('org-uuid-here', 'teammate@example.com', 'staff');
```

Roles are `owner`, `accountant`, or `staff`. Staff can log transactions and upload receipts but
can't edit money accounts, the chart of accounts, or other members' roles.

To seed a business with starter accounts from the command line instead (useful for local dev):

```bash
npm run seed:org -- "Hoang Long Coffee" owner@example.com VND
```

## How the ledger actually works

The UI never asks for debits/credits -- "Accountant view" on a transaction's detail page shows
the underlying `journal_entry`/`journal_lines` it generated. Every transaction is written through
a single Postgres function, `create_transaction_with_journal()` (see
`supabase/migrations/0007_create_transaction_fn.sql`), which is also the *only* way a row can land
in `transactions`, `journal_entries`, or `journal_lines` -- there's no RLS INSERT policy on any of
those tables, by design, so a balanced journal entry is guaranteed at the database level, not just
by convention in the app code.

## Testing RLS

```bash
npm run supabase:start   # if not already running
npm run test:rls
```

This creates two real orgs and two real auth users, logs in as one, and asserts it cannot read
the other org's `money_accounts` rows -- proving the policy, not just that it exists. The test
file (`supabase/tests/rls_cross_org.test.ts`) skips itself if Supabase env vars aren't set, so it
never silently "passes" without a real database behind it.

## Security advisor notes

Supabase's security linter flags all of `create_org`, `add_org_member`,
`create_transaction_with_journal`, `void_transaction`, `seed_default_categories`,
`is_org_member`, `has_org_role`, and `get_account_balances` as "SECURITY DEFINER callable by
anon/authenticated" -- that's expected, since they're the intentional write path described
above. Each one (except the two boolean helpers, which only ever report on the caller's own
membership) re-checks the caller's org membership/role internally before touching data, so an
anonymous or cross-org call is rejected rather than silently trusted. `0010_security_fixes.sql`
closed one real gap found this way: `seed_default_categories` was missing that check when first
written.

## What's deliberately not here yet

Bank statement import, reconciliation matching, AR/AP aging, and e-invoice XML import are Phase
2/3. Their tables (`bills`, `invoices`, `payments`, `payment_allocations`, `bank_statement_lines`,
`reconciliation_matches`) already exist with RLS locked down, so those phases are additive --
no migration should need to rewrite data in the tables built here.

## Adding yourself as the first user

Sign in at `/login` with a magic link. The first sign-in has no org yet and lands on
`/onboarding` to create one via `create_org()`.
