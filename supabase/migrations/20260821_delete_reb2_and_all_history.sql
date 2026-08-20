-- DESTRUCTIVE ONE-TIME CLEANUP: permanently delete the staff account named
-- Reb2 and all of their bills/attendance. Run only after confirming the name.
do $$
declare
  target_staff_id uuid;
  target_auth_user_id uuid;
  target_count integer;
begin
  select count(*) into target_count
  from public.staff
  where lower(name_en) = 'reb2';

  if target_count = 0 then
    raise exception 'No staff account named Reb2 was found.';
  end if;
  if target_count > 1 then
    raise exception 'More than one account is named Reb2; stop and choose by staff id.';
  end if;

  select id, auth_user_id
  into target_staff_id, target_auth_user_id
  from public.staff
  where lower(name_en) = 'reb2';

  update public.stock_items as item
  set quantity = item.quantity + returned.quantity,
      updated_at = now()
  from (
    select movement.stock_item_id, sum(-movement.change)::integer as quantity
    from public.stock_movements as movement
    join public.bills as bill on bill.id = movement.bill_id
    where bill.staff_id = target_staff_id and movement.change < 0
    group by movement.stock_item_id
  ) as returned
  where item.id = returned.stock_item_id;

  delete from public.cash_ledger
  where bill_id in (select id from public.bills where staff_id = target_staff_id);

  delete from public.member_rewards
  where earned_from_bill_id in (select id from public.bills where staff_id = target_staff_id);

  update public.member_rewards
  set status = 'available', redeemed_bill_id = null, redeemed_at = null
  where redeemed_bill_id in (select id from public.bills where staff_id = target_staff_id);

  delete from public.stock_movements
  where bill_id in (select id from public.bills where staff_id = target_staff_id);
  delete from public.bills where staff_id = target_staff_id;
  delete from public.attendance where staff_id = target_staff_id;
  delete from public.pay_periods where staff_id = target_staff_id;

  update public.expenses set staff_id = null where staff_id = target_staff_id;
  update public.cash_ledger set created_by = null where created_by = target_staff_id;
  update public.stock_items set updated_by = null where updated_by = target_staff_id;

  delete from public.staff where id = target_staff_id;

  update public.members as member
  set total_spent = coalesce((select sum(bill.total) from public.bills as bill where bill.member_id = member.id), 0),
      visits = (select count(*) from public.bills as bill where bill.member_id = member.id),
      repair_visits = (select count(*) from public.member_repair_visits as visit where visit.member_id = member.id);

  if target_auth_user_id is not null then
    delete from auth.users where id = target_auth_user_id;
  end if;
end;
$$;
