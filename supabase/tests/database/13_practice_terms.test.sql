-- Terms are recorded server-side and required before a page goes live.
begin;
select plan(6);

select tests.make_practice('meera@test.lumid', 'meera') as m \gset

select tests.as_user(:'m');
select throws_like($$select public.publish_practice(true)$$, 'PUBLISH_REQUIREMENTS', 'an otherwise complete practice cannot publish before confirming the terms');
select throws_ok($$update public.psychologists set terms_accepted_at = now()$$, '42501', null, 'the acceptance time cannot be written directly');
select isnt(public.accept_practice_terms('2026-11'), null, 'accepting returns the server time');
select is((select terms_version from public.psychologists where id = :'m'), '2026-11', 'the version is stored');
select ok(public.publish_practice(true), 'publishes once the terms are confirmed');
select throws_ok($$select public.accept_practice_terms('')$$, null, null, 'an empty version is rejected');

select * from finish();
rollback;
