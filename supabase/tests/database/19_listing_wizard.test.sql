-- Listing wizard: drafts, missing steps, submit for review, offer discounts,
-- booking cut-off, commission, session resizing, opening hours.
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

\set biz '''00000000-0000-4000-b000-000000000031'''
\set walk '''00000000-0000-4000-e000-000000000331'''
\set guide '''00000000-0000-4000-e000-000000000338'''
\set owner '''00000000-0000-4000-a000-000000000031'''
\set staff '''00000000-0000-4000-a000-000000000033'''
\set hamza '''00000000-0000-4000-a000-000000000021'''

select has_column('public', 'listings', 'group_discount_percent', 'group discount column');
select has_column('public', 'bookings', 'offer_discount_amount', 'offer discount on bookings');

-- Drafts ---------------------------------------------------------------------
select pg_temp.login(:staff);
select throws_ok($$ select public.create_listing_draft('00000000-0000-4000-b000-000000000031', 'experience') $$,
  '42501', null, 'staff cannot create listings');

select pg_temp.login(:owner);
create temp table t_draft as select public.create_listing_draft(:biz, 'experience') as id;
grant select on t_draft to authenticated;
select is((select status::text from public.listings where id = (select id from t_draft)), 'draft', 'draft created');
select is((select booking_mode::text from public.listings where id = (select id from t_draft)), 'slot', 'experiences use sessions');
create temp table t_service as select public.create_listing_draft(:biz, 'service') as id;
select is((select booking_mode::text from public.listings where id = (select id from t_service)), 'appointment',
  'services use appointments');
select is(public.listing_missing((select id from t_draft)),
  array['title', 'description', 'category', 'photos', 'price', 'location', 'availability'], 'a new draft misses every step');
select throws_ok($$ select public.submit_listing((select id from t_draft)) $$, '22023', null, 'incomplete drafts cannot be submitted');

-- Fill every step.
update public.listings set
  title = 'Old Lahore Rooftop Breakfast',
  description = repeat('Halwa puri and lassi on a haveli rooftop overlooking the Badshahi Mosque. ', 3),
  category_id = (select id from public.categories where slug = 'food-drink'),
  price_amount = 350000,
  meeting_point = extensions.st_setsrid(extensions.st_makepoint(74.3100, 31.5880), 4326)::extensions.geography
where id = (select id from t_draft);
insert into public.listing_media (business_id, listing_id, url, sort_order)
select :biz, (select id from t_draft), 'https://example.com/p' || g || '.jpg', g from generate_series(1, 5) g;
insert into public.availability_rules (business_id, listing_id, weekdays, start_time, capacity)
values (:biz, (select id from t_draft), '{6,7}', '08:00', 10);
select is(public.listing_missing((select id from t_draft)), '{}'::text[], 'nothing missing once every step is done');
select ok((select count(*) from public.slots where listing_id = (select id from t_draft)) > 0, 'the weekly schedule generates sessions');

select is((public.submit_listing((select id from t_draft))).status::text, 'pending_review', 'submitted for review');
select is((select slug::text from public.listings where id = (select id from t_draft)), 'old-lahore-rooftop-breakfast', 'slug from the title');
select pg_temp.logout();
select is((select count(*)::int from public.listings where id = (select id from t_draft) and status = 'published'), 0, 'not live until approved');

-- Group size resizes future sessions.
update public.listings set max_guests = 6 where id = (select id from t_draft);
select is((select max(capacity) from public.slots where listing_id = (select id from t_draft) and starts_at > now()), 6,
  'future sessions follow the group size');

-- Offer discounts --------------------------------------------------------------
update public.listings set group_discount_min_guests = 4, group_discount_percent = 10,
  early_bird_days = 7, early_bird_percent = 15 where id = :walk;
select pg_temp.login(:hamza);
select is((public.quote_booking(:walk, 2) ->> 'offer_discount')::int, 0, 'no discount for 2 guests booked soon');
select is((public.quote_booking(:walk, 4) ->> 'offer_discount')::int,
  round((public.quote_booking(:walk, 4) ->> 'subtotal')::int * 0.10)::int, 'group discount for 4+ guests');
