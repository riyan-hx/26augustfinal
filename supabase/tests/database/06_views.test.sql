-- Dashboard read models respect tenant isolation and compute status.
begin;
select plan(5);

select tests.make_practice('anitha@test.lumid', 'anitha') as a \gset
select tests.make_practice('rahul@test.lumid', 'rahul') as b \gset
select id as st from public.session_types where psychologist_id = :'a' \gset

select tests.as_service();
select public.create_booking_hold('anitha', :'st', tests.ist(3, '10:00'), 'Divya', 'divya@example.com', null, null, 'h')
  as h \gset

select tests.as_postgres();
select tests.as_user(:'a');
select is((select count(*)::int from public.booking_list), 1, 'owner sees the booking');
select is((select patient_name from public.booking_list), 'Divya', 'booking joins patient name');
select is((select status from public.patient_overview), 'new', 'patient with no completed sessions is new');
select ok((select next_session_at from public.patient_overview) is not null, 'next session is computed');

select tests.as_postgres();
select tests.as_user(:'b');
select is((select count(*)::int from public.booking_list) + (select count(*)::int from public.patient_overview), 0,
          'other psychologist sees nothing through the views');

select tests.as_postgres();
select * from finish();
rollback;
