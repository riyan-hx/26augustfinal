-- Data for the new Overview: a waitlist of people wanting a slot, and
-- sessions per month split into first sessions and returning ones.

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null default auth.uid() references public.psychologists (id) on delete cascade,
  patient_id uuid references public.patients (id) on delete set null,
  full_name text not null check (char_length(trim(full_name)) between 1 and 120),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{7,20}$'),
  preference text check (preference is null or char_length(preference) <= 200),
  status text not null default 'waiting' check (status in ('waiting', 'offered', 'booked', 'removed')),
  offered_at timestamptz,
  created_at timestamptz not null default now()
);
create index waitlist_open_idx on public.waitlist_entries (psychologist_id, created_at) where status in ('waiting', 'offered');

alter table public.waitlist_entries enable row level security;
alter table public.waitlist_entries force row level security;
revoke all on public.waitlist_entries from anon, authenticated;
grant select, insert, update, delete on public.waitlist_entries to authenticated;
create policy "own rows" on public.waitlist_entries for all to authenticated
  using (psychologist_id = (select auth.uid()))
  with check (psychologist_id = (select auth.uid()));

-- Booked sessions per month for the signed-in practice. A session is "new"
-- when it is the patient's first non-cancelled booking with this practice.
create or replace function public.sessions_by_month(p_from timestamptz, p_to timestamptz)
returns table (month date, new_sessions int, returning_sessions int)
language sql
stable
security invoker
set search_path = ''
as $$
  with live as (
    select b.patient_id, lower(b.during) as starts_at,
           row_number() over (partition by b.patient_id order by lower(b.during)) as n
      from public.bookings b
     where b.psychologist_id = (select auth.uid())
       and b.status in ('pending_payment', 'confirmed', 'completed', 'no_show')
  )
  select date_trunc('month', starts_at at time zone 'Asia/Kolkata')::date as month,
         count(*) filter (where n = 1)::int,
         count(*) filter (where n > 1)::int
    from live
   where starts_at >= p_from and starts_at < p_to
   group by 1
   order by 1;
$$;

revoke execute on function public.sessions_by_month(timestamptz, timestamptz) from public, anon;
grant execute on function public.sessions_by_month(timestamptz, timestamptz) to authenticated;
