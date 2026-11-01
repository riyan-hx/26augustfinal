-- Read models for the dashboard. security_invoker = true: RLS of the caller applies.

create view public.booking_list
with (security_invoker = true) as
select
  b.id,
  b.code,
  b.status,
  lower(b.during) as starts_at,
  upper(b.during) as ends_at,
  b.price_paise,
  b.source,
  b.meet_url,
  b.hold_expires_at,
  b.cancel_reason,
  b.patient_id,
  p.full_name as patient_name,
  p.email as patient_email,
  st.name as session_type_name,
  st.duration_minutes,
  pay.status as payment_status
from public.bookings b
join public.patients p on p.id = b.patient_id
join public.session_types st on st.id = b.session_type_id
left join lateral (
  select status from public.payments where booking_id = b.id order by created_at desc limit 1
) pay on true;

create view public.patient_overview
with (security_invoker = true) as
select
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.tags,
  p.archived_at,
  p.created_at,
  coalesce(stats.completed, 0)::int as sessions_completed,
  stats.last_session_at,
  next.next_session_at,
  latest_note.focus as current_focus,
  case
    when p.archived_at is not null then 'archived'
    when coalesce(stats.completed, 0) = 0 then 'new'
    when next.next_session_at is null and stats.last_session_at < now() - interval '21 days' then 'lapsed'
    else 'active'
  end as status
from public.patients p
left join lateral (
  select count(*) filter (where status = 'completed') as completed,
         max(lower(during)) filter (where status = 'completed') as last_session_at
  from public.bookings where patient_id = p.id
) stats on true
left join lateral (
  select min(lower(during)) as next_session_at
  from public.bookings
  where patient_id = p.id and status in ('confirmed', 'pending_payment') and lower(during) > now()
) next on true
left join lateral (
  select focus from public.session_notes
  where patient_id = p.id and focus <> ''
  order by created_at desc limit 1
) latest_note on true;

revoke all on public.booking_list, public.patient_overview from anon, authenticated;
grant select on public.booking_list, public.patient_overview to authenticated;
