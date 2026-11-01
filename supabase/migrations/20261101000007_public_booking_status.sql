-- Lets a patient poll their own booking while payment confirms.
-- Authorised only by the 256-bit manage token handed out at hold time (stored as SHA-256).

create or replace function public.public_booking_status(p_booking_id uuid, p_manage_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  b public.bookings;
begin
  select * into b from public.bookings
   where id = p_booking_id
     and manage_token_hash = encode(extensions.digest(p_manage_token, 'sha256'), 'hex');
  if not found then
    perform private.raise_api_error('NOT_FOUND', 'Booking not found.');
  end if;

  return jsonb_build_object(
    'booking_id', b.id,
    'code', b.code,
    'status', b.status,
    'starts_at', lower(b.during),
    'ends_at', upper(b.during),
    'hold_expires_at', b.hold_expires_at
  );
end;
$$;

revoke execute on function public.public_booking_status(uuid, text) from public;
grant execute on function public.public_booking_status(uuid, text) to anon, authenticated;
