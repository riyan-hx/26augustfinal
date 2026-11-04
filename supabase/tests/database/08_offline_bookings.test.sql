-- Pay-at-session requests, marking paid, and manual bookings paid offline.
begin;
select plan(13);

select tests.make_practice('anitha@test.lumid', 'anitha') as a \gset
select id as st from public.session_types where psychologist_id = :'a' \gset

select tests.as_anon();
select public.request_booking('anitha', :'st', tests.ist(3, '10:00'), 'Divya', 'divya@example.com', null, 'hi',
  encode(extensions.digest('tok', 'sha256'), 'hex')) as req \gset
select ok((:'req'::jsonb ->> 'code') ~ '^B-', 'anon can request a booking');
select throws_ok(
  format($$select public.request_booking('anitha', %L, %L, 'X', 'x@example.com', null, null, %L)$$,
    :'st', tests.ist(3, '10:30'), encode(extensions.digest('t2', 'sha256'), 'hex')),
  'P0001', 'SLOT_UNAVAILABLE', 'requested slot is reserved');
select throws_ok(
  format($$select public.request_booking('anitha', %L, %L, 'X', 'x@example.com', null, null, 'nothex')$$,
    :'st', tests.ist(4, '10:00')),
  'P0001', 'VALIDATION_FAILED', 'manage token hash must be a sha256 hex');
select throws_ok(
  format($$select public.mark_booking_paid(%L)$$, :'req'::jsonb ->> 'booking_id'),
  '42501', null, 'anon cannot mark paid');

select tests.as_service();
select is(status::text, 'pending_payment', 'request waits for payment') from public.bookings where id = (:'req'::jsonb ->> 'booking_id')::uuid;
select ok(hold_expires_at = upper(during) + interval '3 days', 'held until 3 days after the session') from public.bookings where id = (:'req'::jsonb ->> 'booking_id')::uuid;

select tests.as_user(:'a');
select is(public.mark_booking_paid((:'req'::jsonb ->> 'booking_id')::uuid, 'upi')::text, 'confirmed', 'psychologist marks it paid');
select is((select collected_paise from public.earnings_summary(now() - interval '1 day', now() + interval '1 day')), 150000::bigint,
  'offline payment counts in earnings');

select id as pid from public.patients where psychologist_id = :'a' limit 1 \gset
select public.create_manual_booking(:'pid', :'st', tests.ist(5, '11:00'), true) as mb \gset
select is(status::text, 'confirmed', 'manual paid booking confirms') from public.bookings where id = :'mb';
select is((select count(*) from public.payments where booking_id = :'mb')::int, 1, 'manual paid booking records a payment');

-- A lapsed hold reads as expired and frees its slot before any job runs.
select tests.as_service();
select public.request_booking('anitha', :'st', tests.ist(6, '10:00'), 'Late', 'late@example.com', null, null,
  encode(extensions.digest('late', 'sha256'), 'hex')) ->> 'booking_id' as late \gset
update public.bookings set hold_expires_at = now() - interval '1 minute' where id = :'late';
select tests.as_user(:'a');
select is(status::text, 'expired', 'lapsed hold reads as expired') from public.booking_list where id = :'late';
select tests.as_anon();
select ok(exists (select 1 from public.public_available_slots('anitha', :'st', (tests.ist(6, '10:00') at time zone 'Asia/Kolkata')::date, (tests.ist(6, '10:00') at time zone 'Asia/Kolkata')::date)
  where starts_at = tests.ist(6, '10:00')), 'lapsed hold does not block its slot');
select lives_ok(
  format($$select public.request_booking('anitha', %L, %L, 'Next', 'next@example.com', null, null, %L)$$,
    :'st', tests.ist(6, '10:00'), encode(extensions.digest('next', 'sha256'), 'hex')),
  'the slot can be booked again');

select * from finish();
rollback;
