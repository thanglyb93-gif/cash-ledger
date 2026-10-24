-- Phase 1: RLS. Every business table is scoped to org_members for the current auth.uid().
-- journal_entries/journal_lines/transactions are write-protected here on purpose (see 0007):
-- all money-moving writes must go through the create_transaction_with_journal() RPC so that
-- a journal entry is guaranteed to exist and stay balanced. Direct client writes to those
-- tables are not permitted by any policy below.

create or replace function is_org_member(check_org_id uuid) returns boolean as $$
  select exists (
    select 1 from org_members
    where org_id = check_org_id and user_id = auth.uid()
  );
$$ language sql security definer stable set search_path = public;

create or replace function has_org_role(check_org_id uuid, roles org_role[]) returns boolean as $$
  select exists (
    select 1 from org_members
    where org_id = check_org_id and user_id = auth.uid() and role = any(roles)
  );
$$ language sql security definer stable set search_path = public;

-- orgs ----------------------------------------------------------------------
alter table orgs enable row level security;

create policy orgs_select on orgs for select
  using (is_org_member(id));

create policy orgs_update on orgs for update
  using (has_org_role(id, array['owner']::org_role[]));

-- no insert/delete policy: orgs are created via create_org() (security definer, see 0006)

-- org_members -----------------------------------------------------------------
alter table org_members enable row level security;

create policy org_members_select on org_members for select
  using (is_org_member(org_id));

create policy org_members_update on org_members for update
  using (has_org_role(org_id, array['owner']::org_role[]));

create policy org_members_delete on org_members for delete
  using (has_org_role(org_id, array['owner']::org_role[]));

-- no insert policy: members are added via add_org_member() (security definer, see 0006)

-- money_accounts --------------------------------------------------------------
alter table money_accounts enable row level security;

create policy money_accounts_select on money_accounts for select
  using (is_org_member(org_id));

create policy money_accounts_insert on money_accounts for insert
  with check (has_org_role(org_id, array['owner', 'accountant']::org_role[]));

create policy money_accounts_update on money_accounts for update
  using (has_org_role(org_id, array['owner', 'accountant']::org_role[]));

create policy money_accounts_delete on money_accounts for delete
  using (has_org_role(org_id, array['owner', 'accountant']::org_role[]));

-- categories ------------------------------------------------------------------
alter table categories enable row level security;

create policy categories_select on categories for select
  using (is_org_member(org_id));

create policy categories_insert on categories for insert
  with check (has_org_role(org_id, array['owner', 'accountant']::org_role[]));

create policy categories_update on categories for update
  using (has_org_role(org_id, array['owner', 'accountant']::org_role[]));

create policy categories_delete on categories for delete
  using (has_org_role(org_id, array['owner', 'accountant']::org_role[]));

-- counterparties (vendors/customers) -- create-on-the-fly, so any member can write ------------
alter table counterparties enable row level security;

create policy counterparties_select on counterparties for select
  using (is_org_member(org_id));

create policy counterparties_insert on counterparties for insert
  with check (is_org_member(org_id));

create policy counterparties_update on counterparties for update
  using (is_org_member(org_id));

-- no delete policy: vendors/customers are kept for history, not deleted

-- transactions ------------------------------------------------------------------
alter table transactions enable row level security;

create policy transactions_select on transactions for select
  using (is_org_member(org_id));

create policy transactions_update on transactions for update
  using (is_org_member(org_id));

-- no insert/delete policy: created via create_transaction_with_journal() (see 0007);
-- voiding is an update of status, not a delete

-- documents (receipts/evidence) ------------------------------------------------
alter table documents enable row level security;

create policy documents_select on documents for select
  using (is_org_member(org_id));

create policy documents_insert on documents for insert
  with check (is_org_member(org_id));

create policy documents_update on documents for update
  using (is_org_member(org_id));

-- journal_entries / journal_lines -- read-only to clients ----------------------
alter table journal_entries enable row level security;

create policy journal_entries_select on journal_entries for select
  using (is_org_member(org_id));

alter table journal_lines enable row level security;

create policy journal_lines_select on journal_lines for select
  using (is_org_member((select org_id from journal_entries where id = entry_id)));

-- Phase 2/3 placeholder tables -- lock down now so RLS is never forgotten later ----------------
alter table bills enable row level security;
create policy bills_select on bills for select using (is_org_member(org_id));

alter table invoices enable row level security;
create policy invoices_select on invoices for select using (is_org_member(org_id));

alter table payments enable row level security;
create policy payments_select on payments for select using (is_org_member(org_id));

alter table payment_allocations enable row level security;
create policy payment_allocations_select on payment_allocations for select using (is_org_member(org_id));

alter table bank_statement_lines enable row level security;
create policy bank_statement_lines_select on bank_statement_lines for select using (is_org_member(org_id));

alter table reconciliation_matches enable row level security;
create policy reconciliation_matches_select on reconciliation_matches for select using (is_org_member(org_id));
