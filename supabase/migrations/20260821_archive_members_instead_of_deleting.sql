-- Soft-delete customers so the directory stays clean without destroying
-- memberships, bill history or financial audit records.
alter table public.members
add column if not exists archived_at timestamptz;

create index if not exists members_active_directory_idx
on public.members (archived_at)
where archived_at is null;
