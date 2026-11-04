-- Patient self-service through the private booking link.
begin;
select plan(9);

select tests.make_practice('anitha@test.lumid', 'anitha') as a \gset
select id as st from public.session_types where psychologist_id = :'a' \gset

select tests.as_anon();
select (public.request_booking('anitha', :'st', tests.ist(4, '10:00'), 'Divya', 'divya@example.com', null, null,
  encode(extensions.digest('tok-1', 'sha256'), 'hex')) ->> 'booking_id') as bid \gset

select is(public.public_manage_booking(:'bid', 'tok-1') ->> 'status', 'pending_payment', 'valid link shows the booking');
select is(public.public_manage_booking(:'bid', 'tok-1') ->> 'practice_slug', 'anitha', 'includes the practice');
select throws_ok(format($$select public.public_manage_booking(%L, 'wrong')$$, :'bid'), 'P0001', 'NOT_FOUND', 'wrong token is rejected');
select throws_ok(format($$select public.public_cancel_booking(%L, 'wrong')$$, :'bid'), 'P0001', 'NOT_FOUND', 'wrong token cannot cancel');

select lives_ok(format($$select public.public_reschedule_booking(%L, 'tok-1', %L)$$, :'bid', tests.ist(5, '11:00')), 'patient can move it');
select is((public.public_manage_booking(:'bid', 'tok-1') ->> 'starts_at')::timestamptz, tests.ist(5, '11:00'), 'new time saved');
select throws_ok(format($$select public.public_reschedule_booking(%L, 'tok-1', %L)$$, :'bid', tests.ist(5, '23:00')),
  'P0001', 'SLOT_UNAVAILABLE', 'outside working hours is rejected');

select is(public.public_cancel_booking(:'bid', 'tok-1', 'Something came up')::text, 'cancelled', 'patient can cancel');

-- Inside the cutoff: changes are refused.
select tests.as_service();
update public.bookings set status = 'confirmed', hold_expires_at = null,
  during = tstzrange(now() + interval '2 hours', now() + interval '170 minutes'),
  blocked_during = tstzrange(now() + interval '2 hours', now() + interval '180 minutes')
 where id = :'bid';
select tests.as_anon();
select throws_ok(format($$select public.public_cancel_booking(%L, 'tok-1')$$, :'bid'), 'P0001', 'CUTOFF_PASSED', 'cancel inside the cutoff is refused');

select * from finish();
rollback;
