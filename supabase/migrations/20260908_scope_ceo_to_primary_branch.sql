-- CEO can operate every part of the assigned branch, but never another branch.
create or replace function public.can_access_branch(target_branch uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff s
    where s.auth_user_id = auth.uid()
      and s.active = true
      and (
        s.role::text in ('owner', 'god')
        or s.role::text <> 'ceo'
        or s.primary_branch = target_branch
      )
  );
$$;

drop policy if exists services_read on public.services;
create policy services_read on public.services for select to authenticated
using (public.can_access_branch(branch_id));

drop policy if exists service_materials_read on public.service_materials;
create policy service_materials_read on public.service_materials for select to authenticated
using (exists (
  select 1 from public.services s
  where s.id = service_materials.service_id
    and public.can_access_branch(s.branch_id)
));

drop policy if exists expenses_read on public.expenses;
create policy expenses_read on public.expenses for select to authenticated
using (branch_id is null or public.can_access_branch(branch_id));

drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated
using (branch_id is null or public.can_access_branch(branch_id));

drop policy if exists members_write on public.members;
create policy members_write on public.members for all to authenticated
using (branch_id is null or public.can_access_branch(branch_id))
with check (branch_id is null or public.can_access_branch(branch_id));

drop policy if exists stock_access on public.stock_items;
create policy stock_access on public.stock_items for all to authenticated
using (
  public.is_god()
  or public.has_granted_permission('stock_access')
  or exists (
    select 1 from public.staff s
    where s.auth_user_id = auth.uid()
      and s.active = true
      and (
        s.role::text in ('owner', 'stock_keeper')
        or (s.role::text = 'ceo' and s.primary_branch = stock_items.branch_id)
      )
  )
)
with check (
  public.is_god()
  or public.has_granted_permission('stock_access')
  or exists (
    select 1 from public.staff s
    where s.auth_user_id = auth.uid()
      and s.active = true
      and (
        s.role::text in ('owner', 'stock_keeper')
        or (s.role::text = 'ceo' and s.primary_branch = stock_items.branch_id)
      )
  )
);

drop policy if exists pay_periods_ceo_branch on public.pay_periods;
create policy pay_periods_ceo_branch on public.pay_periods for all to authenticated
using (exists (
  select 1
  from public.staff actor
  join public.staff target on target.id = pay_periods.staff_id
  where actor.auth_user_id = auth.uid()
    and actor.active = true
    and actor.role::text = 'ceo'
    and actor.primary_branch = target.primary_branch
))
with check (exists (
  select 1
  from public.staff actor
  join public.staff target on target.id = pay_periods.staff_id
  where actor.auth_user_id = auth.uid()
    and actor.active = true
    and actor.role::text = 'ceo'
    and actor.primary_branch = target.primary_branch
));

drop policy if exists member_memberships_read on public.member_memberships;
create policy member_memberships_read on public.member_memberships for select to authenticated
using (exists (
  select 1 from public.members m
  where m.id = member_memberships.member_id
    and (m.branch_id is null or public.can_access_branch(m.branch_id))
));

drop policy if exists member_memberships_write on public.member_memberships;
create policy member_memberships_write on public.member_memberships for all to authenticated
using (exists (
  select 1 from public.members m
  where m.id = member_memberships.member_id
    and (m.branch_id is null or public.can_access_branch(m.branch_id))
))
with check (exists (
  select 1 from public.members m
  where m.id = member_memberships.member_id
    and (m.branch_id is null or public.can_access_branch(m.branch_id))
));

drop policy if exists member_rewards_read on public.member_rewards;
create policy member_rewards_read on public.member_rewards for select to authenticated
using (exists (
  select 1 from public.members m
  where m.id = member_rewards.member_id
    and (m.branch_id is null or public.can_access_branch(m.branch_id))
));
