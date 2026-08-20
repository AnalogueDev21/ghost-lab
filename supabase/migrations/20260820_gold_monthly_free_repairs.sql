-- Gold members earn one free-repair coupon for every paid membership month.
alter table member_memberships
  add column if not exists months integer not null default 1 check (months > 0),
  add column if not exists total_paid integer not null default 0 check (total_paid >= 0);

create or replace function public.award_gold_membership_repairs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tier = 'gold' then
    insert into member_rewards (member_id, reward_type, status)
    select new.member_id, 'free_repair', 'available'
    from generate_series(1, new.months);
  end if;
  return new;
end;
$$;

drop trigger if exists member_membership_awards_gold_repairs on member_memberships;
create trigger member_membership_awards_gold_repairs
after insert on member_memberships
for each row execute function public.award_gold_membership_repairs();
