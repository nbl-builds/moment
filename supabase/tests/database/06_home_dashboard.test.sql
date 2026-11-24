-- Home dashboard: listing_distances and the curation tags.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into public.businesses (id, slug, name, kind, status) values
  ('66666666-0000-4000-b000-000000000001', 'distance-test-co', 'Distance Test Co.', 'operator', 'active');
insert into public.business_locations (id, business_id, name, address_line1, city, geo, is_primary) values
  ('66666666-0000-4000-c000-000000000001', '66666666-0000-4000-b000-000000000001', 'Base', 'Blue Area', 'Islamabad',
   extensions.st_setsrid(extensions.st_makepoint(73.0479, 33.6844), 4326)::extensions.geography, true);
insert into public.listings (id, business_id, type, booking_mode, slug, title, city, location_id, meeting_point, price_amount, duration_minutes, status) values
  -- Meeting point at Faisal Mosque, about 6 km from the base.
  ('66666666-0000-4000-e000-000000000001', '66666666-0000-4000-b000-000000000001', 'experience', 'slot', 'distance-meeting-point',
   'Meeting point listing', 'Islamabad', '66666666-0000-4000-c000-000000000001',
   extensions.st_setsrid(extensions.st_makepoint(73.0379, 33.7295), 4326)::extensions.geography, 100000, 60, 'published'),
  -- No meeting point: falls back to the business location.
  ('66666666-0000-4000-e000-000000000002', '66666666-0000-4000-b000-000000000001', 'service', 'appointment', 'distance-location',
   'Location listing', 'Islamabad', '66666666-0000-4000-c000-000000000001', null, 100000, 60, 'published'),
  -- Not published: anon must not get a distance for it.
  ('66666666-0000-4000-e000-000000000003', '66666666-0000-4000-b000-000000000001', 'experience', 'slot', 'distance-draft',
   'Draft listing', 'Islamabad', '66666666-0000-4000-c000-000000000001', null, 100000, 60, 'draft');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select results_eq(
  $$ select listing_id, distance_km from public.listing_distances(33.6844, 73.0479, array[
       '66666666-0000-4000-e000-000000000002'::uuid]) $$,
  $$ values ('66666666-0000-4000-e000-000000000002'::uuid, 0.0::numeric) $$,
  'a listing without a meeting point uses its business location');

select ok(
  (select distance_km between 4 and 6 from public.listing_distances(33.6844, 73.0479, array['66666666-0000-4000-e000-000000000001'::uuid])),
  'a meeting point is measured in km');

select is_empty(
  $$ select 1 from public.listing_distances(33.6844, 73.0479, array['66666666-0000-4000-e000-000000000003'::uuid]) $$,
  'unpublished listings get no distance (RLS)');

select is_empty(
  $$ select 1 from public.listing_distances(120, 73.0479, array['66666666-0000-4000-e000-000000000002'::uuid]) $$,
  'an invalid latitude returns nothing');

reset role;
select set_eq(
  $$ select slug from public.tags where slug in ('local-fun', 'must-try') $$,
  $$ values ('local-fun'), ('must-try') $$,
  'curation tags exist');

select * from finish();
rollback;
