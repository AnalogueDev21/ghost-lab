-- Give selected staff a narrowly-scoped permission to cancel only bills they
-- opened. The RPC reverses all money, stock and member side effects first.
alter table public.staff drop constraint if exists staff_permissions_allowed;
alter table public.staff add constraint staff_permissions_allowed check (
  permissions <@ array['garage_access', 'chill_access', 'members_access', 'stock_access', 'bill_delete_own']::text[]
);

create or replace function public.delete_own_bill(target_bill_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_bill public.bills%rowtype;
  actor public.staff%rowtype;
  used_stock record;
begin
  select * into actor
  from public.staff
  where auth_user_id = auth.uid() and active = true;

  if actor.id is null then
    raise exception 'No active staff account is linked to this login';
  end if;

  select * into target_bill from public.bills where id = target_bill_id;
  if target_bill.id is null then
    raise exception 'Bill not found';
  end if;

  if target_bill.staff_id <> actor.id
     or (actor.role <> 'owner' and not ('bill_delete_own' = any(actor.permissions))) then
    raise exception 'You may only delete your own bills when this permission is granted';
  end if;

  -- Return every material that was deducted for this bill.
  for used_stock in
    select stock_item_id, sum(-change)::integer as quantity_to_return
    from public.stock_movements
    where bill_id = target_bill.id and change < 0
    group by stock_item_id
  loop
    update public.stock_items
    set quantity = quantity + used_stock.quantity_to_return,
        updated_by = actor.id,
        updated_at = now()
    where id = used_stock.stock_item_id;
  end loop;

  -- Reverse customer totals and any repair reward earned/redeemed by this bill.
  if target_bill.member_id is not null then
    update public.members
    set total_spent = greatest(0, total_spent - target_bill.total),
        visits = greatest(0, visits - 1)
    where id = target_bill.member_id;

    if exists (select 1 from public.member_repair_visits where bill_id = target_bill.id) then
      update public.members
      set repair_visits = greatest(0, repair_visits - 1)
      where id = target_bill.member_id;
    end if;
  end if;

  delete from public.member_rewards where earned_from_bill_id = target_bill.id;
  update public.member_rewards
  set status = 'available', redeemed_bill_id = null, redeemed_at = null
  where redeemed_bill_id = target_bill.id;

  -- The ledger references the bill, so remove it before deleting the bill.
  delete from public.cash_ledger where bill_id = target_bill.id;
  delete from public.stock_movements where bill_id = target_bill.id;
  delete from public.bills where id = target_bill.id;
end;
$$;

revoke all on function public.delete_own_bill(uuid) from public;
grant execute on function public.delete_own_bill(uuid) to authenticated;
