-- Placeholders for Phase 2/3 — tables only, no app code or UI references them yet.
-- Shaped now so later migrations can add columns/indexes without rewriting existing data.

create type bill_status as enum ('open', 'partially_paid', 'paid', 'void');

create table bills (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  counterparty_id uuid references counterparties(id) on delete set null,
  bill_date date not null,
  due_date date,
  amount bigint not null,
  currency text not null,
  status bill_status not null default 'open',
  created_at timestamptz not null default now()
);

create index bills_org_id_idx on bills(org_id);

create type invoice_status as enum ('draft', 'sent', 'partially_paid', 'paid', 'void');

create table invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  counterparty_id uuid references counterparties(id) on delete set null,
  invoice_date date not null,
  due_date date,
  amount bigint not null,
  currency text not null,
  status invoice_status not null default 'draft',
  created_at timestamptz not null default now()
);

create index invoices_org_id_idx on invoices(org_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  money_account_id uuid references money_accounts(id) on delete set null,
  amount bigint not null,
  currency text not null,
  payment_date date not null,
  created_at timestamptz not null default now()
);

create index payments_org_id_idx on payments(org_id);

create table payment_allocations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  payment_id uuid not null references payments(id) on delete cascade,
  bill_id uuid references bills(id) on delete cascade,
  invoice_id uuid references invoices(id) on delete cascade,
  amount bigint not null,
  created_at timestamptz not null default now()
);

create index payment_allocations_org_id_idx on payment_allocations(org_id);
create index payment_allocations_payment_idx on payment_allocations(payment_id);

create table bank_statement_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  money_account_id uuid references money_accounts(id) on delete set null,
  line_date date not null,
  amount bigint not null,
  currency text not null,
  description text,
  raw_import jsonb,
  created_at timestamptz not null default now()
);

create index bank_statement_lines_org_id_idx on bank_statement_lines(org_id);

create table reconciliation_matches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  bank_statement_line_id uuid references bank_statement_lines(id) on delete cascade,
  transaction_id uuid references transactions(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index reconciliation_matches_org_id_idx on reconciliation_matches(org_id);
