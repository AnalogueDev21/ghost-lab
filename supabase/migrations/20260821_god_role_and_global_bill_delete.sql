-- GOD is the highest in-app role. Assign it only to a trusted owner account.
alter type public.staff_role add value if not exists 'god';

create or replace function public.is_god()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.staff
    where auth_user_id = auth.uid() and active = true and role::text = 'god'
  );
$$;

revoke all on function public.is_god() from public;
grant execute on function public.is_god() to authenticated;

-- Let GOD administer staff records, in addition to the existing owner role.
drop policy if exists staff_insert_owner on public.staff;
drop policy if exists staff_update_owner on public.staff;
drop policy if exists staff_delete_owner on public.staff;
create policy staff_insert_owner on public.staff for insert to authenticated
with check (public.is_god() or exists (select 1 from public.staff where auth_user_id = auth.uid() and role::text = 'owner'));
create policy staff_update_owner on public.staff for update to authenticated
using (public.is_god() or exists (select 1 from public.staff where auth_user_id = auth.uid() and role::text = 'owner'));
create policy staff_delete_owner on public.staff for delete to authenticated
using (public.is_god() or exists (select 1 from public.staff where auth_user_id = auth.uid() and role::text = 'owner'));

-- GOD can see every branch's bill history.
create or replace function public.can_view_branch_bills(target_branch_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.staff as actor
    where actor.auth_user_id = auth.uid() and actor.active = true
      and (actor.primary_branch = target_branch_id or actor.role::text in ('owner', 'accountant', 'god'))
  );
$$;

-- GOD may create bills if needed and manage inventory/central cash like Owner.
drop policy if exists bills_insert on public.bills;
create policy bills_insert on public.bills for insert to authenticated with check (
  staff_id = (select id from public.staff where auth_user_id = auth.uid())
  and (
    exists (select 1 from public.staff where auth_user_id = auth.uid() and role::text = any(array['mechanic','mechanic_trainee','chill_staff','head_mechanic','chill_manager','owner','god']))
    or (public.has_granted_permission('garage_access') and exists (select 1 from public.branches where id = branch_id and key = 'garage'))
    or (public.has_granted_permission('chill_access') and exists (select 1 from public.branches where id = branch_id and key = 'chill'))
  )
);

drop policy if exists stock_access on public.stock_items;
create policy stock_access on public.stock_items for all to authenticated
using (public.is_god() or exists (select 1 from public.staff where auth_user_id = auth.uid() and role::text in ('stock_keeper','owner')) or public.has_granted_permission('stock_access'))
with check (public.is_god() or exists (select 1 from public.staff where auth_user_id = auth.uid() and role::text in ('stock_keeper','owner')) or public.has_granted_permission('stock_access'));

-- Atomically reverse a bill regardless of the staff member who opened it.
create or replace function public.delete_any_bill_as_god(target_bill_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_bill public.bills%rowtype;
  actor_id uuid;
  used_stock record;
begin
  if not public.is_god() then
    raise exception 'Only GOD may delete another staff member''s bill';
  end if;
  select id into actor_id from public.staff where auth_user_id = auth.uid();
  select * into target_bill from public.bills where id = target_bill_id;
  if target_bill.id is null then raise exception 'Bill not found'; end if;

  for used_stock in
    select stock_item_id, sum(-change)::integer as quantity_to_return
    from public.stock_movements
    where bill_id = target_bill.id and change < 0
    group by stock_item_id
  loop
    update public.stock_items set quantity = quantity + used_stock.quantity_to_return,
      updated_by = actor_id, updated_at = now()
    where id = used_stock.stock_item_id;
  end loop;

  if target_bill.member_id is not null then
    update public.members set total_spent = greatest(0, total_spent - target_bill.total), visits = greatest(0, visits - 1)
    where id = target_bill.member_id;
    if exists (select 1 from public.member_repair_visits where bill_id = target_bill.id) then
      update public.members set repair_visits = greatest(0, repair_visits - 1) where id = target_bill.member_id;
    end if;
  end if;

  delete from public.member_rewards where earned_from_bill_id = target_bill.id;
  update public.member_rewards set status = 'available', redeemed_bill_id = null, redeemed_at = null where redeemed_bill_id = target_bill.id;
  delete from public.cash_ledger where bill_id = target_bill.id;
  delete from public.stock_movements where bill_id = target_bill.id;
  delete from public.bills where id = target_bill.id;
end;
$$;

revoke all on function public.delete_any_bill_as_god(uuid) from public;
grant execute on function public.delete_any_bill_as_god(uuid) to authenticated;
