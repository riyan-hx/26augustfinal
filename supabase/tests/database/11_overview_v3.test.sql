-- Waitlist is private to each practice; sessions_by_month splits new vs returning.
begin;
select plan(7);

select tests.make_practice('anitha@test.lumid', 'anitha') as a \gset
select tests.make_practice('ravi@test.lumid', 'ravi') as r \gset
select id as st from public.session_types where psychologist_id = :'a' \gset

select tests.as_user(:'a');
select lives_ok($$insert into public.waitlist_entries (full_name, preference) values ('Lakshmi Iyer', 'Prefers mornings')$$, 'practice adds to its waitlist');
select is((select psychologist_id from public.waitlist_entries limit 1), :'a'::uuid, 'owner defaults to the signed-in practice');
select throws_ok($$insert into public.waitlist_entries (full_name, email) values ('X', 'not-an-email')$$, '23514', null, 'email is checked');

select tests.as_user(:'r');
select is((select count(*) from public.waitlist_entries)::int, 0, 'another practice sees nothing');

select tests.as_anon();
select throws_ok($$select * from public.waitlist_entries$$, '42501', null, 'anon has no access');

-- Two bookings for one patient: first is new, second is returning.
select tests.as_user(:'a');
insert into public.patients (psychologist_id, full_name, email) values (:'a', 'Divya', 'divya@example.com') returning id as p \gset
select public.create_manual_booking(:'p', :'st', tests.ist(2, '10:00'), true);
select public.create_manual_booking(:'p', :'st', tests.ist(3, '10:00'), false);
select is((select sum(new_sessions)::int from public.sessions_by_month(now() - interval '1 day', now() + interval '60 days')), 1, 'one new session');
select is((select sum(returning_sessions)::int from public.sessions_by_month(now() - interval '1 day', now() + interval '60 days')), 1, 'one returning session');

select * from finish();
rollback;
