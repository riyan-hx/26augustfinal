-- Bookings without online payment: patients request a slot from the public page
-- and pay the psychologist directly; the psychologist marks it paid. Manual
-- bookings paid offline now record a payment so earnings stay accurate.

-- Public request. Reserves the slot until the session starts; no card needed.
create or replace function public.request_booking(
  p_slug text,
  p_session_type_id uuid,
  p_start timestamptz,
  p_full_name text,
  p_email text,
  p_phone text,
  p_note text,
  p_manage_token_hash text
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
  if coalesce(trim(p_full_name), '') = '' or coalesce(trim(p_email), '') = '' then
    perform private.raise_api_error('VALIDATION_FAILED', 'Add your name and email.');
  end if;
  if coalesce(p_manage_token_hash, '') !~ '^[0-9a-f]{64}$' then
    perform private.raise_api_error('VALIDATION_FAILED', 'Invalid request.');
  end if;

  -- Fixed-window limits: per email (5/hour) and per practice (40/hour).
  insert into public.rate_limits as r (bucket, window_started_at, hits)
  values ('request:email:' || lower(trim(p_email)), now(), 1), ('request:slug:' || lower(p_slug), now(), 1)
  on conflict (bucket) do update
    set hits = case when r.window_started_at < now() - interval '1 hour' then 1 else r.hits + 1 end,
        window_started_at = case when r.window_started_at < now() - interval '1 hour' then now() else r.window_started_at end;
  if exists (
    select 1 from public.rate_limits
    where (bucket = 'request:email:' || lower(trim(p_email)) and hits > 5)
       or (bucket = 'request:slug:' || lower(p_slug) and hits > 40)
  ) then
    perform private.raise_api_error('RATE_LIMITED', 'Too many requests. Try again in an hour.');
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
  if exists (select 1 from public.availability_blocks b where b.psychologist_id = prac.id and b.during && v_during) then
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
      st.price_paise, 'public', left(coalesce(p_note, ''), 1000), p_manage_token_hash,
      lower(v_during)  -- held until the session starts; payment is collected directly
    )
    returning * into v_booking;
  exception when exclusion_violation then
    perform private.raise_api_error('SLOT_UNAVAILABLE', 'That time was just booked.');
  end;

  insert into public.consents (psychologist_id, patient_id, scope)
  values (prac.id, v_patient_id, 'booking_terms')
  on conflict do nothing;

  perform private.write_audit(prac.id, 'patient', 'request', 'bookings', v_booking.id);

  return jsonb_build_object(
    'booking_id', v_booking.id,
    'code', v_booking.code,
    'price_paise', v_booking.price_paise,
    'starts_at', lower(v_booking.during),
    'ends_at', upper(v_booking.during)
  );
end;
$$;

-- Records a payment collected outside Razorpay and confirms the booking.
create or replace function public.mark_booking_paid(p_booking_id uuid, p_method text default 'offline')
returns public.booking_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  b public.bookings;
begin
  if me is null then
    perform private.raise_api_error('UNAUTHENTICATED', 'Sign in to continue.');
  end if;
  select * into b from public.bookings where id = p_booking_id and psychologist_id = me for update;
  if not found then
    perform private.raise_api_error('NOT_FOUND', 'Booking not found.');
  end if;
  if b.status = 'confirmed' then
    return b.status;
  end if;
  if b.status <> 'pending_payment' then
    perform private.raise_api_error('INVALID_TRANSITION', format('Can''t mark a %s booking as paid.', b.status));
  end if;

  insert into public.payments (psychologist_id, booking_id, razorpay_order_id, amount_paise, status, method, captured_at)
  values (me, b.id, 'offline:' || b.id, b.price_paise, 'captured', left(coalesce(nullif(trim(p_method), ''), 'offline'), 40), now())
  on conflict (razorpay_order_id) do nothing;

  update public.bookings
     set status = 'confirmed', confirmed_at = now(), hold_expires_at = null
   where id = b.id;

  perform private.write_audit(me, 'psychologist', 'status:confirmed', 'bookings', b.id);
  return 'confirmed';
end;
$$;

-- Manual booking: same as before, plus a payment row when paid offline.
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
      case when p_paid_offline then null else lower(v_during) end,
      case when p_paid_offline then now() end
    )
    returning id into v_id;
  exception when exclusion_violation then
    perform private.raise_api_error('SLOT_UNAVAILABLE', 'You already have a session at that time.');
  end;

  if p_paid_offline then
    insert into public.payments (psychologist_id, booking_id, razorpay_order_id, amount_paise, status, method, captured_at)
    values (me, v_id, 'offline:' || v_id, st.price_paise, 'captured', 'offline', now());
  end if;

  perform private.write_audit(me, 'psychologist', 'create', 'bookings', v_id);
  return v_id;
end;
$$;

revoke execute on function public.request_booking(text, uuid, timestamptz, text, text, text, text, text) from public;
revoke execute on function public.mark_booking_paid(uuid, text) from public, anon;
grant execute on function public.request_booking(text, uuid, timestamptz, text, text, text, text, text) to anon, authenticated;
grant execute on function public.mark_booking_paid(uuid, text) to authenticated;
grant execute on function public.create_manual_booking(uuid, uuid, timestamptz, boolean) to authenticated;
