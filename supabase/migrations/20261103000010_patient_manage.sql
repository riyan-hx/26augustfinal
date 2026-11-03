-- Patient self-service: view, reschedule or cancel a booking from the private
-- link shown after booking. The link carries a random token; only its SHA-256
-- hash is stored. Changes are allowed until the practice's cancellation cutoff.

create or replace function private.booking_for_token(p_booking_id uuid, p_token text)
returns public.bookings
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  b public.bookings;
begin
  select * into b from public.bookings
   where id = p_booking_id
     and manage_token_hash is not null
     and manage_token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then
    perform private.raise_api_error('NOT_FOUND', 'This booking link isn''t valid.');
  end if;
  return b;
end;
$$;

create or replace function public.public_manage_booking(p_booking_id uuid, p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  b public.bookings;
  prac public.psychologists;
  st public.session_types;
  v_status public.booking_status;
begin
  b := private.booking_for_token(p_booking_id, p_token);
  select * into prac from public.psychologists where id = b.psychologist_id;
  select * into st from public.session_types where id = b.session_type_id;
  v_status := case when b.status = 'pending_payment' and b.hold_expires_at < now() then 'expired' else b.status end;
  return jsonb_build_object(
    'booking_id', b.id,
    'code', b.code,
    'status', v_status,
    'starts_at', lower(b.during),
    'ends_at', upper(b.during),
    'price_paise', b.price_paise,
    'meet_url', case when v_status = 'confirmed' then b.meet_url end,
    'session_type_id', st.id,
    'session_type_name', st.name,
    'practice_name', prac.display_name,
    'practice_slug', prac.slug,
    'timezone', prac.timezone,
    'cancellation_cutoff_hours', prac.cancellation_cutoff_hours,
    'changes_allowed_until', lower(b.during) - make_interval(hours => prac.cancellation_cutoff_hours)
  );
end;
$$;

create or replace function public.public_cancel_booking(p_booking_id uuid, p_token text, p_reason text default null)
returns public.booking_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
  cutoff int;
begin
  b := private.booking_for_token(p_booking_id, p_token);
  if b.status = 'cancelled' then
    return b.status;
  end if;
  if b.status not in ('pending_payment', 'confirmed') then
    perform private.raise_api_error('INVALID_TRANSITION', 'This booking can''t be cancelled.');
  end if;
  select cancellation_cutoff_hours into cutoff from public.psychologists where id = b.psychologist_id;
  if now() > lower(b.during) - make_interval(hours => cutoff) then
    perform private.raise_api_error('CUTOFF_PASSED',
      format('Changes are allowed until %s hours before the session. Please contact the practice.', cutoff));
  end if;

  update public.bookings
     set status = 'cancelled', cancelled_at = now(), cancelled_by = 'patient',
         cancel_reason = left(coalesce(nullif(trim(p_reason), ''), 'Cancelled by patient'), 500)
   where id = b.id;
  perform private.write_audit(b.psychologist_id, 'patient', 'status:cancelled', 'bookings', b.id);
  return 'cancelled';
end;
$$;

create or replace function public.public_reschedule_booking(p_booking_id uuid, p_token text, p_new_start timestamptz)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
  prac public.psychologists;
  st public.session_types;
  v_during tstzrange;
begin
  b := private.booking_for_token(p_booking_id, p_token);
  if b.status not in ('pending_payment', 'confirmed')
     or (b.status = 'pending_payment' and b.hold_expires_at < now()) then
    perform private.raise_api_error('INVALID_TRANSITION', 'This booking can''t be moved.');
  end if;
  select * into prac from public.psychologists where id = b.psychologist_id;
  select * into st from public.session_types where id = b.session_type_id;

  if now() > lower(b.during) - make_interval(hours => prac.cancellation_cutoff_hours) then
    perform private.raise_api_error('CUTOFF_PASSED',
      format('Changes are allowed until %s hours before the session. Please contact the practice.', prac.cancellation_cutoff_hours));
  end if;
  if p_new_start < now() + make_interval(mins => prac.min_notice_minutes)
     or p_new_start > now() + make_interval(days => prac.booking_window_days)
     or not private.within_availability(prac.id, p_new_start, st.duration_minutes, prac.timezone) then
    perform private.raise_api_error('SLOT_UNAVAILABLE', 'That time can''t be booked.');
  end if;

  v_during := tstzrange(p_new_start, p_new_start + make_interval(mins => st.duration_minutes));
  if exists (select 1 from public.availability_blocks x where x.psychologist_id = prac.id and x.during && v_during) then
    perform private.raise_api_error('SLOT_UNAVAILABLE', 'That time is blocked.');
  end if;
  perform private.release_lapsed_holds(prac.id);

  begin
    update public.bookings
       set during = v_during,
           blocked_during = tstzrange(lower(v_during), upper(v_during) + make_interval(mins => st.buffer_minutes)),
           rescheduled_count = rescheduled_count + 1,
           hold_expires_at = case when status = 'pending_payment' then upper(v_during) + interval '3 days' else hold_expires_at end
     where id = b.id;
  exception when exclusion_violation then
    perform private.raise_api_error('SLOT_UNAVAILABLE', 'That time was just booked.');
  end;

  perform private.write_audit(b.psychologist_id, 'patient', 'reschedule', 'bookings', b.id);
  return p_new_start;
end;
$$;

revoke execute on function private.booking_for_token(uuid, text) from public, anon, authenticated;
revoke execute on function public.public_manage_booking(uuid, text) from public;
revoke execute on function public.public_cancel_booking(uuid, text, text) from public;
revoke execute on function public.public_reschedule_booking(uuid, text, timestamptz) from public;
grant execute on function public.public_manage_booking(uuid, text) to anon, authenticated;
grant execute on function public.public_cancel_booking(uuid, text, text) to anon, authenticated;
grant execute on function public.public_reschedule_booking(uuid, text, timestamptz) to anon, authenticated;
