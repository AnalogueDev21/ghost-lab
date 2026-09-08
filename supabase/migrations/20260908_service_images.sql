alter table public.services add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('service-images', 'service-images', true)
on conflict (id) do update set public = true;

create policy "Public service images" on storage.objects
for select using (bucket_id = 'service-images');

create policy "Managers upload service images" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'service-images'
  and exists (
    select 1 from public.staff
    where auth_user_id = auth.uid()
      and role::text in ('owner','ceo','chill_manager')
  )
);
