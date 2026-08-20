-- Loyalty: every ten eligible repair visits earns one free-repair coupon.
alter table services add column if not exists loyalty_eligible boolean not null default false;
alter table members add column if not exists repair_visits integer not null default 0;

create table if not exists member_rewards (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  reward_type text not null default 'free_repair' check (reward_type = 'free_repair'),
  status text not null default 'available' check (status in ('available', 'redeemed', 'expired')),
  earned_from_bill_id uuid unique references bills(id) on delete restrict,
  redeemed_bill_id uuid references bills(id),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);

create table if not exists member_repair_visits (
  member_id uuid not null references members(id) on delete cascade,
  bill_id uuid primary key references bills(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table member_rewards enable row level security;
create policy member_rewards_read on member_rewards for select using (auth.uid() is not null);

-- Runs once per bill even if a bill contains several repair services.
create or replace function public.track_member_repair_visit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_member_id uuid;
  updated_repair_visits integer;
begin
  if not exists (select 1 from services where id = new.service_id and loyalty_eligible) then
    return new;
  end if;
  select member_id into target_member_id from bills where id = new.bill_id;
  if target_member_id is null then return new; end if;

  insert into member_repair_visits (member_id, bill_id)
  values (target_member_id, new.bill_id)
  on conflict (bill_id) do nothing;
  if not found then return new; end if;

  update members
  set repair_visits = repair_visits + 1
  where id = target_member_id
  returning repair_visits into updated_repair_visits;

  if mod(updated_repair_visits, 10) = 0 then
    insert into member_rewards (member_id, earned_from_bill_id)
    values (target_member_id, new.bill_id);
  end if;
  return new;
end;
$$;

drop trigger if exists bill_item_tracks_member_repair_visit on bill_items;
create trigger bill_item_tracks_member_repair_visit
after insert on bill_items
for each row execute function public.track_member_repair_visit();
