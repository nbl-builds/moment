-- Listing Details: accepting bookings, stats, duplicate, meeting point.
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

\set walk '''00000000-0000-4000-e000-000000000331'''
\set owner '''00000000-0000-4000-a000-000000000031'''
\set manager '''00000000-0000-4000-a000-000000000032'''
\set staff '''00000000-0000-4000-a000-000000000033'''
\set hamza '''00000000-0000-4000-a000-000000000021'''

select has_column('public', 'listings', 'accepting_bookings', 'accepting_bookings column');
select is((select accepting_bookings from public.listings where id = :walk), true, 'listings accept bookings by default');

-- Paused listings refuse guest bookings, not business ones.
update public.listings set accepting_bookings = false where id = :walk;
select pg_temp.login(:hamza);
select throws_ok($$ select public.create_booking(p_listing_id => '00000000-0000-4000-e000-000000000331'::uuid,
  p_slot_id => (select id from public.slots where listing_id = '00000000-0000-4000-e000-000000000331' and status = 'open' and starts_at > now() + interval '3 days' order by starts_at limit 1),
  p_guest_count => 1, p_idempotency_key => 'paused-test') $$,
  '22023', 'This experience isn''t taking new bookings right now', 'guests cannot book a paused listing');
select pg_temp.logout();
select lives_ok($$ insert into public.bookings (business_id, consumer_id, listing_id, starts_at, ends_at, guest_count, subtotal_amount, total_amount, source)
  values ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-a000-000000000021', '00000000-0000-4000-e000-000000000331',
          now() + interval '40 days', now() + interval '40 days 3 hours', 1, 450000, 450000, 'portal') $$, 'the business can still book');
update public.listings set accepting_bookings = true where id = :walk;

-- Stats: owners and managers get revenue, staff don't.
select pg_temp.login(:owner);
select ok((public.listing_stats(:walk) ->> 'views')::int > 0, 'views in the last 30 days');
select is(jsonb_array_length(public.listing_stats(:walk) -> 'series'), 30, '30 daily points');
select ok((public.listing_stats(:walk) -> 'revenue') <> 'null'::jsonb, 'owner sees revenue');
select pg_temp.login(:manager);
select ok((public.listing_stats(:walk) -> 'revenue') <> 'null'::jsonb, 'manager sees revenue');
select pg_temp.login(:staff);
select is(public.listing_stats(:walk) -> 'revenue', 'null'::jsonb, 'staff do not see revenue');
select throws_ok($$ select public.duplicate_listing('00000000-0000-4000-e000-000000000331') $$, '42501', null, 'staff cannot duplicate');
select pg_temp.login(:hamza);
select throws_ok($$ select public.listing_stats('00000000-0000-4000-e000-000000000331') $$, 'P0002', null, 'outsiders get nothing');

-- Duplicate: a full draft copy.
select pg_temp.login(:manager);
select lives_ok($$ select public.duplicate_listing('00000000-0000-4000-e000-000000000331') $$, 'manager duplicates');
select is((select status::text from public.listings where title = 'Walled City Food Walk at Dusk (copy)'), 'draft', 'copy is a draft');
select is((select count(*)::int from public.listing_media m join public.listings l on l.id = m.listing_id where l.title = 'Walled City Food Walk at Dusk (copy)'),
  (select count(*)::int from public.listing_media where listing_id = :walk), 'photos copied');
select is((select count(*)::int from public.listing_itinerary_steps s join public.listings l on l.id = s.listing_id where l.title = 'Walled City Food Walk at Dusk (copy)'), 4, 'itinerary copied');
select lives_ok($$ select public.duplicate_listing('00000000-0000-4000-e000-000000000331') $$, 'a second copy gets a new slug');

-- Meeting point
select ok((select lat between 31 and 32 and lng between 74 and 75 from public.listing_point(:walk)), 'meeting point in Lahore');
select pg_temp.logout();

select * from finish();
rollback;
