-- Row-level security. Default deny: every table has RLS on, and access is
-- granted explicitly per role and per column. Anonymous users get nothing
-- directly; public pages go through security-definer functions or Edge Functions.

do $$
declare
  t text;
begin
  foreach t in array array[
    'psychologists', 'session_types', 'availability_rules', 'availability_blocks', 'patients',
    'bookings', 'payments', 'refunds', 'session_notes', 'follow_ups', 'consents',
    'notifications', 'integrations', 'webhook_events', 'idempotency_keys', 'audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- psychologists: own row; publishing goes through publish_practice()
-- ---------------------------------------------------------------------------
grant select on public.psychologists to authenticated;
grant update (
  slug, display_name, title, bio, city, languages, specialties, years_experience,
  rci_number, photo_path, timezone, min_notice_minutes, booking_window_days,
  cancellation_cutoff_hours
) on public.psychologists to authenticated;

create policy "own profile: read" on public.psychologists
  for select to authenticated using (id = (select auth.uid()));
create policy "own profile: update" on public.psychologists
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Practice-owned tables with full CRUD for the owner
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['session_types', 'availability_rules', 'availability_blocks', 'follow_ups'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (psychologist_id = (select auth.uid()))
         with check (psychologist_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- patients: no hard delete from the client (archive instead)
grant select, insert, update on public.patients to authenticated;
create policy "own rows" on public.patients for all to authenticated
  using (psychologist_id = (select auth.uid()))
  with check (psychologist_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Read-only for the owner; written by functions / service role
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['bookings', 'payments', 'refunds', 'consents', 'notifications', 'audit_log'] loop
    execute format('grant select on public.%I to authenticated', t);
    execute format(
      'create policy "own rows: read" on public.%I for select to authenticated
         using (psychologist_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- bookings: never expose the manage-token hash
revoke select on public.bookings from authenticated;
grant select (
  id, psychologist_id, patient_id, session_type_id, code, status, during, blocked_during,
  price_paise, source, patient_note, meet_url, calendar_event_id, hold_expires_at,
  confirmed_at, cancelled_at, cancelled_by, cancel_reason, rescheduled_count, created_at, updated_at
) on public.bookings to authenticated;

-- session_notes: metadata readable; body only via read_note()
grant select (id, psychologist_id, patient_id, booking_id, focus, next_steps, version, created_at, updated_at)
  on public.session_notes to authenticated;
create policy "own rows: read" on public.session_notes for select to authenticated
  using (psychologist_id = (select auth.uid()));

-- integrations: status visible, secret reference never
grant select (id, psychologist_id, provider, status, external_account_label, created_at, updated_at)
  on public.integrations to authenticated;
create policy "own rows: read" on public.integrations for select to authenticated
  using (psychologist_id = (select auth.uid()));

-- webhook_events, idempotency_keys: no policies → service role only.

-- ---------------------------------------------------------------------------
-- Storage: profile photos (public read, owner write under <uid>/...)
-- Applied only when the storage schema exists (Supabase).
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;

    execute $p$
      create policy "avatar owner can write" on storage.objects for all to authenticated
        using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
        with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
    $p$;
  end if;
end;
$$;
