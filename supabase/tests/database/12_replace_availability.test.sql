-- Weekly hours are replaced atomically and stay private to each practice.
begin;
select plan(4);

select tests.make_practice('anitha@test.lumid', 'anitha') as a \gset
select tests.make_practice('ravi@test.lumid', 'ravi') as r \gset

select tests.as_user(:'a');
select is(public.replace_availability('[{"weekday":1,"start_time":"09:00","end_time":"12:00"},{"weekday":3,"start_time":"17:00","end_time":"20:00"}]'), 2, 'replaces with the new ranges');
select is((select count(*)::int from public.availability_rules where psychologist_id = :'a'), 2, 'old ranges are gone');
select throws_ok($$select public.replace_availability('[{"weekday":1,"start_time":"12:00","end_time":"09:00"}]')$$, null, null, 'an invalid range fails the whole call');
select is((select count(*)::int from public.availability_rules where psychologist_id = :'a'), 2, 'a failed replace keeps the previous hours');

select * from finish();
rollback;
