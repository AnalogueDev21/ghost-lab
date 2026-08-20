-- Changing an active member's package revises the existing payment instead
-- of creating a second full payment. For example: Regular ¥30,000 -> Gold
-- ¥100,000 changes central cash by only +¥70,000.
create or replace function public.adjust_active_membership_plan(
  p_member_id uuid,
  p_tier text
)
returns table (previous_total integer, new_total integer, adjustment integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_staff_id uuid;
  target_membership public.member_memberships%rowtype;
  target_monthly_fee integer;
  target_total integer;
begin
  select id into current_staff_id
  from public.staff
  where auth_user_id = auth.uid();

  if not exists (
    select 1 from public.staff
    where id = current_staff_id and role::text in ('owner', 'god')
  ) then
    raise exception 'Only Owner or GOD can adjust an active membership payment';
  end if;

  target_monthly_fee := case lower(p_tier)
    when 'regular' then 30000
    when 'silver' then 80000
    when 'gold' then 100000
    else null
  end;
  if target_monthly_fee is null then
    raise exception 'Unknown membership tier: %', p_tier;
  end if;

  select * into target_membership
  from public.member_memberships
  where member_id = p_member_id and expires_at >= now()
  order by created_at desc
  limit 1;
  if target_membership.id is null then
    raise exception 'No active membership payment was found for this member';
  end if;

  target_total := target_monthly_fee * greatest(1, target_membership.months);

  update public.member_memberships
  set tier = lower(p_tier), monthly_fee = target_monthly_fee, total_paid = target_total
  where id = target_membership.id;

  update public.cash_ledger
  set amount = target_total,
      description = 'ค่าสมาชิก ' || initcap(lower(p_tier)) || ' · ' || target_membership.months || ' เดือน'
  where membership_id = target_membership.id;

  if not found then
    insert into public.cash_ledger (entry_type, amount, description, membership_id)
    values ('membership_income', target_total,
      'ค่าสมาชิก ' || initcap(lower(p_tier)) || ' · ' || target_membership.months || ' เดือน',
      target_membership.id);
  end if;

  update public.members
  set tier = lower(p_tier),
      membership_fee = target_monthly_fee,
      membership_started_at = target_membership.started_at,
      membership_expires_at = target_membership.expires_at
  where id = p_member_id;

  return query select target_membership.total_paid, target_total, target_total - target_membership.total_paid;
end;
$$;

-- Repair older records made before package changes were linked to cash.
-- It only adjusts the latest active membership for each active member.
with latest_active_membership as (
  select distinct on (membership.member_id) membership.id, membership.member_id
  from public.member_memberships as membership
  join public.members as member on member.id = membership.member_id
  where member.archived_at is null
    and member.membership_expires_at >= now()
    and membership.expires_at >= now()
  order by membership.member_id, membership.created_at desc
), corrected_memberships as (
  update public.member_memberships as membership
  set tier = lower(member.tier),
      monthly_fee = case lower(member.tier) when 'gold' then 100000 when 'silver' then 80000 else 30000 end,
      total_paid = greatest(1, membership.months) * case lower(member.tier) when 'gold' then 100000 when 'silver' then 80000 else 30000 end
  from public.members as member
  join latest_active_membership as latest on latest.member_id = member.id
  where membership.id = latest.id
  returning membership.id, membership.tier, membership.months, membership.total_paid
)
update public.cash_ledger as ledger
set amount = membership.total_paid,
    description = 'ค่าสมาชิก ' || initcap(membership.tier) || ' · ' || membership.months || ' เดือน'
from corrected_memberships as membership
where ledger.membership_id = membership.id;
