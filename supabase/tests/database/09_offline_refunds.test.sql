-- Cancelling a directly-paid booking records the payment as refunded.
begin;
select plan(3);

select tests.make_practice('anitha@test.lumid', 'anitha') as a \gset
select id as st from public.session_types where psychologist_id = :'a' \gset
select tests.as_user(:'a');
insert into public.patients (psychologist_id, full_name, email) values (:'a', 'Divya', 'divya@example.com') returning id as pid \gset
select public.create_manual_booking(:'pid', :'st', tests.ist(3, '10:00'), true) as bid \gset
select is((select net_paise from public.earnings_summary(now() - interval '1 day', now() + interval '1 day')), 150000::bigint, 'paid booking counts');
select public.transition_booking(:'bid', 'cancelled', 'Patient asked to cancel');
select is((select status::text from public.payments where booking_id = :'bid'), 'refunded', 'payment marked refunded');
select is((select net_paise from public.earnings_summary(now() - interval '1 day', now() + interval '1 day')), 0::bigint, 'cancelled booking no longer counts');

select * from finish();
rollback;
