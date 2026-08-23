-- Record commission payouts once, include an optional bonus, and deduct the
-- payout from the shared cash ledger in the same database transaction.

alter table public.pay_periods
  add column if not exists commission_amount integer not null default 0,
  add column if not exists bonus integer not null default 0 check (bonus >= 0),
  add column if not exists bill_count integer not null default 0 check (bill_count >= 0);

alter table public.bills
  add column if not exists pay_period_id uuid references public.pay_periods(id) on delete restrict;

create index if not exists bills_unpaid_commission_idx
  on public.bills (staff_id, created_at)
  where pay_period_id is null;

alter table public.cash_ledger drop constraint if exists cash_ledger_entry_type_check;
alter table public.cash_ledger
  add constraint cash_ledger_entry_type_check
  check (entry_type in ('opening_balance', 'purchase', 'bill_income', 'membership_income', 'manual_adjustment', 'payroll'));

alter table public.cash_ledger
  add column if not exists pay_period_id uuid unique references public.pay_periods(id) on delete restrict;

drop policy if exists pay_periods_finance on public.pay_periods;
create policy pay_periods_finance on public.pay_periods for all to authenticated
using (
  exists (select 1 from public.staff where auth_user_id = auth.uid() and role::text in ('accountant', 'owner', 'god'))
)
with check (
  exists (select 1 from public.staff where auth_user_id = auth.uid() and role::text in ('accountant', 'owner', 'god'))
);

create or replace function public.record_staff_payroll(
  p_staff_id uuid,
  p_bill_ids uuid[],
  p_bonus integer default 0
)
returns public.pay_periods
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staff;
  payment public.pay_periods;
  commission_total integer;
  selected_count integer;
  first_bill_date date;
  last_bill_date date;
begin
  select * into actor from public.staff where auth_user_id = auth.uid() and active = true;
  if actor.id is null or actor.role::text not in ('accountant', 'owner', 'god') then
    raise exception 'ไม่มีสิทธิ์บันทึกการจ่าย';
  end if;
  if coalesce(p_bonus, 0) < 0 then
    raise exception 'โบนัสต้องไม่ติดลบ';
  end if;
  if coalesce(array_length(p_bill_ids, 1), 0) = 0 then
    raise exception 'ไม่มีบิลที่ยังไม่ได้จ่าย';
  end if;

  -- Lock the exact bills shown in the UI. This prevents double payment when
  -- two users press save at nearly the same time.
  perform id from public.bills
  where id = any(p_bill_ids)
    and staff_id = p_staff_id
    and pay_period_id is null
  for update;

  select coalesce(sum(commission), 0), count(*), min(created_at)::date, max(created_at)::date
    into commission_total, selected_count, first_bill_date, last_bill_date
  from public.bills
  where id = any(p_bill_ids)
    and staff_id = p_staff_id
    and pay_period_id is null;

  if selected_count <> array_length(p_bill_ids, 1) then
    raise exception 'มีบางบิลถูกจ่ายไปแล้ว กรุณาโหลดข้อมูลใหม่';
  end if;

  insert into public.pay_periods (
    staff_id, period_start, period_end, amount, commission_amount,
    bonus, bill_count, status, paid_at, paid_by
  ) values (
    p_staff_id, first_bill_date, last_bill_date, commission_total + coalesce(p_bonus, 0), commission_total,
    coalesce(p_bonus, 0), selected_count, 'paid', now(), actor.id
  ) returning * into payment;

  update public.bills
  set pay_period_id = payment.id
  where id = any(p_bill_ids) and staff_id = p_staff_id and pay_period_id is null;

  if payment.amount > 0 then
    insert into public.cash_ledger (entry_type, amount, description, pay_period_id, created_by)
    values (
      'payroll', -payment.amount,
      'จ่ายค่าคอมมิชชัน ' || selected_count || ' บิล' || case when payment.bonus > 0 then ' + โบนัส' else '' end,
      payment.id, actor.id
    );
  end if;

  return payment;
end;
$$;

revoke all on function public.record_staff_payroll(uuid, uuid[], integer) from public;
grant execute on function public.record_staff_payroll(uuid, uuid[], integer) to authenticated;
