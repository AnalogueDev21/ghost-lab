-- Staff in the same branch need a shared job history. They still cannot see
-- another branch unless they are an owner/accountant or assigned to it.
create or replace function public.can_view_branch_bills(target_branch_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.staff as actor
    where actor.auth_user_id = auth.uid()
      and actor.active = true
      and (
        actor.primary_branch = target_branch_id
        or actor.role in ('owner', 'accountant')
      )
  );
$$;

revoke all on function public.can_view_branch_bills(uuid) from public;
grant execute on function public.can_view_branch_bills(uuid) to authenticated;

drop policy if exists bills_select on public.bills;
create policy bills_select
on public.bills
for select
to authenticated
using (public.can_view_branch_bills(branch_id));

drop policy if exists bill_items_select on public.bill_items;
create policy bill_items_select
on public.bill_items
for select
to authenticated
using (
  exists (
    select 1
    from public.bills as bill
    where bill.id = bill_items.bill_id
      and public.can_view_branch_bills(bill.branch_id)
  )
);
