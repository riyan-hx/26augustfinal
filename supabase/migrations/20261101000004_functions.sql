-- Business logic that must be atomic or must not be trusted to the client.
--
-- Error convention: functions raise SQLSTATE P0001 with the message set to an
-- API error code (e.g. 'SLOT_UNAVAILABLE') and a human detail. The frontend and
-- Edge Functions map these codes to the error contract in BLUEPRINT.md §12.

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------
create or replace function private.raise_api_error(code text, detail text default null)
returns void
language plpgsql
as $$
begin
  raise exception '%', code using errcode = 'P0001', detail = coalesce(detail, code);
end;
$$;

create or replace function private.write_audit(
  p_psychologist_id uuid, p_actor public.booking_actor, p_action text, p_entity text, p_entity_id uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (psychologist_id, actor_id, actor_type, action, entity, entity_id, request_id)
  values (
    p_psychologist_id,
    auth.uid(),
    p_actor,
    p_action,
    p_entity,
    p_entity_id,
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-request-id', '')
  );
$$;

-- Does [p_start, p_start + duration) fit inside the practice's weekly hours?
create or replace function private.within_availability(
  p_psychologist_id uuid, p_start timestamptz, p_duration_minutes int, p_timezone text
)
returns boolean
language sql
stable
set search_path = ''
as $$
  with local as (
    select (p_start at time zone p_timezone) as ts
  )
  select exists (
    select 1
    from public.availability_rules r, local
    where r.psychologist_id = p_psychologist_id
      and r.weekday = extract(dow from local.ts)::int
      and r.minute_range @> int4range(
        (extract(hour from local.ts) * 60 + extract(minute from local.ts))::int,
        (extract(hour from local.ts) * 60 + extract(minute from local.ts))::int + p_duration_minutes
      )
      -- sessions may not cross local midnight
      and (local.ts + make_interval(mins => p_duration_minutes))::date = local.ts::date
  );
$$;

-- ---------------------------------------------------------------------------
-- Publishing
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Public read: profile and available slots (no personal data)
-- ---------------------------------------------------------------------------
create or replace function public.public_profile(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'slug', p.slug,
    'display_name', p.display_name,
    'title', p.title,
    'bio', p.bio,
    'city', p.city,
    'languages', p.languages,
    'specialties', p.specialties,
    'years_experience', p.years_experience,
    'photo_path', p.photo_path,
    'timezone', p.timezone,
    'cancellation_cutoff_hours', p.cancellation_cutoff_hours,
    'booking_window_days', p.booking_window_days,
    'session_types', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'description', s.description,
        'duration_minutes', s.duration_minutes, 'price_paise', s.price_paise
      ) order by s.position, s.price_paise)
      from public.session_types s
      where s.psychologist_id = p.id and s.is_active and s.archived_at is null
    ), '[]'::jsonb)
  )
  from public.psychologists p
  where p.slug = lower(p_slug) and p.published and p.deletion_requested_at is null;
$$;

