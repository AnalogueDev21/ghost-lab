-- One central financial ledger. Income and expenses are recorded automatically
-- from bills, membership payments, and paid expense records.

alter table cash_ledger drop constraint if exists cash_ledger_entry_type_check;
alter table cash_ledger
  add constraint cash_ledger_entry_type_check
  check (entry_type in ('opening_balance', 'purchase', 'bill_income', 'membership_income', 'manual_adjustment'));

alter table cash_ledger
  add column if not exists bill_id uuid unique references bills(id) on delete restrict,
  add column if not exists membership_id uuid unique references member_memberships(id) on delete restrict;

create or replace function public.record_bill_income()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.total <> 0 then
    insert into cash_ledger (entry_type, amount, description, bill_id, created_by)
    values ('bill_income', new.total, 'รายรับจากบิล ' || new.bill_number, new.id, new.staff_id)
    on conflict (bill_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists bill_records_financial_income on bills;
create trigger bill_records_financial_income
after insert on bills
for each row execute function public.record_bill_income();

create or replace function public.record_membership_income()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.total_paid > 0 then
    insert into cash_ledger (entry_type, amount, description, membership_id)
    values (
      'membership_income',
      new.total_paid,
      'ค่าสมาชิก ' || initcap(new.tier) || ' · ' || new.months || ' เดือน',
      new.id
    )
    on conflict (membership_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists membership_records_financial_income on member_memberships;
create trigger membership_records_financial_income
after insert on member_memberships
for each row execute function public.record_membership_income();

create or replace function public.record_paid_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'paid' then
    insert into cash_ledger (entry_type, amount, description, expense_id, created_by)
    values ('purchase', -new.amount, new.description, new.id, new.staff_id)
    on conflict (expense_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists expense_records_financial_outflow on expenses;
create trigger expense_records_financial_outflow
after insert or update on expenses
for each row execute function public.record_paid_expense();

-- Replace the old RPC so cash purchases rely on the expense trigger above.
create or replace function public.record_cash_purchase(
  p_branch_id uuid,
  p_category text,
  p_description text,
  p_amount integer
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_expense_id uuid;
  current_staff_id uuid;
begin
  select id into current_staff_id from staff where auth_user_id = auth.uid();
  if not exists (select 1 from staff where id = current_staff_id and role = 'owner') then
    raise exception 'Only the owner can record central cash purchases';
  end if;
  if p_amount <= 0 or btrim(p_description) = '' then
    raise exception 'A positive amount and description are required';
  end if;

  insert into expenses (branch_id, category, description, amount, staff_id, status, paid_at)
  values (p_branch_id, p_category, btrim(p_description), p_amount, current_staff_id, 'paid', now())
  returning id into new_expense_id;
  return new_expense_id;
end;
$$;

create or replace function public.record_cash_adjustment(
  p_amount integer,
  p_description text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  adjustment_id uuid;
  current_staff_id uuid;
begin
  select id into current_staff_id from staff where auth_user_id = auth.uid();
  if not exists (select 1 from staff where id = current_staff_id and role = 'owner') then
    raise exception 'Only the owner can adjust central cash';
  end if;
  if p_amount = 0 or btrim(p_description) = '' then
    raise exception 'An amount and description are required';
  end if;

  insert into cash_ledger (entry_type, amount, description, created_by)
  values ('manual_adjustment', p_amount, btrim(p_description), current_staff_id)
  returning id into adjustment_id;
  return adjustment_id;
end;
$$;

-- Bring existing records into the ledger exactly once.
insert into cash_ledger (entry_type, amount, description, bill_id, created_by)
select 'bill_income', bills.total, 'รายรับจากบิล ' || bills.bill_number, bills.id, bills.staff_id
from bills where bills.total <> 0
on conflict (bill_id) do nothing;

insert into cash_ledger (entry_type, amount, description, membership_id)
select 'membership_income', member_memberships.total_paid,
       'ค่าสมาชิก ' || initcap(member_memberships.tier) || ' · ' || member_memberships.months || ' เดือน',
       member_memberships.id
from member_memberships where member_memberships.total_paid > 0
on conflict (membership_id) do nothing;

insert into cash_ledger (entry_type, amount, description, expense_id, created_by)
select 'purchase', -expenses.amount, expenses.description, expenses.id, expenses.staff_id
from expenses where expenses.status = 'paid'
on conflict (expense_id) do nothing;
