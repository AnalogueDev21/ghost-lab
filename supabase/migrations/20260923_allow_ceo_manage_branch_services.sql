-- CEO may manage the service/menu catalog only for their assigned branch.
-- Owner and GOD retain global access.

drop policy if exists services_write on public.services;
drop policy if exists services_write_owner on public.services;
drop policy if exists services_write_owner_ceo_branch on public.services;

create policy services_write_owner_ceo_branch
on public.services
for all
to authenticated
using (
  public.is_god()
  or exists (
    select 1
    from public.staff actor
    where actor.auth_user_id = auth.uid()
      and actor.active = true
      and (
        actor.role::text = 'owner'
        or (
          actor.role::text = 'ceo'
          and actor.primary_branch = services.branch_id
        )
      )
  )
)
with check (
  public.is_god()
  or exists (
    select 1
    from public.staff actor
    where actor.auth_user_id = auth.uid()
      and actor.active = true
      and (
        actor.role::text = 'owner'
        or (
          actor.role::text = 'ceo'
          and actor.primary_branch = services.branch_id
        )
      )
  )
);

drop policy if exists service_materials_write on public.service_materials;
drop policy if exists service_materials_write_owner on public.service_materials;
drop policy if exists service_materials_write_owner_ceo_branch on public.service_materials;

create policy service_materials_write_owner_ceo_branch
on public.service_materials
for all
to authenticated
using (
  exists (
    select 1
    from public.services service
    join public.staff actor on actor.auth_user_id = auth.uid()
    where service.id = service_materials.service_id
      and actor.active = true
      and (
        public.is_god()
        or actor.role::text = 'owner'
        or (
          actor.role::text = 'ceo'
          and actor.primary_branch = service.branch_id
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.services service
    join public.staff actor on actor.auth_user_id = auth.uid()
    where service.id = service_materials.service_id
      and actor.active = true
      and (
        public.is_god()
        or actor.role::text = 'owner'
        or (
          actor.role::text = 'ceo'
          and actor.primary_branch = service.branch_id
        )
      )
  )
);

drop policy if exists "Managers upload service images" on storage.objects;

create policy "Managers upload service images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'service-images'
  and exists (
    select 1
    from public.staff actor
    left join public.branches branch on branch.id = actor.primary_branch
    where actor.auth_user_id = auth.uid()
      and actor.active = true
      and (
        public.is_god()
        or actor.role::text = 'owner'
        or (
          actor.role::text in ('ceo', 'chill_manager')
          and (storage.foldername(name))[1] = branch.key::text
        )
      )
  )
);
