-- Explore map queries, experience content and itinerary RLS, host covers.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select has_column('public', 'listings', 'highlights', 'listings have reasons to book');
select has_column('public', 'listings', 'what_to_bring', 'listings have what to bring');
select has_column('public', 'listings', 'cuisine', 'listings have a cuisine');
select has_table('public', 'listing_itinerary_steps', 'itinerary steps exist');
select ok((select relrowsecurity from pg_class where oid = 'public.listing_itinerary_steps'::regclass), 'RLS on itinerary steps');
select has_column('public', 'staff_members', 'cover_url', 'hosts have a cover photo');

-- Seed: every published experience has full content (drafts are incomplete by design)
select is((select count(*)::int from public.listings where type = 'experience' and status = 'published' and (cardinality(highlights) = 0 or cardinality(what_to_bring) = 0)), 0, 'every experience has reasons and what to bring');
select is((select count(*)::int from public.listings l where type = 'experience' and status = 'published' and not exists (select 1 from public.listing_itinerary_steps s where s.listing_id = l.id)), 0, 'every experience has an itinerary');
select is((select count(*)::int from public.listings l where type = 'experience' and status = 'published' and (select count(*) from public.listing_media m where m.listing_id = l.id) < 6), 0, 'every experience has at least six photos');

-- Explore: experiences in the Islamabad box, none from Lahore; filters apply
select ok((select count(*) from public.explore_listings(33.55, 72.9, 33.85, 73.25)) >= 3, 'experiences inside the Islamabad box');
select is_empty($$
  select 1 from public.explore_listings(33.55, 72.9, 33.85, 73.25) e join public.listings l on l.id = e.listing_id where l.city <> 'Islamabad'
$$, 'nothing outside the box');
select is_empty($$
  select 1 from public.explore_listings(33.55, 72.9, 33.85, 73.25, p_category_ids => array[(select id from public.categories where slug = 'water-activities')])
    e join public.listings l on l.id = e.listing_id join public.categories c on c.id = l.category_id where c.slug <> 'water-activities'
$$, 'category filter');
select ok((select bool_and(distance_km is not null) from public.explore_listings(33.55, 72.9, 33.85, 73.25, p_user_lat => 33.72, p_user_lng => 73.06)), 'distance with a user point');
select ok((select bool_and(lat between 33.55 and 33.85 and lng between 72.9 and 73.25) from public.explore_listings(33.55, 72.9, 33.85, 73.25)), 'coordinates come back');

-- Explore: businesses in the Karachi box
select ok((select count(*) from public.explore_businesses(24.7, 66.9, 25.0, 67.2)) >= 4, 'service businesses inside the Karachi box');
select is_empty($$ select 1 from public.explore_businesses(24.7, 66.9, 25.0, 67.2) where city <> 'Karachi' $$, 'only Karachi businesses');
select ok((select bool_and('nails' = any (category_slugs)) from public.explore_businesses(24.7, 66.9, 25.0, 67.2, p_category_slugs => array['nails'])), 'business category filter');

-- Itinerary: guests read published ones and cannot write
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select isnt_empty($$ select 1 from public.listing_itinerary_steps $$, 'guests read itineraries');
select throws_ok(
  $$ insert into public.listing_itinerary_steps (business_id, listing_id, position, title)
     select business_id, id, 99, 'Hack' from public.listings where type = 'experience' limit 1 $$,
  '42501', null, 'guests cannot add steps');

select * from finish();
rollback;
