-- Session notes: encrypted at rest, owner-only, optimistic concurrency.
begin;
select plan(7);

select tests.make_practice('anitha@test.lumid', 'anitha') as a \gset
insert into public.patients (psychologist_id, full_name, email)
values (:'a', 'Divya Prasad', 'divya@example.com') returning id as p \gset

select tests.as_user(:'a');
select public.save_note(:'p', 'Avoids starting thesis chapter; fear of evaluation.', 'Academic avoidance') as n1 \gset
select is(public.read_note((:'n1'::jsonb ->> 'id')::uuid), 'Avoids starting thesis chapter; fear of evaluation.',
          'note round-trips');

select tests.as_postgres();
select ok(
  position('thesis' in encode((select body_encrypted from public.session_notes limit 1), 'escape')) = 0,
  'body is not stored in plain text'
);

select tests.as_user(:'a');
select is(
  (public.save_note(:'p', 'v2', null, null, null, (:'n1'::jsonb ->> 'id')::uuid, 1) ->> 'version')::int, 2,
  'update with the right version bumps it'
);
select throws_ok(
  format($$select public.save_note(%L, 'stale', null, null, null, %L, 1)$$, :'p', :'n1'::jsonb ->> 'id'),
  'P0001', 'VERSION_CONFLICT', 'stale version is rejected'
);
select ok(exists (select 1 from public.audit_log where action = 'read' and entity = 'session_notes'),
          'reading a note is audited');

select tests.as_postgres();
select tests.make_practice('rahul@test.lumid', 'rahul') as b \gset
select tests.as_user(:'b');
select throws_ok(
  format($$select public.read_note(%L)$$, :'n1'::jsonb ->> 'id'),
  'P0001', 'NOT_FOUND', 'other psychologist cannot read the note'
);
select throws_ok(
  format($$select public.save_note(%L, 'x')$$, :'p'),
  'P0001', 'NOT_FOUND', 'other psychologist cannot write notes for the patient'
);

select tests.as_postgres();
select * from finish();
rollback;
