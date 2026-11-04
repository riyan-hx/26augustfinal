-- Cancelling a booking that was paid directly (UPI, cash, transfer) records the
-- payment as refunded, so Earnings never counts money for a session that won't
-- happen. Razorpay payments are refunded through Razorpay instead.
create or replace function private.refund_offline_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update public.payments
       set status = 'refunded', refunded_paise = amount_paise
     where booking_id = new.id
       and razorpay_order_id like 'offline:%'
       and status = 'captured';
  end if;
  return new;
end;
$$;

drop trigger if exists refund_offline_on_cancel on public.bookings;
create trigger refund_offline_on_cancel
  after update of status on public.bookings
  for each row execute function private.refund_offline_payment();

-- Bookings already cancelled with an offline payment still counted.
update public.payments p
   set status = 'refunded', refunded_paise = p.amount_paise
  from public.bookings b
 where b.id = p.booking_id and b.status = 'cancelled'
   and p.razorpay_order_id like 'offline:%' and p.status = 'captured';
