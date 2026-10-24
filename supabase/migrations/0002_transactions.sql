-- Phase 1: transactions + documents (receipts/evidence)

create type txn_direction as enum ('out', 'in');
create type txn_status as enum ('draft', 'confirmed', 'void');
create type txn_source as enum ('manual', 'receipt_ai', 'bank_import');
create type evidence_status as enum ('attached', 'missing', 'not_required');

create table transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  txn_date date not null,
  direction txn_direction not null,
  amount bigint not null check (amount > 0),
  currency text not null,
  money_account_id uuid not null references money_accounts(id) on delete restrict,
  category_id uuid references categories(id) on delete set null,
  counterparty_id uuid references counterparties(id) on delete set null,
  description text,
  reference text,
  vat_amount bigint,
  status txn_status not null default 'confirmed',
  source txn_source not null default 'manual',
  evidence_status evidence_status not null default 'missing',
  created_by uuid references auth.users(id) on delete set null,
  journal_entry_id uuid,
  created_at timestamptz not null default now()
);

create index transactions_org_id_idx on transactions(org_id);
create index transactions_org_date_idx on transactions(org_id, txn_date desc);
create index transactions_money_account_idx on transactions(money_account_id);
create index transactions_category_idx on transactions(category_id);
create index transactions_evidence_status_idx on transactions(org_id, evidence_status);

create type document_kind as enum ('receipt', 'e_invoice', 'bank_statement', 'other');
create type extraction_status as enum ('pending', 'done', 'failed', 'reviewed');

create table documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  storage_path text not null,
  mime text not null,
  kind document_kind not null default 'receipt',
  extracted_json jsonb,
  extraction_status extraction_status not null default 'pending',
  linked_transaction_id uuid references transactions(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index documents_org_id_idx on documents(org_id);
create index documents_linked_txn_idx on documents(linked_transaction_id);
create index documents_extraction_status_idx on documents(org_id, extraction_status);
