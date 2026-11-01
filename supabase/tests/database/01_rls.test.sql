-- Tenant isolation: a psychologist can only ever see and change their own rows.
begin;
select plan(14);

select tests.make_practice('anitha@test.lumid', 'anitha') as a \gset
select tests.make_practice('rahul@test.lumid', 'rahul') as b \gset

insert into public.patients (psychologist_id, full_name, email)
values (:'a', 'Divya Prasad', 'divya@example.com') returning id as a_patient \gset

-- As A ---------------------------------------------------------------------
select tests.as_user(:'a');

select is((select count(*)::int from public.psychologists), 1, 'A sees only own profile');
select is((select count(*)::int from public.session_types), 1, 'A sees only own session types');
select is((select count(*)::int from public.patients), 1, 'A sees own patient');

-- As B ---------------------------------------------------------------------
select tests.as_postgres();
select tests.as_user(:'b');

select is((select count(*)::int from public.patients), 0, 'B cannot see A''s patients');
select is((select count(*)::int from public.session_types where psychologist_id = :'a'), 0,
          'B cannot see A''s session types');

update public.psychologists set bio = 'hacked' where id = :'a';
select tests.as_postgres();
select isnt((select bio from public.psychologists where id = :'a'), 'hacked', 'B cannot update A''s profile');

select tests.as_user(:'b');
select throws_ok(
  format($$insert into public.patients (psychologist_id, full_name, email) values (%L, 'X', 'x@example.com')$$, :'a'),
  '42501', null, 'B cannot insert a patient into A''s practice'
);

select throws_ok(
  $$update public.psychologists set published = false$$,
  '42501', null, 'publish flag is not directly writable'
);

select throws_ok(
  $$select manage_token_hash from public.bookings$$,
  '42501', null, 'manage token hash is never readable'
);

select throws_ok(
  $$select secret_id from public.integrations$$,
  '42501', null, 'integration secret reference is never readable'
);

select throws_ok(
  $$select * from public.webhook_events$$,
  '42501', null, 'webhook events are service-only'
);

select throws_ok(
  $$select public.expire_holds()$$,
  '42501', null, 'clients cannot run cron functions'
);

-- As anon ------------------------------------------------------------------
select tests.as_postgres();
select tests.as_anon();

select throws_ok($$select * from public.patients$$, '42501', null, 'anon cannot read patients');
select ok((public.public_profile('anitha') ->> 'display_name') is not null, 'anon can read a published profile');

select tests.as_postgres();
select * from finish();
rollback;
