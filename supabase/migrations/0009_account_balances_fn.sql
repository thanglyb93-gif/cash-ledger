-- Running balance per money account. cash/bank are assets (in increases, out decreases);
-- credit_card/owner_funds are liabilities (out/charged increases what's owed, in/repaid decreases it).
-- Matches the debit/credit convention already encoded in create_transaction_with_journal().

create or replace function get_account_balances(p_org_id uuid)
returns table (money_account_id uuid, balance bigint) as $$
  select
    ma.id as money_account_id,
    ma.opening_balance + coalesce(sum(
      case
        when ma.type in ('credit_card', 'owner_funds') then
          case when t.direction = 'out' then t.amount else -t.amount end
        else
          case when t.direction = 'in' then t.amount else -t.amount end
      end
    ), 0) as balance
  from money_accounts ma
  left join transactions t
    on t.money_account_id = ma.id and t.status <> 'void'
  where ma.org_id = p_org_id and is_org_member(p_org_id)
  group by ma.id, ma.opening_balance;
$$ language sql stable security definer set search_path = public;
