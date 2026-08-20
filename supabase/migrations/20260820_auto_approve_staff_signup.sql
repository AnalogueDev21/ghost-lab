-- Make new staff sign-ups visible in Login immediately.
-- Starter roles remain restricted to their selected branch.
drop policy if exists staff_insert_self_signup on staff;

create policy staff_insert_self_signup on staff
for insert
with check (
  auth_user_id = auth.uid()
  and active = true
  and pin_hash = 'managed-by-supabase-auth'
  and (
    (role = 'mechanic_trainee' and exists (
      select 1 from branches where branches.id = primary_branch and branches.key = 'garage'
    ))
    or (role = 'chill_staff' and exists (
      select 1 from branches where branches.id = primary_branch and branches.key = 'chill'
    ))
  )
);
