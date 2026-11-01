-- Patient-facing booking status: token-gated, no cross-booking leakage.
begin;
select plan(5);

select tests.make_practice('anitha@test.lumid', 'anitha') as a \gset
select id as st from public.session_types where psychologist_id = :'a' \gset

select tests.as_service();
select (public.create_booking_hold('anitha', :'st', tests.ist(3, '10:00'), 'Divya', 'divya@example.com',
  null, null, encode(extensions.digest('secret-token', 'sha256'), 'hex')) ->> 'booking_id') as bid \gset

select tests.as_anon();
select is(public.public_booking_status(:'bid'::uuid, 'secret-token') ->> 'status', 'pending_payment',
  'valid token returns the booking status');
select ok(public.public_booking_status(:'bid'::uuid, 'secret-token') ->> 'code' ~ '^B-', 'returns the booking code');
select throws_ok(
  format($$select public.public_booking_status(%L, 'wrong-token')$$, :'bid'),
  'P0001', 'NOT_FOUND', 'wrong token is indistinguishable from a missing booking');
select throws_ok(
  $$select public.public_booking_status(gen_random_uuid(), 'secret-token')$$,
  'P0001', 'NOT_FOUND', 'unknown booking id is NOT_FOUND');
select is(
  (public.public_booking_status(:'bid'::uuid, 'secret-token') ? 'email'), false,
  'no patient personal data is exposed');

select * from finish();
rollback;
