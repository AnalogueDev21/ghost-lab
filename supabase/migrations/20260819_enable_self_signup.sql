-- Allow a newly authenticated employee to create their own active staff row.
-- They cannot choose an elevated role or assign a branch that does not match
-- the starter role.
create policy staff_insert_self_signup on staff
for insert
with check (
  auth_user_id = auth.uid()
  and active = true
  and pin_hash = 'managed-by-supabase-auth'
  and (
    (role = 'mechanic_trainee' and exists (
      select 1 from branches
      where branches.id = primary_branch and branches.key = 'garage'
    ))
    or (role = 'chill_staff' and exists (
      select 1 from branches
      where branches.id = primary_branch and branches.key = 'chill'
    ))
  )
);