create or replace function public.public_available_slots(
  p_slug text, p_session_type_id uuid, p_from date, p_to date
)
returns table (starts_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  prac public.psychologists;
  st public.session_types;
  step_minutes constant int := 30;
  earliest timestamptz;
  latest timestamptz;
begin
  if p_to < p_from or p_to - p_from > 31 then
    perform private.raise_api_error('VALIDATION_FAILED', 'Range must be 0–31 days.');
  end if;

  select * into prac from public.psychologists
   where slug = lower(p_slug) and published and deletion_requested_at is null;
  if not found then
    perform private.raise_api_error('NOT_FOUND', 'This page isn''t available.');
  end if;

  select * into st from public.session_types
   where id = p_session_type_id and psychologist_id = prac.id and is_active and archived_at is null;
  if not found then
    perform private.raise_api_error('NOT_FOUND', 'Session type not found.');
  end if;

  earliest := now() + make_interval(mins => prac.min_notice_minutes);
  latest := now() + make_interval(days => prac.booking_window_days);

  return query
  with days as (
    select d::date as day from generate_series(p_from, p_to, interval '1 day') d
  ),
  candidates as (
    select ((days.day + make_time(0, 0, 0)) + make_interval(mins => m)) at time zone prac.timezone as s
    from days
    join public.availability_rules r
      on r.psychologist_id = prac.id and r.weekday = extract(dow from days.day)::int
    cross join lateral generate_series(
      lower(r.minute_range), upper(r.minute_range) - st.duration_minutes, step_minutes
    ) m
  )
  select c.s
  from candidates c
  where c.s >= earliest
    and c.s <= latest
    and not exists (
      select 1 from public.availability_blocks b
      where b.psychologist_id = prac.id
        and b.during && tstzrange(c.s, c.s + make_interval(mins => st.duration_minutes))
    )
    and not exists (
      select 1 from public.bookings bk
      where bk.psychologist_id = prac.id
        and bk.status in ('pending_payment', 'confirmed')
        and bk.blocked_during && tstzrange(c.s, c.s + make_interval(mins => st.duration_minutes + st.buffer_minutes))
    )
  order by c.s;
end;
$$;

-- ---------------------------------------------------------------------------
-- Creating bookings
-- ---------------------------------------------------------------------------

-- Public booking hold. Called by the public-bookings Edge Function (service role)
-- after input validation and rate limiting. Price is always taken from the DB.
create or replace function public.create_booking_hold(
  p_slug text,
  p_session_type_id uuid,
  p_start timestamptz,
  p_full_name text,
  p_email text,
  p_phone text,
  p_note text,
  p_manage_token_hash text,
  p_hold_minutes int default 10
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  prac public.psychologists;
  st public.session_types;
  v_patient_id uuid;
  v_booking public.bookings;
  v_during tstzrange;
begin
  if not private.is_service_role() then
    perform private.raise_api_error('FORBIDDEN', 'Not allowed.');
  end if;

  select * into prac from public.psychologists
   where slug = lower(p_slug) and published and deletion_requested_at is null;
  if not found then
    perform private.raise_api_error('NOT_FOUND', 'This page isn''t available.');
  end if;

  select * into st from public.session_types
   where id = p_session_type_id and psychologist_id = prac.id and is_active and archived_at is null;
  if not found then
    perform private.raise_api_error('NOT_FOUND', 'Session type not found.');
  end if;

  if p_start < now() + make_interval(mins => prac.min_notice_minutes)
     or p_start > now() + make_interval(days => prac.booking_window_days) then
    perform private.raise_api_error('SLOT_UNAVAILABLE', 'That time can''t be booked.');
  end if;

  if not private.within_availability(prac.id, p_start, st.duration_minutes, prac.timezone) then
    perform private.raise_api_error('SLOT_UNAVAILABLE', 'That time is outside working hours.');
  end if;

  v_during := tstzrange(p_start, p_start + make_interval(mins => st.duration_minutes));

  if exists (
    select 1 from public.availability_blocks b
    where b.psychologist_id = prac.id and b.during && v_during
  ) then
    perform private.raise_api_error('SLOT_UNAVAILABLE', 'That time is blocked.');
  end if;

  insert into public.patients (psychologist_id, full_name, email, phone)
  values (prac.id, trim(p_full_name), lower(trim(p_email)), nullif(trim(p_phone), ''))
  on conflict (psychologist_id, lower(email)) do update
    set full_name = excluded.full_name,
        phone = coalesce(excluded.phone, public.patients.phone),
        archived_at = null
  returning id into v_patient_id;

  begin
    insert into public.bookings (
      psychologist_id, patient_id, session_type_id, status, during, blocked_during,
      price_paise, source, patient_note, manage_token_hash, hold_expires_at
    ) values (
      prac.id, v_patient_id, st.id, 'pending_payment', v_during,
      tstzrange(lower(v_during), upper(v_during) + make_interval(mins => st.buffer_minutes)),
      st.price_paise, 'public', coalesce(p_note, ''), p_manage_token_hash,
      now() + make_interval(mins => p_hold_minutes)
    )
    returning * into v_booking;
  exception when exclusion_violation then
    perform private.raise_api_error('SLOT_UNAVAILABLE', 'That time was just booked.');
  end;

  insert into public.consents (psychologist_id, patient_id, scope)
  values (prac.id, v_patient_id, 'booking_terms')
  on conflict do nothing;

  return jsonb_build_object(
    'booking_id', v_booking.id,
    'code', v_booking.code,
    'psychologist_id', prac.id,
    'price_paise', v_booking.price_paise,
    'hold_expires_at', v_booking.hold_expires_at,
    'starts_at', lower(v_booking.during),
    'ends_at', upper(v_booking.during)
  );
end;
$$;

-- Manual booking from the dashboard. Paid-offline bookings confirm immediately;
-- otherwise the booking waits for a payment link (24h hold).
create or replace function public.create_manual_booking(
  p_patient_id uuid,
  p_session_type_id uuid,
  p_start timestamptz,
  p_paid_offline boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  st public.session_types;
  v_id uuid;
  v_during tstzrange;
begin
  if me is null then
    perform private.raise_api_error('UNAUTHENTICATED', 'Sign in to continue.');
  end if;

  if not exists (select 1 from public.patients where id = p_patient_id and psychologist_id = me) then
    perform private.raise_api_error('NOT_FOUND', 'Patient not found.');
  end if;

  select * into st from public.session_types
   where id = p_session_type_id and psychologist_id = me and archived_at is null;
  if not found then
    perform private.raise_api_error('NOT_FOUND', 'Session type not found.');
  end if;

  if p_start < now() then
    perform private.raise_api_error('VALIDATION_FAILED', 'Pick a time in the future.');
  end if;

  v_during := tstzrange(p_start, p_start + make_interval(mins => st.duration_minutes));

  begin
    insert into public.bookings (
      psychologist_id, patient_id, session_type_id, status, during, blocked_during,
      price_paise, source, hold_expires_at, confirmed_at
    ) values (
      me, p_patient_id, st.id,
      case when p_paid_offline then 'confirmed' else 'pending_payment' end::public.booking_status,
      v_during,
      tstzrange(lower(v_during), upper(v_during) + make_interval(mins => st.buffer_minutes)),
      st.price_paise, 'manual',
      case when p_paid_offline then null else now() + interval '24 hours' end,
      case when p_paid_offline then now() end
    )
    returning id into v_id;
  exception when exclusion_violation then
    perform private.raise_api_error('SLOT_UNAVAILABLE', 'You already have a session at that time.');
  end;

  perform private.write_audit(me, 'psychologist', 'create', 'bookings', v_id);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- State machine (BLUEPRINT.md §10)
-- ---------------------------------------------------------------------------
create or replace function public.transition_booking(
  p_booking_id uuid,
  p_to public.booking_status,
  p_reason text default null,
  p_actor public.booking_actor default null
)
returns public.booking_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
  actor public.booking_actor;
  cutoff_hours int;
  allowed boolean := false;
begin
  -- Only the service role may act as patient/system. Everyone else is the psychologist.
  if private.is_service_role() then
    actor := coalesce(p_actor, 'system');
  else
    if auth.uid() is null then
      perform private.raise_api_error('UNAUTHENTICATED', 'Sign in to continue.');
    end if;
    actor := 'psychologist';
  end if;

  select * into b from public.bookings where id = p_booking_id for update;
  if not found or (actor = 'psychologist' and b.psychologist_id <> auth.uid()) then
    -- Same answer for "missing" and "not yours".
    perform private.raise_api_error('NOT_FOUND', 'Booking not found.');
  end if;

  if b.status = p_to then
    return b.status; -- idempotent repeat
  end if;

  allowed := case
    when b.status = 'pending_payment' and p_to = 'confirmed' then actor = 'system'
    when b.status = 'pending_payment' and p_to = 'expired' then actor = 'system'
    when b.status = 'pending_payment' and p_to = 'cancelled' then actor in ('system', 'psychologist')
    when b.status = 'confirmed' and p_to = 'cancelled' then true
    when b.status = 'confirmed' and p_to in ('completed', 'no_show') then actor in ('system', 'psychologist')
    else false
  end;

  if not allowed then
    perform private.raise_api_error('INVALID_TRANSITION',
      format('Can''t change a %s booking to %s.', b.status, p_to));
  end if;

  if p_to in ('completed', 'no_show') and lower(b.during) > now() then
    perform private.raise_api_error('INVALID_TRANSITION', 'The session hasn''t started yet.');
  end if;

  if p_to = 'cancelled' and actor = 'patient' then
    select cancellation_cutoff_hours into cutoff_hours from public.psychologists where id = b.psychologist_id;
    if now() > lower(b.during) - make_interval(hours => cutoff_hours) then
      perform private.raise_api_error('CUTOFF_PASSED',
        format('Changes are allowed until %s hours before the session.', cutoff_hours));
    end if;
  end if;

  if p_to = 'cancelled' and actor = 'psychologist' and coalesce(trim(p_reason), '') = '' then
    perform private.raise_api_error('VALIDATION_FAILED', 'Add a reason for the patient.');
  end if;

  update public.bookings
     set status = p_to,
         confirmed_at = case when p_to = 'confirmed' then now() else confirmed_at end,
         hold_expires_at = case when p_to = 'confirmed' then null else hold_expires_at end,
         cancelled_at = case when p_to = 'cancelled' then now() else cancelled_at end,
         cancelled_by = case when p_to = 'cancelled' then actor else cancelled_by end,
         cancel_reason = case when p_to = 'cancelled' then p_reason else cancel_reason end
   where id = b.id;

  perform private.write_audit(b.psychologist_id, actor, 'status:' || p_to::text, 'bookings', b.id);
  return p_to;
end;
$$;

create or replace function public.reschedule_booking(
  p_booking_id uuid,
  p_new_start timestamptz,
  p_actor public.booking_actor default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
  st public.session_types;
  prac public.psychologists;
  actor public.booking_actor;
  v_during tstzrange;
begin
  if private.is_service_role() then
    actor := coalesce(p_actor, 'system');
  else
    if auth.uid() is null then
      perform private.raise_api_error('UNAUTHENTICATED', 'Sign in to continue.');
    end if;
    actor := 'psychologist';
  end if;

  select * into b from public.bookings where id = p_booking_id for update;
  if not found or (actor = 'psychologist' and b.psychologist_id <> auth.uid()) then
    perform private.raise_api_error('NOT_FOUND', 'Booking not found.');
  end if;

  if b.status <> 'confirmed' then
    perform private.raise_api_error('INVALID_TRANSITION', 'Only confirmed bookings can be moved.');
  end if;

  select * into st from public.session_types where id = b.session_type_id;
  select * into prac from public.psychologists where id = b.psychologist_id;

  if p_new_start < now() then
    perform private.raise_api_error('VALIDATION_FAILED', 'Pick a time in the future.');
  end if;

  if actor = 'patient' then
    if now() > lower(b.during) - make_interval(hours => prac.cancellation_cutoff_hours) then
      perform private.raise_api_error('CUTOFF_PASSED',
        format('Changes are allowed until %s hours before the session.', prac.cancellation_cutoff_hours));
    end if;
    if p_new_start < now() + make_interval(mins => prac.min_notice_minutes)
       or not private.within_availability(prac.id, p_new_start, st.duration_minutes, prac.timezone) then
      perform private.raise_api_error('SLOT_UNAVAILABLE', 'That time can''t be booked.');
    end if;
  end if;

  v_during := tstzrange(p_new_start, p_new_start + make_interval(mins => st.duration_minutes));

  begin
    update public.bookings
       set during = v_during,
           blocked_during = tstzrange(lower(v_during), upper(v_during) + make_interval(mins => st.buffer_minutes)),
           rescheduled_count = rescheduled_count + 1
     where id = b.id;
  exception when exclusion_violation then
    perform private.raise_api_error('SLOT_UNAVAILABLE', 'That time is already booked.');
  end;

  perform private.write_audit(b.psychologist_id, actor, 'reschedule', 'bookings', b.id);
  return p_new_start;
end;
$$;

-- Cron: release unpaid holds.
create or replace function public.expire_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if not private.is_service_role() then
    perform private.raise_api_error('FORBIDDEN', 'Not allowed.');
  end if;
  update public.bookings
     set status = 'expired'
   where status = 'pending_payment' and hold_expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notes (encrypted at rest; key from Vault)
-- ---------------------------------------------------------------------------
create or replace function public.save_note(
  p_patient_id uuid,
  p_body text,
  p_focus text default '',
  p_next_steps text default '',
  p_booking_id uuid default null,
  p_note_id uuid default null,
  p_expected_version int default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  v_id uuid;
  v_version int;
  key text;
begin
  if me is null then
    perform private.raise_api_error('UNAUTHENTICATED', 'Sign in to continue.');
  end if;
  if char_length(p_body) > 20000 then
    perform private.raise_api_error('VALIDATION_FAILED', 'Notes are limited to 20,000 characters.');
  end if;
  if not exists (select 1 from public.patients where id = p_patient_id and psychologist_id = me) then
    perform private.raise_api_error('NOT_FOUND', 'Patient not found.');
  end if;

  key := private.get_secret('notes_key');

  if p_note_id is null then
    insert into public.session_notes (psychologist_id, patient_id, booking_id, body_encrypted, focus, next_steps)
    values (me, p_patient_id, p_booking_id, extensions.pgp_sym_encrypt(p_body, key),
            coalesce(p_focus, ''), coalesce(p_next_steps, ''))
    returning id, version into v_id, v_version;
  else
    update public.session_notes
       set body_encrypted = extensions.pgp_sym_encrypt(p_body, key),
           focus = coalesce(p_focus, ''),
           next_steps = coalesce(p_next_steps, ''),
           version = version + 1
     where id = p_note_id and psychologist_id = me
       and (p_expected_version is null or version = p_expected_version)
    returning id, version into v_id, v_version;

    if v_id is null then
      if exists (select 1 from public.session_notes where id = p_note_id and psychologist_id = me) then
        perform private.raise_api_error('VERSION_CONFLICT', 'This note changed in another tab. Reload to see it.');
      end if;
      perform private.raise_api_error('NOT_FOUND', 'Note not found.');
    end if;
  end if;

  return jsonb_build_object('id', v_id, 'version', v_version);
end;
$$;

create or replace function public.read_note(p_note_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  n public.session_notes;
begin
  select * into n from public.session_notes where id = p_note_id and psychologist_id = auth.uid();
  if not found then
    perform private.raise_api_error('NOT_FOUND', 'Note not found.');
  end if;
  perform private.write_audit(n.psychologist_id, 'psychologist', 'read', 'session_notes', n.id);
  return extensions.pgp_sym_decrypt(n.body_encrypted, private.get_secret('notes_key'));
end;
$$;

-- Records that a psychologist opened a patient record.
create or replace function public.log_patient_view(p_patient_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.patients where id = p_patient_id and psychologist_id = auth.uid()) then
    perform private.raise_api_error('NOT_FOUND', 'Patient not found.');
  end if;
  perform private.write_audit(auth.uid(), 'psychologist', 'view', 'patients', p_patient_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Reporting (security invoker: RLS applies)
-- ---------------------------------------------------------------------------
create or replace function public.earnings_summary(p_from timestamptz, p_to timestamptz)
returns table (
  collected_paise bigint,
  refunded_paise bigint,
  fee_paise bigint,
  net_paise bigint,
  pending_paise bigint,
  paid_sessions integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(sum(p.amount_paise) filter (where p.status in ('captured', 'refunded', 'partially_refunded')), 0),
    coalesce(sum(p.refunded_paise), 0),
    coalesce(sum(p.fee_paise + p.tax_paise) filter (where p.status in ('captured', 'refunded', 'partially_refunded')), 0),
    coalesce(sum(p.amount_paise - p.refunded_paise - p.fee_paise - p.tax_paise)
             filter (where p.status in ('captured', 'refunded', 'partially_refunded')), 0),
    coalesce((
      select sum(b.price_paise) from public.bookings b
      where b.status = 'pending_payment' and lower(b.during) >= p_from and lower(b.during) < p_to
    ), 0),
    count(*) filter (where p.status in ('captured', 'partially_refunded'))::int
  from public.payments p
  where p.captured_at >= p_from and p.captured_at < p_to;
$$;

-- ---------------------------------------------------------------------------
-- Grants: functions are private by default, opened per role.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

grant execute on function public.public_profile(text) to anon, authenticated;
grant execute on function public.public_available_slots(text, uuid, date, date) to anon, authenticated;

grant execute on function public.publish_practice(boolean) to authenticated;
grant execute on function public.create_manual_booking(uuid, uuid, timestamptz, boolean) to authenticated;
grant execute on function public.transition_booking(uuid, public.booking_status, text, public.booking_actor) to authenticated;
grant execute on function public.reschedule_booking(uuid, timestamptz, public.booking_actor) to authenticated;
grant execute on function public.save_note(uuid, text, text, text, uuid, uuid, int) to authenticated;
grant execute on function public.read_note(uuid) to authenticated;
grant execute on function public.log_patient_view(uuid) to authenticated;
grant execute on function public.earnings_summary(timestamptz, timestamptz) to authenticated;
-- create_booking_hold and expire_holds: service role only (default owner privileges).
