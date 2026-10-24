-- Phase 1: Storage bucket for receipt images/PDFs, scoped by org via path prefix
-- receipts/{org_id}/{filename}

insert into storage.buckets (id, name, public)
  values ('receipts', 'receipts', false)
  on conflict (id) do nothing;

create policy receipts_select on storage.objects for select
  using (
    bucket_id = 'receipts'
    and is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy receipts_insert on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy receipts_delete on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and has_org_role((storage.foldername(name))[1]::uuid, array['owner', 'accountant']::org_role[])
  );
