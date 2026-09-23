-- Route Discord audit messages by the stable branch key instead of the
-- display name. The restaurant was renamed from Ghost Chill to SABINAGISA,
-- so matching the word "chill" in branches.name sent its logs to Ghost Lab.
do $migration$
declare
  function_definition text;
  old_branch_detection constant text :=
    'is_chill := lower(coalesce(branch_name, '''')) like ''%chill%'';';
  new_branch_detection constant text :=
    'select (br.key = ''chill'') into is_chill from public.branches br where br.id = new.branch_id; is_chill := coalesce(is_chill, false) or lower(coalesce(branch_name, '''')) in (''sabinagisa'', ''ghost chill'');';
begin
  select pg_get_functiondef('public.notify_discord_audit()'::regprocedure)
  into function_definition;

  if strpos(function_definition, old_branch_detection) = 0 then
    raise exception 'Expected Discord branch-routing expression was not found';
  end if;

  function_definition := replace(
    function_definition,
    old_branch_detection,
    new_branch_detection
  );

  function_definition := replace(function_definition, 'GHOST CHILL · ORDERS', 'SABINAGISA · ORDERS');
  function_definition := replace(function_definition, 'GHOST CHILL · KITCHEN', 'SABINAGISA · KITCHEN');
  function_definition := replace(function_definition, 'GHOST CHILL · FINANCE', 'SABINAGISA · FINANCE');
  function_definition := replace(function_definition, 'GHOST CHILL · STOCK', 'SABINAGISA · STOCK');

  execute function_definition;
end
$migration$;

