-- Public slots and publishing rules.
begin;
select plan(9);

select tests.make_practice('anitha@test.lumid', 'anitha') as a \gset
select id as st from public.session_types where psychologist_id = :'a' \gset

select tests.as_anon();
select ok(
  (select count(*) from public.public_available_slots('anitha', :'st', (now() + interval '3 days')::date,
                                                      (now() + interval '3 days')::date)) > 20,
  'a full open day offers many 30-min-step slots'
);
select ok(
  not exists (
    select 1 from public.public_available_slots('anitha', :'st', current_date, current_date + 1)
    where starts_at < now() + interval '60 minutes'
  ),
  'no slot inside minimum notice'
);
select throws_ok(
  format($$select * from public.public_available_slots('anitha', %L, current_date, current_date + 40)$$, :'st'),
  'P0001', 'VALIDATION_FAILED', 'range is capped at 31 days'
);

select tests.as_postgres();
select tests.as_service();
select public.create_booking_hold('anitha', :'st', tests.ist(3, '10:00'), 'Divya', 'divya@example.com',
  null, null, 'h') \gset

select tests.as_postgres();
select tests.as_anon();
select ok(
  not exists (
    select 1 from public.public_available_slots('anitha', :'st', (tests.ist(3, '00:00') at time zone 'Asia/Kolkata')::date,
                                                (tests.ist(3, '00:00') at time zone 'Asia/Kolkata')::date)
    where starts_at in (tests.ist(3, '09:30'), tests.ist(3, '10:00'), tests.ist(3, '10:30'))
  ),
  'held time and its neighbours (incl. buffer) are not offered'
);
select ok(
  exists (
    select 1 from public.public_available_slots('anitha', :'st', (tests.ist(3, '00:00') at time zone 'Asia/Kolkata')::date,
                                                (tests.ist(3, '00:00') at time zone 'Asia/Kolkata')::date)
    where starts_at = tests.ist(3, '11:00')
  ),
  'first slot after the buffer is offered'
);

-- Publishing -------------------------------------------------------------------
select tests.as_postgres();
select tests.create_user('new@test.lumid') as n \gset
select tests.as_user(:'n');
select throws_like(
  $$select public.publish_practice(true)$$,
  'PUBLISH_REQUIREMENTS', 'cannot publish an incomplete practice'
);
update public.psychologists set slug = 'new-person', display_name = 'New Person';
insert into public.session_types (psychologist_id, name, duration_minutes, price_paise)
values (:'n', 'Intro', 30, 100000);
insert into public.availability_rules (psychologist_id, weekday, start_time, end_time)
values (:'n', 1, '10:00', '13:00');
select public.accept_practice_terms('2026-11');
select ok(public.publish_practice(true), 'publishes when complete');
select throws_ok(
  $$update public.psychologists set slug = 'admin'$$,
  '23514', null, 'reserved slugs are rejected'
);

select tests.as_postgres();
select tests.as_anon();
select is(public.public_profile('anitha-unknown'), null, 'unknown slug returns nothing');

select tests.as_postgres();
select * from finish();
rollback;
