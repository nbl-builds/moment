-- Business page: opening hours and business_is_open, gallery photos, verified
-- flag, review-photo uploads and reviewable_bookings.
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
-- An instant at a Karachi wall-clock time on a given weekday of a fixed week (2026-11-22 is a Sunday).
create function pg_temp.pkt(p_weekday int, p_time time) returns timestamptz language sql as $$
  select (('2026-11-22'::date + p_weekday) + p_time) at time zone 'Asia/Karachi';
$$;

select has_table('public', 'business_hours', 'business_hours exists');
select has_table('public', 'business_photos', 'business_photos exists');
select has_column('public', 'businesses', 'is_verified', 'businesses have a verified flag');
select ok((select relrowsecurity from pg_class where oid = 'public.business_hours'::regclass), 'RLS on business_hours');
select ok((select relrowsecurity from pg_class where oid = 'public.business_photos'::regclass), 'RLS on business_photos');
select throws_ok(
  $$ insert into public.business_hours (business_id, weekday, opens_at, closes_at)
     values ('00000000-0000-4000-b000-000000000002', 7, '10:00', '12:00') $$,
  '23514', null, 'weekday is 0-6');

-- A test business with a same-day, a split and an overnight day
insert into public.businesses (id, slug, name, kind, status) values
  ('99999999-0000-4000-b000-000000000009', 'hours-test-co', 'Hours Test Co.', 'venue', 'active');
insert into public.business_hours (business_id, weekday, opens_at, closes_at) values
  ('99999999-0000-4000-b000-000000000009', 1, '10:00', '21:00'),   -- Monday
  ('99999999-0000-4000-b000-000000000009', 5, '10:00', '12:30'),   -- Friday morning
  ('99999999-0000-4000-b000-000000000009', 5, '14:30', '22:00'),   -- Friday after prayers
  ('99999999-0000-4000-b000-000000000009', 6, '18:00', '02:00');   -- Saturday into Sunday

select ok(public.business_is_open('99999999-0000-4000-b000-000000000009', pg_temp.pkt(1, '10:00')), 'open at opening time');
select ok(not public.business_is_open('99999999-0000-4000-b000-000000000009', pg_temp.pkt(1, '21:00')), 'closed at closing time');
select ok(not public.business_is_open('99999999-0000-4000-b000-000000000009', pg_temp.pkt(2, '12:00')), 'closed on a day without hours');
select ok(not public.business_is_open('99999999-0000-4000-b000-000000000009', pg_temp.pkt(5, '13:00')), 'closed in a split-day break');
select ok(public.business_is_open('99999999-0000-4000-b000-000000000009', pg_temp.pkt(5, '15:00')), 'open in the second period');
select ok(public.business_is_open('99999999-0000-4000-b000-000000000009', pg_temp.pkt(6, '23:30')), 'open late on Saturday');
select ok(public.business_is_open('99999999-0000-4000-b000-000000000009', pg_temp.pkt(7, '01:30')), 'still open after midnight (Sunday morning)');
select ok(not public.business_is_open('99999999-0000-4000-b000-000000000009', pg_temp.pkt(7, '02:30')), 'closed once the overnight period ends');

-- Seed: every business has hours, photos, services, a plan and reviews
select is((select count(*)::int from public.businesses b where not exists (select 1 from public.business_hours h where h.business_id = b.id) and b.slug <> 'hours-test-co'), 0, 'every seeded business has hours');
select is((select count(*)::int from public.businesses b where not exists (select 1 from public.business_photos p where p.business_id = b.id) and b.slug <> 'hours-test-co'), 0, 'every seeded business has photos');
select is((select count(*)::int from public.businesses b where not exists (select 1 from public.listings l where l.business_id = b.id and l.type = 'service') and b.slug <> 'hours-test-co'), 0, 'every seeded business has a service');
select is((select count(*)::int from public.businesses b where not exists (select 1 from public.membership_plans m where m.business_id = b.id) and b.slug <> 'hours-test-co'), 0, 'every seeded business has a membership plan');

-- Guests read hours and photos of active businesses only
insert into public.businesses (id, slug, name, kind, status) values
  ('99999999-0000-4000-b000-000000000010', 'hidden-draft-co', 'Hidden Draft Co.', 'venue', 'draft');
insert into public.business_hours (business_id, weekday, opens_at, closes_at) values ('99999999-0000-4000-b000-000000000010', 1, '09:00', '17:00');
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select isnt_empty($$ select 1 from public.business_hours where business_id = '99999999-0000-4000-b000-000000000009' $$, 'guests read hours of active businesses');
select is_empty($$ select 1 from public.business_hours where business_id = '99999999-0000-4000-b000-000000000010' $$, 'but not of draft businesses');
select isnt_empty($$ select 1 from public.business_photos $$, 'guests read gallery photos');
select throws_ok(
  $$ insert into public.business_hours (business_id, weekday, opens_at, closes_at) values ('99999999-0000-4000-b000-000000000009', 2, '09:00', '17:00') $$,
  '42501', null, 'guests cannot edit hours');
select pg_temp.logout();

-- Consumers cannot edit someone's hours
select pg_temp.login('00000000-0000-4000-a000-000000000099');
update public.business_hours set closes_at = '23:59' where business_id = '00000000-0000-4000-b000-000000000002';
select pg_temp.logout();
select is((select count(*)::int from public.business_hours where business_id = '00000000-0000-4000-b000-000000000002' and closes_at = '23:59'), 0, 'consumers cannot edit hours');

-- Reviewable bookings: the dev user has an unreviewed completed visit at Saffron
-- (drop any review left by trying the app locally; rolled back at the end).
delete from public.reviews where booking_id = '00000000-0000-4000-8000-000000000098';
select pg_temp.login('00000000-0000-4000-a000-000000000099');
select is((select count(*)::int from public.reviewable_bookings('00000000-0000-4000-b000-000000000002')), 1, 'dev user can review Saffron Spa');
select is_empty($$ select 1 from public.reviewable_bookings('00000000-0000-4000-b000-000000000005') $$, 'but not a business they never visited');
insert into public.reviews (booking_id, author_id, rating, body)
values ('00000000-0000-4000-8000-000000000098', '00000000-0000-4000-a000-000000000099', 5, 'Lovely');
select is_empty($$ select 1 from public.reviewable_bookings('00000000-0000-4000-b000-000000000002') $$, 'once reviewed, the visit is no longer reviewable');

-- Review photos: upload into your own folder only
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('review-photos', '00000000-0000-4000-a000-000000000099/a.jpg', '00000000-0000-4000-a000-000000000099') $$,
  'users upload review photos to their folder');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('review-photos', '00000000-0000-4000-a000-000000000021/b.jpg', '00000000-0000-4000-a000-000000000099') $$,
  '42501', null, 'but not into someone else''s folder');
select pg_temp.logout();

-- Location points for the map pin
select ok(
  (select lat between 33 and 34.5 and lng between 72.5 and 73.5 from public.business_location_points('00000000-0000-4000-b000-000000000002') limit 1),
  'business locations come back as lat/lng (Saffron Spa, Islamabad)');

select * from finish();
rollback;
