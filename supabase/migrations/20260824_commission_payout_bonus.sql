-- Extend the production Commission Payout flow with optional bonuses and let
-- owners pay staff even when no IC phone number has been recorded.

alter table public.commission_payouts
  add column if not exists bonus integer not null default 0 check (bonus >= 0);

drop function if exists public.pay_staff_commission(uuid, uuid[], text, text);

create function public.pay_staff_commission(
  p_staff_id uuid,
  p_bill_ids uuid[],
  p_reference text default null,
  p_note text default null,
  p_bonus integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staff%rowtype;
  new_payout_id uuid;
  commission_total integer;
  payout_count integer;
  payout_branch uuid;
begin
  select * into actor from public.staff where auth_user_id = auth.uid() and active = true;
  if actor.id is null or actor.role::text not in ('owner', 'god') then
    raise exception 'Owner เท่านั้นที่จ่ายค่าคอมได้';
  end if;
  if coalesce(p_bonus, 0) < 0 then
    raise exception 'โบนัสต้องไม่ติดลบ';
  end if;
  if coalesce(array_length(p_bill_ids, 1), 0) = 0 then
    raise exception 'ไม่มีบิลที่รอจ่าย';
  end if;

  perform id from public.bills where id = any(p_bill_ids) for update;

  if exists (
    select 1 from public.bills b
    where b.id = any(p_bill_ids)
      and (b.staff_id <> p_staff_id or b.status::text = 'rejected' or b.commission <= 0)
  ) then
    raise exception 'พบบิลที่ไม่สามารถจ่ายค่าคอมได้';
  end if;
  if exists (select 1 from public.commission_payout_items i where i.bill_id = any(p_bill_ids)) then
    raise exception 'มีบิลที่ถูกจ่ายค่าคอมแล้ว กรุณารีเฟรช';
  end if;

  select sum(commission), count(*), (array_agg(branch_id))[1]
    into commission_total, payout_count, payout_branch
  from public.bills where id = any(p_bill_ids);

  if payout_count <> array_length(p_bill_ids, 1) or commission_total <= 0 then
    raise exception 'ข้อมูลบิลไม่ครบ';
  end if;
  if (select count(distinct branch_id) from public.bills where id = any(p_bill_ids)) <> 1 then
    raise exception 'กรุณาจ่ายแยกตามสาขา';
  end if;

  insert into public.commission_payouts (
    staff_id, branch_id, total_amount, bonus, bill_count,
    transfer_reference, note, paid_by
  ) values (
    p_staff_id, payout_branch, commission_total + coalesce(p_bonus, 0), coalesce(p_bonus, 0), payout_count,
    nullif(btrim(coalesce(p_reference, '')), ''), nullif(btrim(coalesce(p_note, '')), ''), actor.id
  ) returning id into new_payout_id;

  insert into public.commission_payout_items (payout_id, bill_id, amount)
  select new_payout_id, id, commission from public.bills where id = any(p_bill_ids);

  return new_payout_id;
end;
$$;

revoke all on function public.pay_staff_commission(uuid, uuid[], text, text, integer) from public;
grant execute on function public.pay_staff_commission(uuid, uuid[], text, text, integer) to authenticated;
