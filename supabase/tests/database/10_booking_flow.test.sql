-- Booking Flow: quote_booking and coupon reasons, private slot bookings,
-- create_bookings (services cart, all or nothing, idempotent), available_dates.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

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
create function pg_temp.listing(p_slug text) returns uuid language sql as $$
  select id from public.listings where slug = p_slug;
$$;
-- Next free appointment time for a service on or after a day.
create function pg_temp.free_time(p_listing uuid, p_from int default 1) returns timestamptz language sql as $$
  select t.starts_at from generate_series(p_from, p_from + 10) d
  cross join lateral public.get_available_times(p_listing, (now() at time zone 'Asia/Karachi')::date + d) t
  order by t.starts_at limit 1;
$$;

select has_column('public', 'listings', 'pets_allowed', 'listings say whether pets are allowed');
select has_column('public', 'listings', 'private_price_amount', 'listings may offer private sessions');
select has_column('public', 'bookings', 'is_private', 'bookings can be private');
select has_function('public', 'quote_booking', 'quote_booking exists');
select has_function('public', 'create_bookings', 'create_bookings exists');
select has_function('public', 'available_dates', 'available_dates exists');

-- ---------------------------------------------------------------------------
-- Quotes and coupons (as the dev user)
-- ---------------------------------------------------------------------------
-- Drop coupon uses left by trying the app locally (rolled back at the end).
delete from public.coupon_redemptions where user_id = '00000000-0000-4000-a000-000000000099';
select pg_temp.login('00000000-0000-4000-a000-000000000099');

select is(
  (public.quote_booking(pg_temp.listing('margalla-sunrise-hike'), 2) ->> 'subtotal')::int,
  600000, 'per-person price times guests');
select is(
  (public.quote_booking(pg_temp.listing('margalla-sunrise-hike'), 2, null, 'ISB15') ->> 'discount')::int,
  90000, '15% Islamabad coupon applies');
select is(
  public.quote_booking(pg_temp.listing('margalla-sunrise-hike'), 2, null, 'SUMMER24') ->> 'coupon_error',
  'This code has expired', 'expired coupon gives its reason');
select is(
  public.quote_booking(pg_temp.listing('margalla-sunrise-hike'), 2, null, 'NOPE99') ->> 'coupon_error',
  'This code doesn''t exist', 'unknown coupon gives its reason');
select is(
  public.quote_booking(pg_temp.listing('margalla-sunrise-hike'), 2, null, 'BIGSPEND') ->> 'coupon_error',
  'Spend at least 2000000 to use this code', 'minimum spend gives its reason');
select is(
  public.quote_booking(pg_temp.listing('margalla-sunrise-hike'), 2, null, 'LAHORE300') ->> 'coupon_error',
  'This code doesn''t exist', 'another business''s coupon does not apply');
select is(
  (public.quote_booking(pg_temp.listing('margalla-sunrise-hike'), 4, null, null, true) ->> 'subtotal')::int,
  2000000, 'private sessions use the per-booking private price');
select throws_ok(
  $$ select public.quote_booking(pg_temp.listing('burns-road-food-crawl'), 2, null, null, true) $$,
  '22023', null, 'private sessions only where offered');

-- ---------------------------------------------------------------------------
-- Slots: sold out, seats left, private
-- ---------------------------------------------------------------------------
select throws_ok(
  format($$ select public.create_booking(p_listing_id => %L, p_slot_id => %L, p_guest_count => 1) $$,
    pg_temp.listing('saidpur-faisal-golden-hour'),
    (select id from public.slots where listing_id = pg_temp.listing('saidpur-faisal-golden-hour') and status = 'full' order by starts_at limit 1)),
  '23P01', 'Only 0 seats left in this slot', 'a sold-out slot cannot be booked');

select lives_ok(
  format($$ select public.create_booking(p_listing_id => %L, p_slot_id => %L, p_guest_count => 3, p_private => true, p_idempotency_key => 'private-test-1') $$,
    pg_temp.listing('margalla-sunrise-hike'),
    (select id from public.slots where listing_id = pg_temp.listing('margalla-sunrise-hike') and seats_booked = 0 and starts_at > now() order by starts_at limit 1)),
  'an empty slot can be booked privately');
select is(
  (select s.status::text from public.bookings b join public.slots s on s.id = b.slot_id where b.idempotency_key = 'private-test-1'),
  'full', 'a private booking fills the slot');
