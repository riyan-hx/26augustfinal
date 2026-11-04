-- Bookings without online payment: patients request a slot from the public page
-- and pay the psychologist directly; the psychologist marks it paid. Manual
-- bookings paid offline record a payment so earnings stay accurate.
--
-- Hold rules: online checkout holds last 10 minutes. Pay-at-session and
-- "collect later" bookings stay held until 3 days after the session, so the
-- psychologist can mark them paid after it happens. Expired holds are released
-- by pg_cron when available, and are treated as released everywhere even if
-- the job hasn't run yet.

-- Releases this practice's lapsed holds so their slots can be booked again.
create or replace function private.release_lapsed_holds(p_psychologist_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.bookings
     set status = 'expired'
   where psychologist_id = p_psychologist_id
     and status = 'pending_payment'
     and hold_expires_at < now();
$$;

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
  perform private.release_lapsed_holds(prac.id);
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
      upper(v_during) + interval '3 days'  -- paid directly; mark paid up to 3 days after
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
  if b.status not in ('pending_payment', 'expired') then
    perform private.raise_api_error('INVALID_TRANSITION', format('Can''t mark a %s booking as paid.', b.status));
  end if;
  perform private.release_lapsed_holds(me);

  insert into public.payments (psychologist_id, booking_id, razorpay_order_id, amount_paise, status, method, captured_at)
  values (me, b.id, 'offline:' || b.id, b.price_paise, 'captured', left(coalesce(nullif(trim(p_method), ''), 'offline'), 40), now())
  on conflict (razorpay_order_id) do nothing;

  begin
    update public.bookings
       set status = 'confirmed', confirmed_at = now(), hold_expires_at = null
     where id = b.id;
  exception when exclusion_violation then
    perform private.raise_api_error('SLOT_UNAVAILABLE', 'That time has since been booked by someone else.');
  end;

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
  perform private.release_lapsed_holds(me);
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
      case when p_paid_offline then null else upper(v_during) + interval '3 days' end,
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

-- Public profile also says how much notice bookings need.
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
    'min_notice_minutes', p.min_notice_minutes,
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

-- Lapsed holds never block slots, even before the release job runs.
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
        and (bk.status = 'confirmed' or (bk.status = 'pending_payment' and bk.hold_expires_at >= now()))
        and bk.blocked_during && tstzrange(c.s, c.s + make_interval(mins => st.duration_minutes + st.buffer_minutes))
    )
  order by c.s;
end;
$$;

-- Dashboard list: a lapsed hold reads as expired before the job releases it.
create or replace view public.booking_list
with (security_invoker = true) as
select
  b.id,
  b.code,
  case when b.status = 'pending_payment' and b.hold_expires_at < now()
       then 'expired'::public.booking_status else b.status end as status,
  lower(b.during) as starts_at,
  upper(b.during) as ends_at,
  b.price_paise,
  b.source,
  b.meet_url,
  b.hold_expires_at,
  b.cancel_reason,
  b.patient_id,
  p.full_name as patient_name,
  p.email as patient_email,
  st.name as session_type_name,
  st.duration_minutes,
  pay.status as payment_status
from public.bookings b
join public.patients p on p.id = b.patient_id
join public.session_types st on st.id = b.session_type_id
left join lateral (
  select status from public.payments where booking_id = b.id order by created_at desc limit 1
) pay on true;

-- Earnings: pending excludes lapsed holds.
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
      where b.status = 'pending_payment' and b.hold_expires_at >= now()
        and lower(b.during) >= p_from and lower(b.during) < p_to
    ), 0),
    count(*) filter (where p.status in ('captured', 'partially_refunded'))::int
  from public.payments p
  where p.captured_at >= p_from and p.captured_at < p_to;
$$;

-- Manual bookings confirmed as paid offline before this migration had no
-- payment row, so they were missing from Earnings. Record them now.
insert into public.payments (psychologist_id, booking_id, razorpay_order_id, amount_paise, status, method, captured_at)
select b.psychologist_id, b.id, 'offline:' || b.id, b.price_paise, 'captured', 'offline', coalesce(b.confirmed_at, b.created_at)
from public.bookings b
where b.source = 'manual'
  and b.status in ('confirmed', 'completed', 'no_show')
  and not exists (select 1 from public.payments p where p.booking_id = b.id)
on conflict (razorpay_order_id) do nothing;

-- Release lapsed holds now, then every minute when pg_cron can be enabled.
update public.bookings set status = 'expired' where status = 'pending_payment' and hold_expires_at < now();
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron unavailable (%); lapsed holds are still treated as released.', sqlerrm;
  end;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'expire-holds') then
      perform cron.schedule('expire-holds', '* * * * *', 'select public.expire_holds()');
    end if;
  end if;
end;
$$;

revoke execute on function private.release_lapsed_holds(uuid) from public, anon, authenticated;
revoke execute on function public.request_booking(text, uuid, timestamptz, text, text, text, text, text) from public;
revoke execute on function public.mark_booking_paid(uuid, text) from public, anon;
grant execute on function public.request_booking(text, uuid, timestamptz, text, text, text, text, text) to anon, authenticated;
grant execute on function public.mark_booking_paid(uuid, text) to authenticated;
grant execute on function public.create_manual_booking(uuid, uuid, timestamptz, boolean) to authenticated;
