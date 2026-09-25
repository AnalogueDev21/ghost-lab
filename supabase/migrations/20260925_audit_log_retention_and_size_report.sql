-- Keep the security audit trail small without touching bills or financial data.
-- Audit rows older than 14 days are removed by a daily pg_cron job.

create or replace function public.cleanup_old_audit_logs(retention_days integer default 14)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  removed_count bigint := 0;
begin
  if retention_days < 1 or retention_days > 3650 then
    raise exception 'retention_days must be between 1 and 3650';
  end if;

  if to_regclass('public.audit_log') is null then
    return 0;
  end if;

  execute format(
    'delete from public.audit_log where created_at < now() - make_interval(days => %s)',
    retention_days
  );
  get diagnostics removed_count = row_count;
  return removed_count;
end;
$$;

revoke all on function public.cleanup_old_audit_logs(integer) from public;
grant execute on function public.cleanup_old_audit_logs(integer) to service_role;

-- Owner/GOD can inspect which application tables consume database space.
create or replace function public.database_table_sizes()
returns table (
  table_name text,
  row_estimate bigint,
  total_bytes bigint,
  total_size text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.staff_role;
begin
  select s.role into actor_role
  from public.staff s
  where s.auth_user_id = auth.uid()
    and s.active = true
  limit 1;

  if actor_role is null or actor_role not in ('owner', 'god') then
    raise exception 'Only an active Owner or GOD can inspect database size';
  end if;

  return query
  select
    (n.nspname || '.' || c.relname)::text,
    greatest(c.reltuples::bigint, 0),
    pg_total_relation_size(c.oid),
    pg_size_pretty(pg_total_relation_size(c.oid))
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'm', 'p')
    and n.nspname = 'public'
  order by pg_total_relation_size(c.oid) desc;
end;
$$;

revoke all on function public.database_table_sizes() from public;
grant execute on function public.database_table_sizes() to authenticated;

-- Supabase projects expose pg_cron in the cron schema. If it is unavailable,
-- the retention function remains callable manually and the migration succeeds.
do $job$
begin
  if to_regnamespace('cron') is not null then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'ghost-lab-audit-log-retention';

    perform cron.schedule(
      'ghost-lab-audit-log-retention',
      '15 3 * * *',
      $sql$select public.cleanup_old_audit_logs(14);$sql$
    );
  end if;
exception
  when undefined_table or undefined_function then
    null;
end;
$job$;
