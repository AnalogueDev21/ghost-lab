-- Every active staff member can submit an expense request for their own
-- branch. It is always pending; only Owner/GOD can mark it paid and deduct cash.
create or replace function public.record_pending_expense(
  p_branch_id uuid,
  p_category text,
  p_description text,
  p_amount integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staff%rowtype;
  new_expense_id uuid;
begin
  select * into actor from public.staff where auth_user_id = auth.uid() and active = true;
  if actor.id is null then raise exception 'No active staff account is linked to this login'; end if;
  if p_amount <= 0 or btrim(p_description) = '' then
    raise exception 'A positive amount and description are required';
  end if;
  if actor.role::text not in ('owner', 'god') and p_branch_id is distinct from actor.primary_branch then
    raise exception 'Staff may only submit expenses for their primary branch';
  end if;

  insert into public.expenses (branch_id, category, description, amount, staff_id, status, paid_at)
  values (p_branch_id, p_category, btrim(p_description), p_amount, actor.id, 'pending', null)
  returning id into new_expense_id;
  return new_expense_id;
end;
$$;

revoke all on function public.record_pending_expense(uuid, text, text, integer) from public;
grant execute on function public.record_pending_expense(uuid, text, text, integer) to authenticated;
