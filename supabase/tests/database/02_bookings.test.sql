-- Booking holds, double-booking protection, state machine, cutoffs, expiry.
begin;
select plan(20);

select tests.make_practice('anitha@test.lumid', 'anitha') as a \gset
select id as st from public.session_types where psychologist_id = :'a' \gset

-- Holds (service role, as the public-bookings Edge Function) ------------------
select tests.as_service();

select public.create_booking_hold('anitha', :'st', tests.ist(3, '10:00'), 'Divya Prasad', 'Divya@Example.com',
  '+91 98765 43210', 'first visit', 'hash1') as hold1 \gset

select is((:'hold1'::jsonb ->> 'price_paise')::int, 150000, 'price comes from the database');
select ok((:'hold1'::jsonb ->> 'code') ~ '^B-[0-9A-Z]{6}$', 'booking code format');

select throws_ok(
  format($$select public.create_booking_hold('anitha', %L, %L, 'Arjun', 'arjun@example.com', null, null, 'h2')$$,
         :'st', tests.ist(3, '10:30')),
  'P0001', 'SLOT_UNAVAILABLE', 'overlapping hold is rejected'
);

select throws_ok(
  format($$select public.create_booking_hold('anitha', %L, %L, 'Arjun', 'arjun@example.com', null, null, 'h2')$$,
         :'st', tests.ist(3, '10:55')),
  'P0001', 'SLOT_UNAVAILABLE', 'hold inside the 10-min buffer is rejected'
);

select lives_ok(
  format($$select public.create_booking_hold('anitha', %L, %L, 'Arjun', 'arjun@example.com', null, null, 'h2')$$,
         :'st', tests.ist(3, '11:00')),
  'back-to-back hold after buffer is accepted'
);

select throws_ok(
  format($$select public.create_booking_hold('anitha', %L, %L, 'X', 'x@example.com', null, null, 'h3')$$,
         :'st', tests.ist(3, '21:30')),
  'P0001', 'SLOT_UNAVAILABLE', 'session running past working hours is rejected'
);

select throws_ok(
  format($$select public.create_booking_hold('anitha', %L, %L, 'X', 'x@example.com', null, null, 'h3')$$,
         :'st', now() + interval '10 minutes'),
  'P0001', 'SLOT_UNAVAILABLE', 'minimum notice is enforced'
);

select throws_ok(
  format($$select public.create_booking_hold('nobody', %L, %L, 'X', 'x@example.com', null, null, 'h3')$$,
         :'st', tests.ist(3, '15:00')),
  'P0001', 'NOT_FOUND', 'unknown practice'
);

select is((select count(*)::int from public.patients where psychologist_id = :'a'), 2,
          'patients are upserted by email (case-insensitive)');

-- Clients may not create holds directly
select tests.as_postgres();
select tests.as_user(:'a');
select throws_ok(
  format($$select public.create_booking_hold('anitha', %L, %L, 'X', 'x@example.com', null, null, 'h')$$,
         :'st', tests.ist(4, '10:00')),
  '42501', null, 'authenticated users cannot call create_booking_hold'
);

-- State machine ----------------------------------------------------------------
select (:'hold1'::jsonb ->> 'booking_id') as b1 \gset

select throws_ok(
  format($$select public.transition_booking(%L, 'confirmed')$$, :'b1'),
  'P0001', 'INVALID_TRANSITION', 'psychologist cannot mark a booking paid'
);

select tests.as_postgres();
select tests.as_service();
select is(public.transition_booking(:'b1', 'confirmed'), 'confirmed'::public.booking_status, 'webhook confirms');
select is(public.transition_booking(:'b1', 'confirmed'), 'confirmed'::public.booking_status,
          'repeat confirm is idempotent');

select tests.as_postgres();
select tests.as_user(:'a');
select throws_ok(
  format($$select public.transition_booking(%L, 'completed')$$, :'b1'),
  'P0001', 'INVALID_TRANSITION', 'cannot complete before the session starts'
);
select throws_ok(
  format($$select public.transition_booking(%L, 'cancelled')$$, :'b1'),
  'P0001', 'VALIDATION_FAILED', 'psychologist cancel needs a reason'
);

-- Patient reschedule respects availability; cancel within cutoff is blocked
select tests.as_postgres();
select tests.as_service();
select is(public.reschedule_booking(:'b1', tests.ist(5, '09:00'), 'patient'), tests.ist(5, '09:00'),
          'patient can reschedule before cutoff');

update public.bookings set during = tstzrange(now() + interval '2 hours', now() + interval '2 hours 50 minutes'),
  blocked_during = tstzrange(now() + interval '2 hours', now() + interval '3 hours') where id = :'b1';
select throws_ok(
  format($$select public.transition_booking(%L, 'cancelled', 'cant make it', 'patient')$$, :'b1'),
  'P0001', 'CUTOFF_PASSED', 'patient cannot cancel inside the cutoff'
);

-- Another psychologist cannot touch it
select tests.as_postgres();
select tests.make_practice('rahul@test.lumid', 'rahul') as b \gset
select tests.as_user(:'b');
select throws_ok(
  format($$select public.transition_booking(%L, 'cancelled', 'x')$$, :'b1'),
  'P0001', 'NOT_FOUND', 'other psychologist gets NOT_FOUND'
);

-- Hold expiry frees the slot ----------------------------------------------------
select tests.as_postgres();
update public.bookings set hold_expires_at = now() - interval '1 minute' where status = 'pending_payment';
select tests.as_service();
select is(public.expire_holds(), 1, 'expired one unpaid hold');
select lives_ok(
  format($$select public.create_booking_hold('anitha', %L, %L, 'Sneha', 'sneha@example.com', null, null, 'h4')$$,
         :'st', tests.ist(3, '11:00')),
  'expired slot can be booked again'
);

select tests.as_postgres();
select * from finish();
rollback;
