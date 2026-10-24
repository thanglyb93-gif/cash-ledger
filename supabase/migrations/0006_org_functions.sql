-- Phase 1: org bootstrapping RPCs.
-- These are SECURITY DEFINER because org creation and membership changes are the one place
-- that legitimately needs to bypass RLS (there's no membership row yet to check against).
-- Each function re-verifies permissions internally before writing, so RLS is still enforced
-- in spirit -- it just can't be expressed as a row policy for these specific operations.

create or replace function seed_default_categories(target_org uuid) returns void as $$
begin
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

create or replace function create_org(org_name text, base_currency text default 'VND') returns uuid as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated to create an org';
  end if;

  insert into orgs (name, base_currency) values (org_name, base_currency)
    returning id into new_org_id;

  insert into org_members (org_id, user_id, role) values (new_org_id, auth.uid(), 'owner');

  perform seed_default_categories(new_org_id);

  return new_org_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function add_org_member(target_org uuid, member_email text, member_role org_role default 'staff')
returns uuid as $$
declare
  target_user uuid;
begin
  if not has_org_role(target_org, array['owner', 'accountant']::org_role[]) then
    raise exception 'only owner/accountant can add members';
  end if;

  select id into target_user from auth.users where email = member_email;

  if target_user is null then
    raise exception 'no user found with email %', member_email;
  end if;

  insert into org_members (org_id, user_id, role) values (target_org, target_user, member_role)
    on conflict (org_id, user_id) do update set role = excluded.role;

  return target_user;
end;
$$ language plpgsql security definer set search_path = public;
