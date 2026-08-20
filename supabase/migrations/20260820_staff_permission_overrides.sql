-- Per-person permission grants. A role remains the default access level;
-- these values only grant additional operational pages selected by the owner.
alter table staff
add column if not exists permissions text[] not null default '{}';

alter table staff
drop constraint if exists staff_permissions_allowed;

alter table staff
add constraint staff_permissions_allowed check (
  permissions <@ array['garage_access', 'chill_access', 'members_access', 'stock_access']::text[]
);

create or replace function public.has_granted_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff
    where auth_user_id = auth.uid()
      and permission_key = any(permissions)
  );
$$;

-- Make custom Garage/Chill access useful in the POS as well as in the menu.
drop policy if exists bills_insert on bills;
create policy bills_insert on bills for insert with check (
  staff_id = (select id from staff where auth_user_id = auth.uid())
  and (
    exists (select 1 from staff where auth_user_id = auth.uid()
      and role in ('mechanic','mechanic_trainee','chill_staff','head_mechanic','chill_manager','owner'))
    or (has_granted_permission('garage_access') and exists (select 1 from branches where id = branch_id and key = 'garage'))
    or (has_granted_permission('chill_access') and exists (select 1 from branches where id = branch_id and key = 'chill'))
  )
);

drop policy if exists stock_access on stock_items;
create policy stock_access on stock_items for all using (
  exists (select 1 from staff where auth_user_id = auth.uid() and role in ('stock_keeper','owner'))
  or has_granted_permission('stock_access')
) with check (
  exists (select 1 from staff where auth_user_id = auth.uid() and role in ('stock_keeper','owner'))
  or has_granted_permission('stock_access')
);
