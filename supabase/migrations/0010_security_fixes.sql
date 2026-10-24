-- Fixes two issues the Supabase security advisor caught after 0001-0009 were applied:
--
-- 1. seed_default_categories() had no internal permission check, so it was directly
--    callable via RPC by anon/authenticated against ANY org_id -- add the same
--    owner/accountant guard the other bootstrapping RPCs already use.
-- 2. check_journal_entry_balanced() was missing a pinned search_path.

create or replace function seed_default_categories(target_org uuid) returns void as $$
begin
  if not has_org_role(target_org, array['owner', 'accountant']::org_role[]) then
    raise exception 'only owner/accountant can seed categories for this org';
  end if;

  insert into categories (org_id, name, kind, gl_code) values
    (target_org, 'Sales revenue', 'income', '4000'),
    (target_org, 'COGS - Coffee & ingredients', 'expense', '5000'),
    (target_org, 'COGS - Packaging', 'expense', '5010'),
    (target_org, 'Rent', 'expense', '6000'),
    (target_org, 'Utilities', 'expense', '6010'),
    (target_org, 'Payroll', 'expense', '6020'),
    (target_org, 'Marketing', 'expense', '6030'),
    (target_org, 'Repairs & maintenance', 'expense', '6040'),
    (target_org, 'OTA commissions', 'expense', '6050'),
    (target_org, 'Bank fees', 'expense', '6060'),
    (target_org, 'Supplies', 'expense', '6070'),
    (target_org, 'Insurance', 'expense', '6080'),
    (target_org, 'VAT input', 'tax', '2100'),
    (target_org, 'VAT output', 'tax', '2110'),
    (target_org, 'Owner draw / reimbursement', 'transfer', '3100'),
    (target_org, 'Credit card payment', 'transfer', '2200'),
    (target_org, 'Other income', 'income', '4900'),
    (target_org, 'Other expense', 'expense', '6900');
end;
$$ language plpgsql security definer set search_path = public;

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
$$ language plpgsql set search_path = public;
