-- Let active Owner/GOD accounts reset a staff PIN without exposing the
-- service-role key to the browser. The app signs in with `<4 digits>-glab`.
create or replace function public.reset_staff_pin(target_staff_id uuid, new_pin text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  actor public.staff%rowtype;
  target public.staff%rowtype;
begin
  select * into actor
  from public.staff
  where auth_user_id = auth.uid() and active = true;

  if actor.id is null or actor.role::text not in ('owner', 'god') then
    raise exception 'Only an active Owner or GOD can reset staff PINs';
  end if;

  if new_pin is null or new_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must contain exactly 4 digits';
  end if;

  select * into target from public.staff where id = target_staff_id;
  if target.id is null then raise exception 'Staff account not found'; end if;
  if target.auth_user_id is null then raise exception 'Staff account is not linked to Auth'; end if;
  if target.role::text = 'god' and actor.role::text <> 'god' then
    raise exception 'Only GOD can reset another GOD account';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(new_pin || '-glab', extensions.gen_salt('bf')),
      updated_at = now()
  where id = target.auth_user_id;

  if not found then raise exception 'Linked Auth user was not found'; end if;
end;
$$;

revoke all on function public.reset_staff_pin(uuid, text) from public;
grant execute on function public.reset_staff_pin(uuid, text) to authenticated;

-- CEO can open a bill only in the CEO's assigned branch. This keeps the
-- branch boundary while granting the same POS action as the branch team.
drop policy if exists bills_insert on public.bills;
create policy bills_insert on public.bills
for insert to authenticated
with check (
  exists (
    select 1
    from public.staff actor
    where actor.auth_user_id = auth.uid()
      and actor.active = true
      and actor.id = bills.staff_id
      and (
        actor.role::text in (
          'owner', 'god', 'mechanic', 'mechanic_trainee',
          'head_mechanic', 'chill_staff', 'chill_manager'
        )
        or (actor.role::text = 'ceo' and actor.primary_branch = bills.branch_id)
        or (
          'garage_access' = any(actor.permissions)
          and exists (select 1 from public.branches where id = bills.branch_id and key = 'garage')
        )
        or (
          'chill_access' = any(actor.permissions)
          and exists (select 1 from public.branches where id = bills.branch_id and key = 'chill')
        )
      )
  )
);

-- Keep line-item insertion aligned with bill ownership. A CEO-created bill has
-- bill.staff_id = actor.id, so the same branch-scoped bill remains writable.
create or replace function public.can_insert_bill_item(target_bill_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.bills bill
    join public.staff actor on actor.auth_user_id = auth.uid()
    where bill.id = target_bill_id
      and actor.active = true
      and (
        bill.staff_id = actor.id
        or actor.role::text in ('owner', 'god', 'head_mechanic', 'chill_manager')
        or (actor.role::text = 'ceo' and actor.primary_branch = bill.branch_id)
      )
  );
$$;

revoke all on function public.can_insert_bill_item(uuid) from public;
grant execute on function public.can_insert_bill_item(uuid) to authenticated;
