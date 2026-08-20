-- Monthly membership plans and billing discounts.
-- Regular: ¥30,000/month  (5% at ¥50,000, 7% at ¥100,000)
-- Silver:  ¥80,000/month  (5% at ¥50,000, 10% at ¥100,000)
-- Gold:    ¥100,000/month (5% at ¥50,000, 10% at ¥100,000)

alter table members
  add column if not exists membership_started_at timestamptz,
  add column if not exists membership_expires_at timestamptz,
  add column if not exists membership_fee integer;

create table if not exists member_memberships (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  tier text not null check (tier in ('regular', 'silver', 'gold')),
  monthly_fee integer not null check (monthly_fee >= 0),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table member_memberships enable row level security;

drop policy if exists member_memberships_read on member_memberships;
create policy member_memberships_read on member_memberships
for select using (auth.uid() is not null);

drop policy if exists member_memberships_write on member_memberships;
create policy member_memberships_write on member_memberships
for all using (auth.uid() is not null) with check (auth.uid() is not null);
