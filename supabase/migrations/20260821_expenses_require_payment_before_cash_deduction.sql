-- Purchases start as unpaid. Cash is deducted only when their status changes
-- to paid. Reverting to pending removes the linked cash-ledger deduction.
create or replace function public.record_paid_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'paid' then
    insert into public.cash_ledger (entry_type, amount, description, expense_id, created_by)
    values ('purchase', -new.amount, new.description, new.id, new.staff_id)
    on conflict (expense_id) do update
      set amount = excluded.amount, description = excluded.description, created_by = excluded.created_by;
  elsif tg_op = 'UPDATE' and old.status = 'paid' then
    delete from public.cash_ledger where expense_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists expense_records_financial_outflow on public.expenses;
create trigger expense_records_financial_outflow
after insert or update on public.expenses
for each row execute function public.record_paid_expense();

create or replace function public.record_cash_purchase(
  p_branch_id uuid,
  p_category text,
  p_description text,
  p_amount integer
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_expense_id uuid;
  current_staff_id uuid;
begin
  select id into current_staff_id from public.staff where auth_user_id = auth.uid();
  if not exists (select 1 from public.staff where id = current_staff_id and role::text in ('owner', 'god')) then
    raise exception 'Only Owner or GOD can record central cash purchases';
  end if;
  if p_amount <= 0 or btrim(p_description) = '' then
    raise exception 'A positive amount and description are required';
  end if;

  insert into public.expenses (branch_id, category, description, amount, staff_id, status, paid_at)
  values (p_branch_id, p_category, btrim(p_description), p_amount, current_staff_id, 'pending', null)
  returning id into new_expense_id;
  return new_expense_id;
end;
$$;

drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses for update to authenticated
using (exists (select 1 from public.staff where auth_user_id = auth.uid() and role::text in ('accountant', 'owner', 'god')));
