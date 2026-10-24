-- Phase 1: the one path by which a money event is allowed to exist.
-- Writes the transaction row and a balanced journal_entry/journal_lines set atomically.
-- RLS on transactions/journal_entries/journal_lines has no INSERT policy, so this
-- SECURITY DEFINER function is the only way those rows get created -- which is what
-- guarantees principle #2 (every money event has a balanced journal entry underneath).

create or replace function create_transaction_with_journal(
  p_org_id uuid,
  p_txn_date date,
  p_direction txn_direction,
  p_amount bigint,
  p_currency text,
  p_money_account_id uuid,
  p_category_id uuid default null,
  p_counterparty_id uuid default null,
  p_description text default null,
  p_reference text default null,
  p_vat_amount bigint default null,
  p_source txn_source default 'manual',
  p_evidence_status evidence_status default 'missing'
) returns uuid as $$
declare
  v_account_type money_account_type;
  v_account_currency text;
  v_category_gl text;
  v_vat_gl text;
  v_money_gl text;
  v_net_amount bigint;
  v_vat_amount bigint;
  v_txn_id uuid;
  v_entry_id uuid;
begin
  if not is_org_member(p_org_id) then
    raise exception 'not a member of this org';
  end if;

  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  select type, currency into v_account_type, v_account_currency
    from money_accounts
    where id = p_money_account_id and org_id = p_org_id;

  if v_account_type is null then
    raise exception 'money account not found in this org';
  end if;

  if v_account_currency <> p_currency then
    raise exception 'transaction currency % does not match account currency %', p_currency, v_account_currency;
  end if;

  if p_category_id is not null and not exists (
    select 1 from categories where id = p_category_id and org_id = p_org_id
  ) then
    raise exception 'category not found in this org';
  end if;

  if p_counterparty_id is not null and not exists (
    select 1 from counterparties where id = p_counterparty_id and org_id = p_org_id
  ) then
    raise exception 'counterparty not found in this org';
  end if;

  v_vat_amount := coalesce(p_vat_amount, 0);
  if v_vat_amount < 0 or v_vat_amount > p_amount then
    raise exception 'vat_amount must be between 0 and amount';
  end if;

  v_net_amount := p_amount - v_vat_amount;
  v_money_gl := upper(v_account_type::text) || ':' || p_money_account_id::text;
  v_category_gl := coalesce(
    (select gl_code from categories where id = p_category_id),
    'UNCATEGORIZED'
  );
  v_vat_gl := case p_direction when 'out' then '2100' else '2110' end;

  insert into transactions (
    org_id, txn_date, direction, amount, currency, money_account_id, category_id,
    counterparty_id, description, reference, vat_amount, status, source, evidence_status,
    created_by
  ) values (
    p_org_id, p_txn_date, p_direction, p_amount, p_currency, p_money_account_id, p_category_id,
    p_counterparty_id, p_description, p_reference, p_vat_amount, 'confirmed', p_source, p_evidence_status,
    auth.uid()
  ) returning id into v_txn_id;

  insert into journal_entries (org_id, entry_date, memo, source_table, source_id)
    values (p_org_id, p_txn_date, p_description, 'transactions', v_txn_id)
    returning id into v_entry_id;

  if p_direction = 'out' then
    if v_net_amount > 0 then
      insert into journal_lines (entry_id, gl_account, debit, credit, currency)
        values (v_entry_id, v_category_gl, v_net_amount, 0, p_currency);
    end if;
    if v_vat_amount > 0 then
      insert into journal_lines (entry_id, gl_account, debit, credit, currency)
        values (v_entry_id, v_vat_gl, v_vat_amount, 0, p_currency);
    end if;
    insert into journal_lines (entry_id, gl_account, debit, credit, currency)
      values (v_entry_id, v_money_gl, 0, p_amount, p_currency);
  else
    insert into journal_lines (entry_id, gl_account, debit, credit, currency)
      values (v_entry_id, v_money_gl, p_amount, 0, p_currency);
    if v_net_amount > 0 then
      insert into journal_lines (entry_id, gl_account, debit, credit, currency)
        values (v_entry_id, v_category_gl, 0, v_net_amount, p_currency);
    end if;
    if v_vat_amount > 0 then
      insert into journal_lines (entry_id, gl_account, debit, credit, currency)
        values (v_entry_id, v_vat_gl, 0, v_vat_amount, p_currency);
    end if;
  end if;

  update transactions set journal_entry_id = v_entry_id where id = v_txn_id;

  return v_txn_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function void_transaction(p_txn_id uuid) returns void as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id from transactions where id = p_txn_id;

  if v_org_id is null then
    raise exception 'transaction not found';
  end if;

  if not is_org_member(v_org_id) then
    raise exception 'not a member of this org';
  end if;

  update transactions set status = 'void' where id = p_txn_id;
end;
$$ language plpgsql security definer set search_path = public;
