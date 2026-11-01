-- Shared test helpers (created once; later test files reuse them).
begin;
select plan(1);

create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

-- Creates an auth user (and through the trigger, a practice row).
create or replace function tests.create_user(p_email text) returns uuid
language sql as $$
  insert into auth.users (email, raw_user_meta_data)
  values (p_email, jsonb_build_object('full_name', split_part(p_email, '@', 1)))
  returning id;
$$;

-- Switch the current transaction to act as a signed-in psychologist.
create or replace function tests.as_user(p_id uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create or replace function tests.as_anon() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end;
$$;

create or replace function tests.as_service() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  execute 'set local role service_role';
end;
$$;

create or replace function tests.as_postgres() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  execute 'reset role';
end;
$$;

-- A published practice open every day 06:00–22:00 IST with one 50-min session type.
create or replace function tests.make_practice(p_email text, p_slug text) returns uuid
language plpgsql as $$
declare
  uid uuid := tests.create_user(p_email);
begin
  update public.psychologists
     set slug = p_slug, display_name = initcap(split_part(p_email, '@', 1)),
         min_notice_minutes = 60, cancellation_cutoff_hours = 24
   where id = uid;
  insert into public.session_types (psychologist_id, name, duration_minutes, price_paise, buffer_minutes)
  values (uid, 'Individual Consultation', 50, 150000, 10);
  insert into public.availability_rules (psychologist_id, weekday, start_time, end_time)
  select uid, d, '06:00', '22:00' from generate_series(0, 6) d;
  update public.psychologists set published = true, published_at = now() where id = uid;
  return uid;
end;
$$;

-- A start time N days ahead at HH:MM in IST.
create or replace function tests.ist(p_days int, p_time time) returns timestamptz
language sql stable as $$
  select ((date_trunc('day', now() at time zone 'Asia/Kolkata') + make_interval(days => p_days) + p_time)
          at time zone 'Asia/Kolkata');
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

select pass('helpers installed');
select * from finish();
commit;
