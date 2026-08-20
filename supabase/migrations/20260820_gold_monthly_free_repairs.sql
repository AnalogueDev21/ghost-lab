-- Membership duration is stored for reporting and expiry calculations.
alter table member_memberships
  add column if not exists months integer not null default 1 check (months > 0),
  add column if not exists total_paid integer not null default 0 check (total_paid >= 0);
