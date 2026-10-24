-- Phase 1: core multi-tenant schema
-- orgs, membership, money accounts, categories, counterparties

create extension if not exists "pgcrypto";

create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_currency text not null default 'VND',
  created_at timestamptz not null default now()
);

create type org_role as enum ('owner', 'accountant', 'staff');

create table org_members (
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index org_members_user_id_idx on org_members(user_id);

create type money_account_type as enum ('cash', 'bank', 'credit_card', 'owner_funds');

create table money_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  type money_account_type not null,
  currency text not null,
  bank_name text,
  account_number_last4 text,
  opening_balance bigint not null default 0,
  opening_date date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index money_accounts_org_id_idx on money_accounts(org_id);

create type category_kind as enum ('expense', 'income', 'transfer', 'tax');

create table categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  kind category_kind not null,
  parent_id uuid references categories(id) on delete set null,
  gl_code text,
  created_at timestamptz not null default now()
);

create index categories_org_id_idx on categories(org_id);
create index categories_parent_id_idx on categories(parent_id);

create type counterparty_kind as enum ('vendor', 'customer', 'both');

create table counterparties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  tax_code text,
  kind counterparty_kind not null default 'vendor',
  default_category_id uuid references categories(id) on delete set null,
  bank_account_hint text,
  created_at timestamptz not null default now()
);

create index counterparties_org_id_idx on counterparties(org_id);
create index counterparties_name_idx on counterparties(org_id, name);
