-- Core tables. Every practice-owned row carries psychologist_id for RLS.

-- ---------------------------------------------------------------------------
-- psychologists (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.psychologists (
  id uuid primary key references auth.users (id) on delete cascade,
  slug text unique,
  display_name text not null default '' check (char_length(display_name) <= 120),
  title text not null default 'Psychologist' check (char_length(title) <= 80),
  bio text not null default '' check (char_length(bio) <= 2000),
  city text not null default '' check (char_length(city) <= 80),
  languages text[] not null default '{}',
  specialties text[] not null default '{}',
  years_experience smallint check (years_experience between 0 and 70),
  rci_number text check (char_length(rci_number) <= 40),
  photo_path text,
  timezone text not null default 'Asia/Kolkata',
  min_notice_minutes integer not null default 720 check (min_notice_minutes between 0 and 20160),
  booking_window_days smallint not null default 14 check (booking_window_days between 1 and 90),
  cancellation_cutoff_hours smallint not null default 24 check (cancellation_cutoff_hours between 0 and 168),
  published boolean not null default false,
  published_at timestamptz,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slug_format check (
    slug is null or slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'
  ),
  constraint slug_not_reserved check (
    slug is null or slug not in ('www', 'app', 'api', 'admin', 'book', 'mail', 'help', 'support', 'status', 'lumid')
  ),
  constraint publish_requires_slug check (not published or slug is not null)
);

-- ---------------------------------------------------------------------------
-- session_types
-- ---------------------------------------------------------------------------
create table public.session_types (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  duration_minutes smallint not null check (duration_minutes between 15 and 240),
  price_paise integer not null check (price_paise between 0 and 10000000),
  buffer_minutes smallint not null default 10 check (buffer_minutes between 0 and 120),
  is_active boolean not null default true,
  position smallint not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index session_types_psychologist_idx on public.session_types (psychologist_id) where archived_at is null;

-- ---------------------------------------------------------------------------
-- availability
-- ---------------------------------------------------------------------------
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  minute_range int4range generated always as (
    int4range(
      (extract(hour from start_time) * 60 + extract(minute from start_time))::int,
      (extract(hour from end_time) * 60 + extract(minute from end_time))::int
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint end_after_start check (end_time > start_time),
  constraint no_overlapping_rules exclude using gist (
    psychologist_id with =, weekday with =, minute_range with &&
  )
);

create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (id) on delete cascade,
  during tstzrange not null check (not isempty(during) and lower_inc(during)),
  reason text not null default '' check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index availability_blocks_during_idx on public.availability_blocks using gist (psychologist_id, during);

-- ---------------------------------------------------------------------------
-- patients
-- ---------------------------------------------------------------------------
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  tags text[] not null default '{}',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index patients_email_per_practice on public.patients (psychologist_id, lower(email));

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete restrict,
  session_type_id uuid not null references public.session_types (id) on delete restrict,
  code text not null unique default private.generate_booking_code(),
  status public.booking_status not null default 'pending_payment',
  during tstzrange not null check (not isempty(during) and lower_inc(during) and not upper_inc(during)),
  -- Session time plus buffer; this is what must never overlap.
  blocked_during tstzrange not null,
  price_paise integer not null check (price_paise >= 0),
  source text not null default 'public' check (source in ('public', 'manual')),
  patient_note text not null default '' check (char_length(patient_note) <= 1000),
  meet_url text,
  calendar_event_id text,
  manage_token_hash text,
  hold_expires_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by public.booking_actor,
  cancel_reason text check (char_length(cancel_reason) <= 500),
  rescheduled_count smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blocked_covers_session check (blocked_during @> during),
  constraint hold_has_expiry check (status <> 'pending_payment' or hold_expires_at is not null),
  constraint no_double_booking exclude using gist (
    psychologist_id with =, blocked_during with &&
  ) where (status in ('pending_payment', 'confirmed'))
);
create index bookings_psychologist_time_idx on public.bookings (psychologist_id, lower(during));
create index bookings_patient_idx on public.bookings (patient_id);
create index bookings_hold_expiry_idx on public.bookings (hold_expires_at) where status = 'pending_payment';

-- ---------------------------------------------------------------------------
-- payments & refunds (server-written only)
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (id) on delete cascade,
  booking_id uuid not null references public.bookings (id) on delete restrict,
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  amount_paise integer not null check (amount_paise >= 0),
  fee_paise integer not null default 0 check (fee_paise >= 0),
  tax_paise integer not null default 0 check (tax_paise >= 0),
  refunded_paise integer not null default 0 check (refunded_paise >= 0),
  currency text not null default 'INR',
  status public.payment_status not null default 'created',
  method text,
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint refund_within_amount check (refunded_paise <= amount_paise)
);
create index payments_booking_idx on public.payments (booking_id);
create index payments_psychologist_idx on public.payments (psychologist_id, created_at desc);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (id) on delete cascade,
  payment_id uuid not null references public.payments (id) on delete restrict,
  amount_paise integer not null check (amount_paise > 0),
  reason text not null check (char_length(reason) <= 300),
  razorpay_refund_id text unique,
  status public.refund_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index refunds_payment_idx on public.refunds (payment_id);

-- ---------------------------------------------------------------------------
-- care
-- ---------------------------------------------------------------------------
create table public.session_notes (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  body_encrypted bytea not null,
  focus text not null default '' check (char_length(focus) <= 300),
  next_steps text not null default '' check (char_length(next_steps) <= 1000),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index session_notes_patient_idx on public.session_notes (patient_id, created_at desc);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  due_at timestamptz not null,
  message text not null check (char_length(message) between 1 and 1000),
  channel public.message_channel not null default 'email',
  status public.follow_up_status not null default 'scheduled',
  attempts smallint not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index follow_ups_due_idx on public.follow_ups (due_at) where status = 'scheduled';

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  scope text not null check (scope in ('booking_terms', 'share_check_ins', 'share_summaries', 'reminders_whatsapp')),
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index consents_active_scope on public.consents (patient_id, scope) where withdrawn_at is null;

-- ---------------------------------------------------------------------------
-- messaging & integrations
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  kind text not null check (kind in (
    'booking_confirmed', 'reminder_24h', 'reminder_1h', 'booking_cancelled',
    'booking_rescheduled', 'follow_up', 'refund_issued', 'payment_link'
  )),
  channel public.message_channel not null,
  recipient text not null,
  status public.notification_status not null default 'queued',
  provider_message_id text unique,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index notifications_once_per_booking on public.notifications (booking_id, kind, channel)
  where kind in ('reminder_24h', 'reminder_1h', 'booking_confirmed');

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (id) on delete cascade,
  provider public.integration_provider not null,
  status public.integration_status not null default 'connected',
  external_account_id text,
  external_account_label text,
  -- Reference to a Vault secret (OAuth refresh token / keys). Never selectable by clients.
  secret_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (psychologist_id, provider)
);

-- ---------------------------------------------------------------------------
-- system tables (service role only)
-- ---------------------------------------------------------------------------
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload_sha256 text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  unique (provider, event_id)
);

create table public.idempotency_keys (
  key text not null,
  scope text not null,
  request_sha256 text not null,
  response_status smallint,
  response_body jsonb,
  created_at timestamptz not null default now(),
  primary key (scope, key)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  psychologist_id uuid references public.psychologists (id) on delete set null,
  actor_id uuid,
  actor_type public.booking_actor not null,
  action text not null,
  entity text not null,
  entity_id uuid,
  request_id text,
  created_at timestamptz not null default now()
);
create index audit_log_psychologist_idx on public.audit_log (psychologist_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'psychologists', 'session_types', 'availability_rules', 'availability_blocks', 'patients',
    'bookings', 'payments', 'refunds', 'session_notes', 'follow_ups', 'consents',
    'notifications', 'integrations'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function private.set_updated_at()', t);
  end loop;
end;
$$;

-- Create the practice row automatically when an auth user signs up.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.psychologists (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
