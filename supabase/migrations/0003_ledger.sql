-- Phase 1: double-entry ledger underneath the simple UI
-- journal_entries + journal_lines, with a trigger enforcing debits = credits per entry

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  entry_date date not null,
  memo text,
  source_table text not null,
  source_id uuid not null,
  created_at timestamptz not null default now()
);

create index journal_entries_org_id_idx on journal_entries(org_id);
create index journal_entries_source_idx on journal_entries(source_table, source_id);

create table journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references journal_entries(id) on delete cascade,
  gl_account text not null,
  debit bigint not null default 0 check (debit >= 0),
  credit bigint not null default 0 check (credit >= 0),
  currency text not null,
  created_at timestamptz not null default now(),
  constraint journal_lines_single_side check (
    (debit = 0 and credit > 0) or (debit > 0 and credit = 0)
  )
);

create index journal_lines_entry_id_idx on journal_lines(entry_id);

-- Now that journal_entries exists, wire the FK from transactions.
alter table transactions
  add constraint transactions_journal_entry_id_fkey
  foreign key (journal_entry_id) references journal_entries(id) on delete set null;

create index transactions_journal_entry_idx on transactions(journal_entry_id);

-- Enforce balance: whenever journal_lines change for an entry, sum(debit) must equal sum(credit).
-- Deferred constraint trigger so a multi-line insert within one transaction can balance before commit.
create or replace function check_journal_entry_balanced() returns trigger as $$
declare
  entry uuid;
  total_debit bigint;
  total_credit bigint;
begin
  entry := coalesce(new.entry_id, old.entry_id);

  select coalesce(sum(debit), 0), coalesce(sum(credit), 0)
    into total_debit, total_credit
    from journal_lines
    where entry_id = entry;

  if total_debit <> total_credit then
    raise exception 'journal_entry % is not balanced: debit=% credit=%', entry, total_debit, total_credit;
  end if;

  return null;
end;
$$ language plpgsql;

create constraint trigger journal_lines_balanced
  after insert or update or delete on journal_lines
  deferrable initially deferred
  for each row execute function check_journal_entry_balanced();
