-- Login and signup screens read these rows before a user has authenticated.
-- RLS still limits access; these grants only allow the anon role to reach the
-- existing public SELECT policies.
grant select on table public.staff to anon;
grant select on table public.branches to anon;
