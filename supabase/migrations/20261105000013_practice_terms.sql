-- Practitioners confirm Lumid's terms (qualified professional, confidentiality,
-- Terms of Service and Privacy Policy) before their page first goes live.

alter table public.psychologists
  add column terms_accepted_at timestamptz,
  add column terms_version text check (terms_version is null or char_length(terms_version) between 1 and 20);

-- Practices that were already live keep running; they confirm the next time they publish.

-- Records acceptance with the server's clock; the client can't set the time itself.
create or replace function public.accept_practice_terms(p_version text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted timestamptz := now();
begin
  if p_version is null or char_length(trim(p_version)) not between 1 and 20 then
    perform private.raise_api_error('VALIDATION_FAILED', 'terms_version');
  end if;
  update public.psychologists
     set terms_accepted_at = accepted, terms_version = trim(p_version)
   where id = auth.uid();
  if not found then
    perform private.raise_api_error('UNAUTHENTICATED', 'Sign in to continue.');
  end if;
  perform private.write_audit(auth.uid(), 'psychologist', 'accept_terms', 'psychologists', auth.uid());
  return accepted;
end;
$$;

revoke execute on function public.accept_practice_terms(text) from public, anon;
grant execute on function public.accept_practice_terms(text) to authenticated;

-- Publishing now also needs the terms confirmed.
create or replace function public.publish_practice(p_publish boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.psychologists;
  missing text[] := '{}';
begin
  select * into me from public.psychologists where id = auth.uid() for update;
  if not found then
    perform private.raise_api_error('UNAUTHENTICATED', 'Sign in to continue.');
  end if;

  if p_publish then
    if me.slug is null then missing := array_append(missing, 'slug'); end if;
    if char_length(trim(me.display_name)) = 0 then missing := array_append(missing, 'display_name'); end if;
    if not exists (
      select 1 from public.session_types
      where psychologist_id = me.id and is_active and archived_at is null
    ) then missing := array_append(missing, 'session_types'); end if;
    if not exists (select 1 from public.availability_rules where psychologist_id = me.id) then
      missing := array_append(missing, 'availability');
    end if;
    if me.terms_accepted_at is null then missing := array_append(missing, 'terms'); end if;
    if cardinality(missing) > 0 then
      perform private.raise_api_error('PUBLISH_REQUIREMENTS', array_to_string(missing, ','));
    end if;
  end if;

  update public.psychologists
     set published = p_publish,
         published_at = case when p_publish then coalesce(published_at, now()) else published_at end
   where id = me.id;

  perform private.write_audit(me.id, 'psychologist', case when p_publish then 'publish' else 'unpublish' end,
                              'psychologists', me.id);
  return p_publish;
end;
$$;

revoke execute on function public.publish_practice(boolean) from public, anon;
grant execute on function public.publish_practice(boolean) to authenticated;