select is(public.quote_booking(:walk, 4) ->> 'offer_label', 'Group discount (10%)', 'group discount label');
select is((public.quote_booking(:walk, 2, p_starts_at => now() + interval '10 days') ->> 'offer_discount')::int,
  round((public.quote_booking(:walk, 2) ->> 'subtotal')::int * 0.15)::int, 'early-bird discount 7+ days ahead');
select is(public.quote_booking(:walk, 4, p_starts_at => now() + interval '10 days') ->> 'offer_label', 'Early-bird discount (15%)',
  'the better discount wins, they do not stack');
select is((public.quote_booking(:walk, 4) ->> 'total')::int,
  (public.quote_booking(:walk, 4) ->> 'subtotal')::int - (public.quote_booking(:walk, 4) ->> 'offer_discount')::int, 'total after the discount');

create temp table t_booking as
select * from public.create_booking(
  p_listing_id => :walk,
  p_slot_id => (select id from public.slots where listing_id = :walk and status = 'open' and seats_booked = 0
                and starts_at > now() + interval '8 days' order by starts_at limit 1),
  p_guest_count => 4, p_idempotency_key => 'wizard-offer');
select is((select offer_label from t_booking), 'Early-bird discount (15%)', 'booking keeps the offer label');
select is((select offer_discount_amount from t_booking), round((select subtotal_amount from t_booking) * 0.15)::int, 'booking keeps the offer amount');
select is((select total_amount from t_booking), (select subtotal_amount - discount_amount from t_booking), 'booking total after the offer');

-- Cut-off ----------------------------------------------------------------------
select pg_temp.logout();
update public.listings set booking_cutoff_minutes = 20160 where id = :walk;
select pg_temp.login(:hamza);
select is((select count(*)::int from public.slots where listing_id = :walk and starts_at < now() + interval '13 days'), 0,
  'guests do not see sessions inside the cut-off');
select pg_temp.logout();
create temp table t_soon as select id from public.slots where listing_id = :walk and status = 'open'
  and starts_at between now() + interval '1 day' and now() + interval '13 days' order by starts_at limit 1;
grant select on t_soon to authenticated;
select pg_temp.login(:hamza);
select throws_ok($$ select public.create_booking(p_listing_id => '00000000-0000-4000-e000-000000000331'::uuid,
  p_slot_id => (select id from t_soon), p_guest_count => 1, p_idempotency_key => 'wizard-cutoff') $$,
  '22023', 'Bookings for this session have closed', 'create_booking refuses sessions inside the cut-off');
select pg_temp.logout();
update public.listings set booking_cutoff_minutes = 0 where id = :walk;

-- Commission ---------------------------------------------------------------------
select pg_temp.login(:owner);
select is(public.business_commission_bps(), 1000, 'team members see the commission');
select pg_temp.logout();
create temp table t_consumer as select p.id from public.profiles p
  where not exists (select 1 from public.business_members m where m.user_id = p.id)
    and not exists (select 1 from public.platform_admins a where a.user_id = p.id) limit 1;
select pg_temp.login((select id from t_consumer));
select is(public.business_commission_bps(), null, 'consumers do not');
select pg_temp.logout();

-- Appointments stay inside opening hours ------------------------------------------
select is((
  select count(*)::int
  from generate_series(current_date + 1, current_date + 7, interval '1 day') d
  cross join lateral public.get_available_times(:guide, d::date) t
  where not exists (
    select 1 from public.business_hours h
    where h.business_id = :biz and h.weekday = extract(isodow from d)::smallint
      and (t.starts_at at time zone 'Asia/Karachi')::time >= h.opens_at
  )
), 0, 'no appointment times outside opening hours');

-- Publishing goes through review -------------------------------------------------
select pg_temp.login(:owner);
select throws_ok($$ update public.listings set status = 'published' where id = (select id from t_service) $$,
  '42501', null, 'owners cannot publish a listing that was never reviewed');
select lives_ok($$ update public.listings set status = 'draft' where id = '00000000-0000-4000-e000-000000000331' $$, 'unpublish');
select lives_ok($$ update public.listings set status = 'published' where id = '00000000-0000-4000-e000-000000000331' $$,
  'listings that were live before can be published again');
select pg_temp.logout();

select * from finish();
rollback;
