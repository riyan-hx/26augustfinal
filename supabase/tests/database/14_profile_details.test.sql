-- Profile details: owner can edit them, the public page shows them, and the
-- RCI number appears only when the psychologist opts in.
begin;
select plan(9);

select tests.make_practice('meera@test.lumid', 'meera') as m \gset

select is(public.public_profile('meera') -> 'approach', '""'::jsonb, 'a new practice has an empty approach');
select is(public.public_profile('meera') -> 'registration', 'null'::jsonb, 'registration is hidden by default');

select tests.as_user(:'m');
update public.psychologists
   set approach = 'Small, practical steps.', modalities = '{CBT,ACT}', audiences = '{Students}',
       qualifications = '[{"title":"M.Phil Clinical Psychology","place":"Kochi","year":"2018"}]',
       rci_number = 'A12345'
 where id = :'m';
select tests.as_postgres();

select is(public.public_profile('meera') ->> 'approach', 'Small, practical steps.', 'approach is public');
select is(public.public_profile('meera') -> 'modalities', '["CBT","ACT"]'::jsonb, 'approaches are public');
select is(public.public_profile('meera') -> 'qualifications' -> 0 ->> 'title', 'M.Phil Clinical Psychology', 'qualifications are public');
select is(public.public_profile('meera') -> 'registration', 'null'::jsonb, 'RCI number stays private until opted in');

select tests.as_user(:'m');
update public.psychologists set show_rci = true where id = :'m';
select tests.as_postgres();
select is(public.public_profile('meera') ->> 'registration', 'RCI reg. A12345', 'RCI number shows once opted in');

select throws_ok(
  format($$update public.psychologists set qualifications = '{"title":"x"}' where id = %L$$, :'m'),
  '23514', null, 'qualifications must be a list'
);
select throws_ok(
  format($$update public.psychologists set slug = 'login' where id = %L$$, :'m'),
  '23514', null, 'login cannot be a booking link'
);

select * from finish();
rollback;
