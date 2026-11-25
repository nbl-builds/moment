-- Home "Services near you": active service businesses, nearest first with a
-- location, else by rating in the city, with the quiz badge breaking ties.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function('public', 'services_near_you', 'services_near_you exists');

-- Seed: a full rail in every launch city
select ok((select count(*) from public.services_near_you(null, null, 'Islamabad', 20)) >= 4, 'Islamabad has service businesses');
select ok((select count(*) from public.services_near_you(null, null, 'Lahore', 20)) >= 4, 'Lahore has service businesses');
select ok((select count(*) from public.services_near_you(null, null, 'Karachi', 20)) >= 4, 'Karachi has service businesses');

-- Only active venues with a published service
select is_empty($$
  select 1 from public.services_near_you(null, null, null, 100) s join public.businesses b on b.id = s.id
  where b.kind <> 'venue' or b.status <> 'active'
$$, 'only active venues');
select is_empty($$ select 1 from public.services_near_you(null, null, null, 100) where from_price is null or category_name is null $$,
  'every card has a starting price and a category');
select is(
  (select from_price from public.services_near_you(null, null, 'Islamabad', 20) where slug = 'saffron-spa'),
  (select min(price_amount)::int from public.listings l join public.businesses b on b.id = l.business_id
   where b.slug = 'saffron-spa' and l.type = 'service' and l.status = 'published'),
  'starting price is the cheapest service');

-- Without a location: the city only, best rated first
select is_empty($$ select 1 from public.services_near_you(null, null, 'Lahore', 20) where city <> 'Lahore' $$, 'city filter');
select ok((
  select bool_and(r1 >= r2) from (
    select round(rating_avg, 1) r1, lead(round(rating_avg, 1)) over (order by ordinality) r2
    from public.services_near_you(null, null, 'Karachi', 20) with ordinality
  ) t where r2 is not null), 'by rating without a location');
select is((select distance_km from public.services_near_you(null, null, 'Karachi', 1)), null, 'no distance without a location');

-- With a location (F-7, Islamabad): nearest first, all cities
select is((select city from public.services_near_you(33.72, 73.06, null, 1)), 'Islamabad', 'nearest is in Islamabad');
select ok((
  select bool_and(d1 <= d2) from (
    select distance_km d1, lead(distance_km) over (order by ordinality) d2
    from public.services_near_you(33.72, 73.06, null, 50) with ordinality
  ) t where d2 is not null), 'sorted by distance');

-- The quiz badge breaks ties: two identical venues, one with wellness services
insert into public.businesses (id, slug, name, kind, status, rating_avg) values
  ('99999999-0000-4000-b000-000000000021', 'tie-a-salon', 'Tie A Salon', 'venue', 'active', 4.5),
  ('99999999-0000-4000-b000-000000000022', 'tie-b-spa', 'Tie B Spa', 'venue', 'active', 4.5);
insert into public.business_locations (business_id, name, address_line1, city, is_primary) values
  ('99999999-0000-4000-b000-000000000021', 'A', 'A', 'Testabad', true),
  ('99999999-0000-4000-b000-000000000022', 'B', 'B', 'Testabad', true);
insert into public.listings (id, business_id, type, booking_mode, slug, title, city, duration_minutes, price_amount, status) values
  ('99999999-0000-4000-e000-000000000021', '99999999-0000-4000-b000-000000000021', 'service', 'appointment', 'tie-a-cut', 'Cut', 'Testabad', 30, 100000, 'published'),
  ('99999999-0000-4000-e000-000000000022', '99999999-0000-4000-b000-000000000022', 'service', 'appointment', 'tie-b-massage', 'Massage', 'Testabad', 60, 500000, 'published');
insert into public.listing_tags (business_id, listing_id, tag_id) values
  ('99999999-0000-4000-b000-000000000022', '99999999-0000-4000-e000-000000000022', (select id from public.tags where slug = 'wellness'));

select is((select slug from public.services_near_you(null, null, 'Testabad', 1)), 'tie-a-salon', 'without a badge: by name');
update public.profiles set personality_badge_id = (select id from public.badges where code = 'zen-wanderer')
where id = '00000000-0000-4000-a000-000000000099';
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-a000-000000000099', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select slug from public.services_near_you(null, null, 'Testabad', 1)), 'tie-b-spa', 'a wellness badge puts the spa first');
reset role;

-- Guests can load the rail
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select ok((select count(*) from public.services_near_you(null, null, 'Islamabad', 10)) > 0, 'guests see the rail');

select * from finish();
rollback;
