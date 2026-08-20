-- Inventory consumption and a single central cash fund.
-- Run this migration in the Supabase SQL editor after the existing schema.

-- Every sold bill item consumes its configured materials.  The movement record
-- keeps an audit trail and connects the deduction back to the bill.
create or replace function public.deduct_service_materials_from_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  material record;
  bill_staff_id uuid;
begin
  select staff_id into bill_staff_id from bills where id = new.bill_id;

  for material in
    select stock_item_id, qty_per_unit
    from service_materials
    where service_id = new.service_id
  loop
    update stock_items
    set quantity = quantity - material.qty_per_unit,
        updated_by = bill_staff_id,
        updated_at = now()
    where id = material.stock_item_id;

    insert into stock_movements (stock_item_id, staff_id, change, reason, bill_id)
    values (
      material.stock_item_id,
      bill_staff_id,
      -material.qty_per_unit,
      'Auto-deducted from service sale',
      new.bill_id
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists bill_item_deducts_materials on bill_items;
create trigger bill_item_deducts_materials
after insert on bill_items
for each row execute function public.deduct_service_materials_from_stock();

-- One ledger is used for the shared operational cash. Positive numbers add
-- money; purchases are recorded as negative numbers. The owner adds any
-- starting cash later through the cash-adjustment control.
create table if not exists cash_ledger (
  id          uuid primary key default gen_random_uuid(),
  entry_type  text not null check (entry_type in ('opening_balance', 'purchase')),
  amount      integer not null check (amount <> 0),
  description text not null,
  expense_id  uuid unique references expenses(id) on delete restrict,
  created_by  uuid references staff(id),
  created_at  timestamptz not null default now()
);

create unique index if not exists cash_ledger_one_opening_balance
on cash_ledger (entry_type) where entry_type = 'opening_balance';

alter table cash_ledger enable row level security;

create policy cash_ledger_owner_only on cash_ledger
for all
using (exists (select 1 from staff where auth_user_id = auth.uid() and role = 'owner'))
with check (exists (select 1 from staff where auth_user_id = auth.uid() and role = 'owner'));

-- Keep all operational setup and fund entries under the owner's control.
drop policy if exists services_write on services;
create policy services_write_owner on services
for all
using (exists (select 1 from staff where auth_user_id = auth.uid() and role = 'owner'))
with check (exists (select 1 from staff where auth_user_id = auth.uid() and role = 'owner'));

drop policy if exists service_materials_write on service_materials;
create policy service_materials_write_owner on service_materials
for all
using (exists (select 1 from staff where auth_user_id = auth.uid() and role = 'owner'))
with check (exists (select 1 from staff where auth_user_id = auth.uid() and role = 'owner'));

drop policy if exists expenses_insert on expenses;
create policy expenses_insert_owner on expenses
for insert
with check (exists (select 1 from staff where auth_user_id = auth.uid() and role = 'owner'));

-- Record an expense and deduct the fund as one database operation, so the two
-- records cannot get out of sync. This RPC is intentionally owner-only.
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

  insert into cash_ledger (entry_type, amount, description, expense_id, created_by)
  values ('purchase', -p_amount, btrim(p_description), new_expense_id, current_staff_id);

  return new_expense_id;
end;
$$;
