-- Owner/GOD can remove an erroneous expense. Any matching cash-ledger row is
-- removed first, restoring the central balance automatically.
create or replace function public.delete_cash_expense(target_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.staff
    where auth_user_id = auth.uid() and active = true and role::text in ('owner', 'god')
  ) then
    raise exception 'Only Owner or GOD can delete expenses';
  end if;

  delete from public.cash_ledger where expense_id = target_expense_id;
  delete from public.expenses where id = target_expense_id;
end;
$$;

revoke all on function public.delete_cash_expense(uuid) from public;
grant execute on function public.delete_cash_expense(uuid) to authenticated;
