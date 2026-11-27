-- Business portal: listing views, shared inbox, insights (roles).
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.login(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;
create function pg_temp.anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
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
\set draft '''00000000-0000-4000-e000-000000000335'''
\set owner '''00000000-0000-4000-a000-000000000031'''
\set manager '''00000000-0000-4000-a000-000000000032'''
\set staff '''00000000-0000-4000-a000-000000000033'''
\set hamza '''00000000-0000-4000-a000-000000000021'''
\set fatima '''00000000-0000-4000-a000-000000000022'''

select ok((select relrowsecurity from pg_class where oid = 'public.listing_views'::regclass), 'RLS on listing_views');

-- Views
select pg_temp.login(:hamza);
select is(public.record_listing_view(:walk), true, 'a guest view is recorded');
select is(public.record_listing_view(:walk), false, 'the same viewer within 30 minutes is not counted again');
select is(public.record_listing_view(null, :biz), true, 'business page views are separate');
select is(public.record_listing_view(:draft), false, 'drafts are not viewable');
select is((select count(*)::int from public.listing_views), 0, 'consumers cannot read view rows');
select throws_ok($$ insert into public.listing_views (business_id) values ('00000000-0000-4000-b000-000000000031') $$,
  '42501', null, 'no direct inserts');
select pg_temp.login(:owner);
select is(public.record_listing_view(:walk), false, 'the business team does not count');
select is((select count(*)::int from public.listing_views), 0, 'the business cannot read raw rows either');
select pg_temp.anon();
select is(public.record_listing_view(:walk, null, 'install-abc-123'), true, 'anonymous view with a session key');
select is(public.record_listing_view(:walk, null, 'install-abc-123'), false, 'same session de-duplicated');
select pg_temp.logout();

-- Inbox
select pg_temp.login(:owner);
select ok((select count(*) from public.business_inbox(:biz)) >= 5, 'owner sees the shared inbox');
select is((select unread from public.business_inbox(:biz) where guest_name = 'Bilal Hussain'), 5, 'unread guest messages counted');
select is((select count(*)::int from public.business_inbox(:biz, null, true)), 2, 'unread filter');
select is((select count(*)::int from public.business_inbox(:biz, 'parking')), 1, 'search matches the last message');
select pg_temp.login(:staff);
select ok((select count(*) from public.business_inbox(:biz)) >= 5, 'staff share the inbox');
select is((select unread from public.business_inbox(:biz) where guest_name = 'Bilal Hussain'), 5, 'unread is per team member');
select pg_temp.login(:fatima);
select throws_ok($$ select * from public.business_inbox('00000000-0000-4000-b000-000000000031') $$, 'P0002', null, 'outsiders cannot read the inbox');
select pg_temp.logout();

-- Insights: revenue and wallet are for owners only
select pg_temp.login(:owner);
select ok((public.business_insights(:biz, 'weekly') -> 'revenue') <> 'null'::jsonb, 'owner sees revenue');
select ok(((public.business_insights(:biz, 'weekly') -> 'wallet' ->> 'balance')::bigint) > 0, 'owner sees the wallet');
select is(jsonb_array_length(public.business_insights(:biz, 'yearly') -> 'bookings' -> 'series'), 12, 'yearly: 12 buckets');
select is(jsonb_array_length(public.business_insights(:biz, 'monthly') -> 'bookings' -> 'series'), 4, 'monthly: 4 weeks');
select pg_temp.login(:manager);
select is(public.business_insights(:biz, 'weekly') -> 'revenue', 'null'::jsonb, 'managers do not see revenue');
select is(public.business_insights(:biz, 'weekly') -> 'wallet', 'null'::jsonb, 'managers do not see the wallet');
select ok((public.business_insights(:biz, 'weekly') -> 'views' ->> 'total')::int > 0, 'managers see views');
select pg_temp.login(:staff);
select is(public.business_insights(:biz, 'weekly') -> 'revenue', 'null'::jsonb, 'staff do not see revenue');
select pg_temp.login(:hamza);
select throws_ok($$ select public.business_insights('00000000-0000-4000-b000-000000000031') $$, 'P0002', null, 'outsiders get nothing');
select pg_temp.logout();

select * from finish();
rollback;
