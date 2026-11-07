-- Richer public profile: how the psychologist works, approaches, who they see,
-- qualifications, and an opt-in to show their RCI registration on the page.
-- Additive only: existing rows get empty defaults and their pages are unchanged.

alter table public.psychologists
  add column if not exists approach text not null default ''
    check (char_length(approach) <= 1500),
  add column if not exists modalities text[] not null default '{}'
    check (cardinality(modalities) <= 10),
  add column if not exists audiences text[] not null default '{}'
    check (cardinality(audiences) <= 8),
  add column if not exists qualifications jsonb not null default '[]'::jsonb
    check (jsonb_typeof(qualifications) = 'array' and jsonb_array_length(qualifications) <= 8),
  add column if not exists show_rci boolean not null default false;

grant update (approach, modalities, audiences, qualifications, show_rci)
  on public.psychologists to authenticated;

-- "login" is an app route, so it can never be a booking link.
alter table public.psychologists drop constraint if exists slug_not_reserved;
alter table public.psychologists add constraint slug_not_reserved check (
  slug is null or slug not in ('www', 'app', 'api', 'admin', 'book', 'mail', 'help', 'support', 'status', 'lumid', 'login')
);

create or replace function public.public_profile(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'slug', p.slug,
    'display_name', p.display_name,
    'title', p.title,
    'bio', p.bio,
    'city', p.city,
    'languages', p.languages,
    'specialties', p.specialties,
    'years_experience', p.years_experience,
    'photo_path', p.photo_path,
    'timezone', p.timezone,
    'cancellation_cutoff_hours', p.cancellation_cutoff_hours,
    'booking_window_days', p.booking_window_days,
    'min_notice_minutes', p.min_notice_minutes,
    'approach', p.approach,
    'modalities', p.modalities,
    'audiences', p.audiences,
    'qualifications', p.qualifications,
    'registration', case when p.show_rci and coalesce(btrim(p.rci_number), '') <> ''
                         then 'RCI reg. ' || btrim(p.rci_number) end,
    'session_types', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'description', s.description,
        'duration_minutes', s.duration_minutes, 'price_paise', s.price_paise
      ) order by s.position, s.price_paise)
      from public.session_types s
      where s.psychologist_id = p.id and s.is_active and s.archived_at is null
    ), '[]'::jsonb)
  )
  from public.psychologists p
  where p.slug = lower(p_slug) and p.published and p.deletion_requested_at is null;
$$;

grant execute on function public.public_profile(text) to anon, authenticated;
