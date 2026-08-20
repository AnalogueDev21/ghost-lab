-- A coupon may only be redeemed for a bill opened by the current staff member,
-- and that bill must belong to the same member as the coupon.
drop policy if exists member_rewards_write on member_rewards;
create policy member_rewards_write on member_rewards
for update
using (status = 'available')
with check (
  status = 'redeemed'
  and redeemed_bill_id is not null
  and exists (
    select 1
    from bills
    join staff on staff.id = bills.staff_id
    where bills.id = member_rewards.redeemed_bill_id
      and bills.member_id = member_rewards.member_id
      and staff.auth_user_id = auth.uid()
  )
);