select is(
  (select total_amount from public.bookings where idempotency_key = 'private-test-1'),
  2000000, 'private booking charges the private price');

-- ---------------------------------------------------------------------------
-- Services cart
-- ---------------------------------------------------------------------------
create temp table cart_times as
select pg_temp.free_time(pg_temp.listing('swedish-massage')) as massage,
       pg_temp.free_time(pg_temp.listing('hydrating-gold-facial'), 2) as facial;

select is(
  (select count(*)::int from public.create_bookings(
    jsonb_build_array(
      jsonb_build_object('listing_id', pg_temp.listing('swedish-massage'), 'starts_at', (select massage from cart_times)),
      jsonb_build_object('listing_id', pg_temp.listing('hydrating-gold-facial'), 'starts_at', (select facial from cart_times))),
    p_coupon_code => 'SAFFRON20', p_idempotency_key => 'cart-test-1')),
  2, 'a two-service cart makes two bookings');
select is(
  (select count(*)::int from public.bookings where idempotency_key like 'cart-test-1:%' and discount_amount > 0),
  1, 'the coupon applies once');
select is(
  (select l.slug::text from public.bookings b join public.listings l on l.id = b.listing_id where b.idempotency_key like 'cart-test-1:%' and b.discount_amount > 0),
  'swedish-massage', 'to the most expensive service');
select is(
  (select count(*)::int from public.create_bookings(
    jsonb_build_array(
      jsonb_build_object('listing_id', pg_temp.listing('swedish-massage'), 'starts_at', (select massage from cart_times)),
      jsonb_build_object('listing_id', pg_temp.listing('hydrating-gold-facial'), 'starts_at', (select facial from cart_times))),
    p_coupon_code => 'SAFFRON20', p_idempotency_key => 'cart-test-1')),
  2, 'retrying the same cart returns the same bookings');
select is((select count(*)::int from public.bookings where idempotency_key like 'cart-test-1:%'), 2, 'and books nothing twice');

-- The app sends "items": null for services without options.
select is(
  (select count(*)::int from public.create_bookings(
    jsonb_build_array(jsonb_build_object('listing_id', pg_temp.listing('hot-stone-massage'), 'starts_at', pg_temp.free_time(pg_temp.listing('hot-stone-massage'), 6), 'items', null)),
    p_idempotency_key => 'cart-test-null-items')),
  1, 'a cart line with items: null books');

-- All or nothing: the second service's time is taken (keratin has one stylist),
-- so the first isn't booked either.
create temp table keratin as select pg_temp.free_time(pg_temp.listing('keratin-treatment'), 3) as at;
select lives_ok(
  format($$ select public.create_booking(p_listing_id => %L, p_starts_at => %L) $$,
    pg_temp.listing('keratin-treatment'), (select at from keratin)),
  'someone books the keratin time first');
select throws_ok(
  format($$ select * from public.create_bookings(jsonb_build_array(
      jsonb_build_object('listing_id', %L, 'starts_at', %L),
      jsonb_build_object('listing_id', %L, 'starts_at', %L)), p_idempotency_key => 'cart-test-2') $$,
    pg_temp.listing('deep-tissue-massage'), pg_temp.free_time(pg_temp.listing('deep-tissue-massage'), 5),
    pg_temp.listing('keratin-treatment'), (select at from keratin)),
  '23P01', 'This time is no longer available', 'a taken time fails the whole cart');
select is((select count(*)::int from public.bookings where idempotency_key like 'cart-test-2:%'), 0, 'nothing from the failed cart is booked');

-- ---------------------------------------------------------------------------
-- Calendar days
-- ---------------------------------------------------------------------------
select ok(
  (select count(*) from public.available_dates(pg_temp.listing('swedish-massage'), current_date, current_date + 13)) between 8 and 14,
  'about two weeks of days have free times');

select pg_temp.logout();

-- A phone confirmed after sign up reaches the profile.
update auth.users set phone = '923331112233' where id = '00000000-0000-4000-a000-000000000021';
select is((select phone from public.profile_private where user_id = '00000000-0000-4000-a000-000000000021'), '+923331112233',
  'a changed phone is copied to the profile in E.164');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  format($$ select * from public.create_bookings(jsonb_build_array(jsonb_build_object('listing_id', %L))) $$, pg_temp.listing('swedish-massage')),
  '42501', null, 'guests cannot book');

select * from finish();
rollback;
