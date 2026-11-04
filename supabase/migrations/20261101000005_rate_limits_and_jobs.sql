-- Rate limiting for public endpoints and scheduled jobs.

create table public.rate_limits (
  bucket text primary key,
  window_started_at timestamptz not null,
  hits integer not null
);
alter table public.rate_limits enable row level security;
alter table public.rate_limits force row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Fixed-window counter. Returns true when the call is allowed.
create or replace function public.check_rate_limit(p_bucket text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits int;
begin
  if not private.is_service_role() then
    perform private.raise_api_error('FORBIDDEN', 'Not allowed.');
  end if;

  insert into public.rate_limits as r (bucket, window_started_at, hits)
  values (p_bucket, now(), 1)
  on conflict (bucket) do update
    set hits = case when r.window_started_at < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_started_at = case when r.window_started_at < now() - make_interval(secs => p_window_seconds)
                                 then now() else r.window_started_at end
  returning hits into v_hits;

  return v_hits <= p_limit;
end;
$$;
revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;

-- Confirms a booking when its payment is captured. Shared by the webhook and the
-- checkout fast path. Returns 'confirmed', 'already_confirmed' or 'needs_refund'.
create or replace function public.confirm_payment(
  p_order_id text,
  p_payment_id text,
  p_method text,
  p_fee_paise int,
  p_tax_paise int
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pay public.payments;
  bk public.bookings;
begin
  if not private.is_service_role() then
    perform private.raise_api_error('FORBIDDEN', 'Not allowed.');
  end if;

  select * into pay from public.payments where razorpay_order_id = p_order_id for update;
  if not found then
    perform private.raise_api_error('NOT_FOUND', 'Unknown order.');
  end if;

  update public.payments
     set razorpay_payment_id = coalesce(razorpay_payment_id, p_payment_id),
         method = coalesce(p_method, method),
         fee_paise = coalesce(p_fee_paise, fee_paise),
         tax_paise = coalesce(p_tax_paise, tax_paise),
         status = case when status in ('refunded', 'partially_refunded') then status else 'captured' end,
         captured_at = coalesce(captured_at, now())
   where id = pay.id;

  select * into bk from public.bookings where id = pay.booking_id for update;

  if bk.status = 'confirmed' or bk.status = 'completed' then
    return 'already_confirmed';
  end if;

  if bk.status = 'pending_payment' then
    perform public.transition_booking(bk.id, 'confirmed', null, 'system');
    return 'confirmed';
  end if;

  -- Paid after the hold expired or was cancelled: try to re-take the slot.
  if bk.status = 'expired' then
    begin
      update public.bookings
         set status = 'confirmed', confirmed_at = now(), hold_expires_at = null
       where id = bk.id;
      perform private.write_audit(bk.psychologist_id, 'system', 'status:confirmed_late', 'bookings', bk.id);
      return 'confirmed';
    exception when exclusion_violation then
      return 'needs_refund';
    end;
  end if;

  return 'needs_refund';
end;
$$;
revoke execute on function public.confirm_payment(text, text, text, int, int) from public, anon, authenticated;

-- Schedule jobs when pg_cron is available (Supabase: enable it in Database → Extensions).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('expire-holds', '* * * * *', 'select public.expire_holds()');
    perform cron.schedule('purge-rate-limits', '17 * * * *',
      $q$delete from public.rate_limits where window_started_at < now() - interval '1 day'$q$);
    perform cron.schedule('purge-idempotency-keys', '23 3 * * *',
      $q$delete from public.idempotency_keys where created_at < now() - interval '7 days'$q$);
  end if;
end;
$$;
