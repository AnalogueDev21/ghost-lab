-- Fix the policy used when a staff member submits the service lines of a bill.
-- This function reads the bill with definer rights, avoiding an RLS policy
-- lookup on bills from blocking a valid INSERT into bill_items.
create or replace function public.can_insert_bill_item(target_bill_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.bills as bill
    join public.staff as actor on actor.auth_user_id = auth.uid()
    where bill.id = target_bill_id
      and actor.active = true
      and (
        bill.staff_id = actor.id
        or actor.role in ('owner', 'head_mechanic', 'chill_manager')
      )
  );
$$;

revoke all on function public.can_insert_bill_item(uuid) from public;
grant execute on function public.can_insert_bill_item(uuid) to authenticated;

drop policy if exists bill_items_insert on public.bill_items;
create policy bill_items_insert
on public.bill_items
for insert
to authenticated
with check (public.can_insert_bill_item(bill_id));
