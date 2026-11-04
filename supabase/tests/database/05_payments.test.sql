-- Payment confirmation paths and rate limiting.
begin;
select plan(7);

select tests.make_practice('anitha@test.lumid', 'anitha') as a \gset
select id as st from public.session_types where psychologist_id = :'a' \gset

select tests.as_service();
select public.create_booking_hold('anitha', :'st', tests.ist(3, '10:00'), 'Divya', 'divya@example.com', null, null, 'h')
  as h1 \gset
insert into public.payments (psychologist_id, booking_id, razorpay_order_id, amount_paise)
values (:'a', (:'h1'::jsonb ->> 'booking_id')::uuid, 'order_1', 150000);

select is(public.confirm_payment('order_1', 'pay_1', 'upi', 3000, 540), 'confirmed', 'capture confirms the hold');
select is(public.confirm_payment('order_1', 'pay_1', 'upi', 3000, 540), 'already_confirmed', 'duplicate event is harmless');
select is((select status::text from public.payments where razorpay_order_id = 'order_1'), 'captured', 'payment captured');

-- Late payment: hold expired and someone else took the slot -> refund
select public.create_booking_hold('anitha', :'st', tests.ist(4, '10:00'), 'Arjun', 'arjun@example.com', null, null, 'h')
  as h2 \gset
insert into public.payments (psychologist_id, booking_id, razorpay_order_id, amount_paise)
values (:'a', (:'h2'::jsonb ->> 'booking_id')::uuid, 'order_2', 150000);
update public.bookings set hold_expires_at = now() - interval '1 minute' where id = (:'h2'::jsonb ->> 'booking_id')::uuid;
select public.expire_holds();
select public.create_booking_hold('anitha', :'st', tests.ist(4, '10:00'), 'Sneha', 'sneha@example.com', null, null, 'h')
  \gset
select is(public.confirm_payment('order_2', 'pay_2', 'card', 0, 0), 'needs_refund', 'late payment on a taken slot needs refund');

-- Late payment where the slot is still free -> confirmed
select public.create_booking_hold('anitha', :'st', tests.ist(5, '10:00'), 'Rahul', 'rahul@example.com', null, null, 'h')
  as h3 \gset
insert into public.payments (psychologist_id, booking_id, razorpay_order_id, amount_paise)
values (:'a', (:'h3'::jsonb ->> 'booking_id')::uuid, 'order_3', 150000);
update public.bookings set hold_expires_at = now() - interval '1 minute' where id = (:'h3'::jsonb ->> 'booking_id')::uuid;
select public.expire_holds();
select is(public.confirm_payment('order_3', 'pay_3', 'upi', 0, 0), 'confirmed', 'late payment on a free slot confirms');

-- Rate limit
select ok(public.check_rate_limit('ip:1', 2, 60) and public.check_rate_limit('ip:1', 2, 60), 'within limit');
select ok(not public.check_rate_limit('ip:1', 2, 60), 'third call is limited');

select tests.as_postgres();
select * from finish();
rollback;
