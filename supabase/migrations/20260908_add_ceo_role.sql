-- CEO is a branch-scoped executive: unlike owner, every query must remain
-- limited by primary_branch through the existing branch-aware policies.
alter type public.staff_role add value if not exists 'ceo';

create or replace function public.is_branch_lead(target_branch uuid)
returns boolean as $$
  select exists (
    select 1 from public.staff s
    where s.auth_user_id = auth.uid()
      and (s.role = 'owner'
        or (s.role in ('ceo','head_mechanic','chill_manager')
            and s.primary_branch = target_branch))
  );
$$ language sql stable security definer set search_path = public;
