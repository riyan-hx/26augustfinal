-- Replace a practice's weekly hours in one transaction, so a failed insert
-- never leaves the practice with no hours (the old client did delete + insert).
create or replace function public.replace_availability(p_rules jsonb)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  n int;
begin
  if me is null then
    perform private.raise_api_error('UNAUTHENTICATED', 'Sign in to change your hours.');
  end if;
  if jsonb_typeof(coalesce(p_rules, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_rules, '[]'::jsonb)) > 50 then
    perform private.raise_api_error('VALIDATION_FAILED', 'Too many time ranges.');
  end if;

  delete from public.availability_rules where psychologist_id = me;
  insert into public.availability_rules (psychologist_id, weekday, start_time, end_time)
  select me, (r ->> 'weekday')::smallint, (r ->> 'start_time')::time, (r ->> 'end_time')::time
    from jsonb_array_elements(coalesce(p_rules, '[]'::jsonb)) r;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.replace_availability(jsonb) from public, anon;
grant execute on function public.replace_availability(jsonb) to authenticated;
