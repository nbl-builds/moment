-- Booking engine: capacity, double-booking, pricing, coupons, status rules.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.mk_user(p_id uuid, p_name text) returns void language sql as $$
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
          p_id::text || '@test.local', jsonb_build_object('display_name', p_name), now(), now());
$$;
create function pg_temp.login(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;
-- Tomorrow 10:00 in Pakistan
create function pg_temp.tomorrow_at(p_time time) returns timestamptz language sql as $$
  select (((now() at time zone 'Asia/Karachi')::date + 1) + p_time) at time zone 'Asia/Karachi';
$$;

-- Fixtures -----------------------------------------------------------------
select pg_temp.mk_user('22222222-0000-4000-a000-000000000001', 'Owner');
select pg_temp.mk_user('22222222-0000-4000-a000-000000000002', 'Staff');
select pg_temp.mk_user('22222222-0000-4000-a000-000000000003', 'Consumer one');
select pg_temp.mk_user('22222222-0000-4000-a000-000000000004', 'Consumer two');

insert into public.businesses (id, slug, name, kind, status, created_by)
values ('22222222-0000-4000-b000-000000000001', 'test-booking-biz', 'Booking Biz', 'operator', 'active', '22222222-0000-4000-a000-000000000001');
insert into public.business_members (business_id, user_id, role, status)
values ('22222222-0000-4000-b000-000000000001', '22222222-0000-4000-a000-000000000002', 'staff', 'active');

insert into public.staff_members (id, business_id, display_name, is_bookable, is_host)
values ('22222222-0000-4000-d000-000000000001', '22222222-0000-4000-b000-000000000001', 'Therapist', true, true);
insert into public.staff_schedules (business_id, staff_id, weekday, start_time, end_time)
select '22222222-0000-4000-b000-000000000001', '22222222-0000-4000-d000-000000000001', d, '08:00', '20:00'
from generate_series(1, 7) d;

insert into public.listings (id, business_id, type, booking_mode, slug, title, city, duration_minutes, max_guests, price_amount, price_unit, status) values
  ('22222222-0000-4000-e000-000000000001', '22222222-0000-4000-b000-000000000001', 'experience', 'slot', 'test-tour', 'Test tour', 'Lahore', 120, 3, 300000, 'per_person', 'published'),
  ('22222222-0000-4000-e000-000000000002', '22222222-0000-4000-b000-000000000001', 'service', 'appointment', 'test-massage', 'Test massage', 'Lahore', 60, 1, 800000, 'per_booking', 'published');
insert into public.listing_staff (business_id, listing_id, staff_id)
values ('22222222-0000-4000-b000-000000000001', '22222222-0000-4000-e000-000000000002', '22222222-0000-4000-d000-000000000001');

insert into public.slots (id, business_id, listing_id, starts_at, ends_at, capacity) values
  ('22222222-0000-4000-9000-000000000001', '22222222-0000-4000-b000-000000000001', '22222222-0000-4000-e000-000000000001',
   pg_temp.tomorrow_at('09:00'), pg_temp.tomorrow_at('11:00'), 3);

insert into public.coupons (code, business_id, title, discount_type, discount_value, per_user_limit)
values ('ONCE10', '22222222-0000-4000-b000-000000000001', 'Once', 'percent', 10, 1);

-- Slot capacity ------------------------------------------------------------
select pg_temp.login('22222222-0000-4000-a000-000000000003');

select is(
  (select total_amount from public.create_booking(
     p_listing_id => '22222222-0000-4000-e000-000000000001',
     p_slot_id => '22222222-0000-4000-9000-000000000001',
     p_guest_count => 2)),
  600000, 'price is computed server-side (per person x guests)');

select pg_temp.logout();
select is((select seats_booked from public.slots where id = '22222222-0000-4000-9000-000000000001'), 2, 'seats_booked tracks bookings');
-- Regression: guard triggers must not revert stats updated on a consumer's behalf.
select is((select booking_count from public.listings where id = '22222222-0000-4000-e000-000000000001'), 1,
  'consumer bookings update listing stats');

select pg_temp.login('22222222-0000-4000-a000-000000000004');
select throws_ok(
  $$ select public.create_booking(p_listing_id => '22222222-0000-4000-e000-000000000001',
       p_slot_id => '22222222-0000-4000-9000-000000000001', p_guest_count => 2) $$,
  '23P01', null, 'a slot cannot be overbooked');
select lives_ok(
  $$ select public.create_booking(p_listing_id => '22222222-0000-4000-e000-000000000001',
       p_slot_id => '22222222-0000-4000-9000-000000000001', p_guest_count => 1, p_idempotency_key => 'retry-1') $$,
  'the last seat can be booked');
select is(
  (select count(*)::int from public.bookings where consumer_id = '22222222-0000-4000-a000-000000000004'), 1,
  'consumer two has one booking');
select lives_ok(
  $$ select public.create_booking(p_listing_id => '22222222-0000-4000-e000-000000000001',
       p_slot_id => '22222222-0000-4000-9000-000000000001', p_guest_count => 1, p_idempotency_key => 'retry-1') $$,
  'retrying with the same idempotency key does not fail');
select is(
  (select count(*)::int from public.bookings where consumer_id = '22222222-0000-4000-a000-000000000004'), 1,
  'idempotent retry returns the existing booking');

select pg_temp.logout();
select is((select status::text from public.slots where id = '22222222-0000-4000-9000-000000000001'), 'full', 'a sold-out slot is marked full');

-- Guests outside the listing limits
select pg_temp.login('22222222-0000-4000-a000-000000000003');
select throws_ok(
  $$ select public.create_booking(p_listing_id => '22222222-0000-4000-e000-000000000001',
       p_slot_id => '22222222-0000-4000-9000-000000000001', p_guest_count => 4) $$,
  '22023', null, 'guest count must respect max_guests');

-- Cancelling frees the seats
select lives_ok(
  $$ select public.cancel_booking((select id from public.bookings
       where consumer_id = '22222222-0000-4000-a000-000000000003' and slot_id = '22222222-0000-4000-9000-000000000001')) $$,
  'consumers can cancel upcoming bookings');
select pg_temp.logout();
select is((select seats_booked from public.slots where id = '22222222-0000-4000-9000-000000000001'), 1, 'cancelling frees seats');
select is((select status::text from public.slots where id = '22222222-0000-4000-9000-000000000001'), 'open', 'the slot reopens');
select is(
  (select count(*)::int from public.booking_events e join public.bookings b on b.id = e.booking_id
   where b.consumer_id = '22222222-0000-4000-a000-000000000003'), 2,
  'status history is recorded');

-- Appointments -------------------------------------------------------------
select pg_temp.login('22222222-0000-4000-a000-000000000003');

select ok(
  exists (select 1 from public.get_available_times('22222222-0000-4000-e000-000000000002',
            ((now() at time zone 'Asia/Karachi')::date + 1)) where starts_at = pg_temp.tomorrow_at('10:00')),
  '10:00 tomorrow is available');
select lives_ok(
  $$ select public.create_booking(p_listing_id => '22222222-0000-4000-e000-000000000002', p_starts_at => pg_temp.tomorrow_at('10:00')) $$,
  'consumer one books 10:00');
select ok(
  not exists (select 1 from public.get_available_times('22222222-0000-4000-e000-000000000002',
                ((now() at time zone 'Asia/Karachi')::date + 1)) where starts_at = pg_temp.tomorrow_at('10:00')),
  '10:00 is no longer offered');
select ok(
  not exists (select 1 from public.get_available_times('22222222-0000-4000-e000-000000000002',
                ((now() at time zone 'Asia/Karachi')::date + 1)) where starts_at = pg_temp.tomorrow_at('10:30')),
  'overlapping 10:30 is not offered either');
select ok(
  exists (select 1 from public.get_available_times('22222222-0000-4000-e000-000000000002',
            ((now() at time zone 'Asia/Karachi')::date + 1)) where starts_at = pg_temp.tomorrow_at('11:00')),
  '11:00 is still free');

select pg_temp.login('22222222-0000-4000-a000-000000000004');
select throws_ok(
  $$ select public.create_booking(p_listing_id => '22222222-0000-4000-e000-000000000002', p_starts_at => pg_temp.tomorrow_at('10:30')) $$,
  '23P01', null, 'an overlapping appointment is refused');
select throws_ok(
  $$ select public.create_booking(p_listing_id => '22222222-0000-4000-e000-000000000002', p_starts_at => pg_temp.tomorrow_at('10:10')) $$,
  '23P01', null, 'off-grid start times are refused');

-- The database constraint holds even if a bug skips the RPC check
select pg_temp.logout();
select throws_ok(
  $$ insert into public.bookings (business_id, consumer_id, listing_id, staff_id, starts_at, ends_at, subtotal_amount, total_amount)
     values ('22222222-0000-4000-b000-000000000001', '22222222-0000-4000-a000-000000000004', '22222222-0000-4000-e000-000000000002',
             '22222222-0000-4000-d000-000000000001', pg_temp.tomorrow_at('10:15'), pg_temp.tomorrow_at('11:15'), 800000, 800000) $$,
  '23P01', null, 'the exclusion constraint blocks staff double-booking');

-- Coupons ----------------------------------------------------------------------
select pg_temp.login('22222222-0000-4000-a000-000000000004');
select is(
  (select discount_amount from public.create_booking(
     p_listing_id => '22222222-0000-4000-e000-000000000002', p_starts_at => pg_temp.tomorrow_at('14:00'), p_coupon_code => 'once10')),
  80000, 'coupon codes are case-insensitive and discount 10%');
select throws_ok(
  $$ select public.create_booking(p_listing_id => '22222222-0000-4000-e000-000000000002',
       p_starts_at => pg_temp.tomorrow_at('16:00'), p_coupon_code => 'ONCE10') $$,
  '22023', null, 'per-user coupon limits are enforced');
select throws_ok(
  $$ select public.create_booking(p_listing_id => '22222222-0000-4000-e000-000000000002',
       p_starts_at => pg_temp.tomorrow_at('16:00'), p_coupon_code => 'NOPE') $$,
  '22023', null, 'unknown coupons are rejected');
select is_empty($$ select 1 from public.coupons where code = 'ONCE10' $$, 'private coupons are not listable by consumers');

-- Status rules -------------------------------------------------------------
select throws_ok(
  $$ select public.cancel_booking((select id from public.bookings
       where consumer_id = '22222222-0000-4000-a000-000000000003' and starts_at = pg_temp.tomorrow_at('10:00'))) $$,
  'P0002', null, 'consumers cannot cancel someone else''s booking');
select throws_ok(
  $$ select public.update_booking_status((select id from public.bookings
       where consumer_id = '22222222-0000-4000-a000-000000000004' limit 1), 'completed') $$,
  'P0002', null, 'consumers cannot change booking status');

select pg_temp.login('22222222-0000-4000-a000-000000000002');
select throws_ok(
  $$ select public.update_booking_status((select id from public.bookings
       where consumer_id = '22222222-0000-4000-a000-000000000003' and starts_at = pg_temp.tomorrow_at('10:00')), 'completed') $$,
  '22023', null, 'bookings cannot be completed before they start');
select lives_ok(
  $$ select public.update_booking_status((select id from public.bookings
       where consumer_id = '22222222-0000-4000-a000-000000000003' and starts_at = pg_temp.tomorrow_at('10:00')), 'cancelled_by_business', 'Therapist unwell') $$,
  'staff can cancel on behalf of the business');

select pg_temp.login('22222222-0000-4000-a000-000000000004');
select lives_ok(
  $$ select public.create_booking(p_listing_id => '22222222-0000-4000-e000-000000000002', p_starts_at => pg_temp.tomorrow_at('10:00')) $$,
  'a cancelled appointment frees the time');

-- Unpublished listings cannot be booked
select pg_temp.logout();
update public.listings set status = 'draft' where id = '22222222-0000-4000-e000-000000000002';
select pg_temp.login('22222222-0000-4000-a000-000000000003');
select throws_ok(
  $$ select public.create_booking(p_listing_id => '22222222-0000-4000-e000-000000000002', p_starts_at => pg_temp.tomorrow_at('12:00')) $$,
  'P0002', null, 'draft listings cannot be booked');

select * from finish();
rollback;
