-- Extensions, enums and shared helpers.
-- Times are stored as timestamptz (UTC). Money is stored in paise (integer).

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Private schema: never exposed through the API.
create schema if not exists private;
revoke all on schema private from public;

-- New functions in public are not callable by clients unless granted explicitly.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.booking_status as enum (
  'pending_payment', 'confirmed', 'completed', 'no_show', 'cancelled', 'expired'
);

create type public.booking_actor as enum ('patient', 'psychologist', 'system');

create type public.payment_status as enum (
  'created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'
);

create type public.refund_status as enum ('pending', 'processed', 'failed');

create type public.follow_up_status as enum ('scheduled', 'sent', 'failed', 'cancelled');

create type public.notification_status as enum ('queued', 'sent', 'delivered', 'bounced', 'failed');

create type public.message_channel as enum ('email', 'whatsapp');

create type public.integration_provider as enum ('google', 'razorpay');

create type public.integration_status as enum ('connected', 'needs_reauth', 'disconnected');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Keeps updated_at current on every UPDATE.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Short human-readable booking code, e.g. B-7K3Q9X (no ambiguous characters).
create or replace function private.generate_booking_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  bytes bytea := extensions.gen_random_bytes(6);
  result text := 'B-';
begin
  for i in 0..5 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return result;
end;
$$;

-- True when the request comes from the service role (Edge Functions) or from a
-- direct database connection (pg_cron, migrations). Uses the JWT claim, not
-- current_user, because current_user is the owner inside security-definer code.
create or replace function private.is_service_role()
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when nullif(current_setting('request.jwt.claims', true), '') is null
      then session_user not in ('authenticator', 'anon', 'authenticated')
    else coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role'
  end;
$$;

-- Secrets live in Supabase Vault in production. Access goes through this one
-- function so the storage can change without touching callers.
create or replace function private.get_secret(secret_name text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  secret_value text;
begin
  if to_regclass('vault.decrypted_secrets') is not null then
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1'
      into secret_value
      using secret_name;
  end if;
  if secret_value is null then
    raise exception 'secret % is not configured', secret_name using errcode = 'P0001';
  end if;
  return secret_value;
end;
$$;

revoke all on function private.get_secret(text) from public;
