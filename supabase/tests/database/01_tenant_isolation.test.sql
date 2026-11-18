-- A business only ever sees its own data; roles get exactly their permissions.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Helpers ------------------------------------------------------------------
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
create function pg_temp.login_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
  perform set_config('role', 'anon', true);
end;
$$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Fixtures -----------------------------------------------------------------
select pg_temp.mk_user('11111111-0000-4000-a000-000000000001', 'Owner A');
select pg_temp.mk_user('11111111-0000-4000-a000-000000000002', 'Manager A');
select pg_temp.mk_user('11111111-0000-4000-a000-000000000003', 'Staff A');
select pg_temp.mk_user('11111111-0000-4000-a000-000000000004', 'Owner B');
select pg_temp.mk_user('11111111-0000-4000-a000-000000000005', 'Consumer');
select pg_temp.mk_user('11111111-0000-4000-a000-000000000006', 'Other consumer');
select pg_temp.mk_user('11111111-0000-4000-a000-000000000007', 'Admin');
insert into public.platform_admins (user_id) values ('11111111-0000-4000-a000-000000000007');

insert into public.businesses (id, slug, name, kind, status, created_by) values
  ('11111111-0000-4000-b000-000000000001', 'test-biz-a', 'Business A', 'venue', 'active', '11111111-0000-4000-a000-000000000001'),
  ('11111111-0000-4000-b000-000000000002', 'test-biz-b', 'Business B', 'venue', 'active', '11111111-0000-4000-a000-000000000004'),
  ('11111111-0000-4000-b000-000000000003', 'test-biz-c', 'Business C', 'venue', 'draft', '11111111-0000-4000-a000-000000000004');

insert into public.business_members (business_id, user_id, role, status) values
  ('11111111-0000-4000-b000-000000000001', '11111111-0000-4000-a000-000000000002', 'manager', 'active'),
  ('11111111-0000-4000-b000-000000000001', '11111111-0000-4000-a000-000000000003', 'staff', 'active');

insert into public.listings (id, business_id, type, booking_mode, slug, title, city, duration_minutes, max_guests, price_amount, status) values
  ('11111111-0000-4000-e000-000000000001', '11111111-0000-4000-b000-000000000001', 'service', 'appointment', 'a-pub', 'A published', 'Lahore', 60, 1, 100000, 'published'),
  ('11111111-0000-4000-e000-000000000002', '11111111-0000-4000-b000-000000000001', 'service', 'appointment', 'a-draft', 'A draft', 'Lahore', 60, 1, 100000, 'draft'),
  ('11111111-0000-4000-e000-000000000003', '11111111-0000-4000-b000-000000000002', 'service', 'appointment', 'b-pub', 'B published', 'Karachi', 60, 1, 100000, 'published'),
  ('11111111-0000-4000-e000-000000000004', '11111111-0000-4000-b000-000000000003', 'service', 'appointment', 'c-pub', 'C published (draft business)', 'Karachi', 60, 1, 100000, 'published');

insert into public.bookings (id, business_id, consumer_id, listing_id, starts_at, ends_at, subtotal_amount, total_amount) values
  ('11111111-0000-4000-8000-000000000001', '11111111-0000-4000-b000-000000000001', '11111111-0000-4000-a000-000000000005',
   '11111111-0000-4000-e000-000000000001', now() + interval '1 day', now() + interval '1 day 1 hour', 100000, 100000),
  ('11111111-0000-4000-8000-000000000002', '11111111-0000-4000-b000-000000000002', '11111111-0000-4000-a000-000000000006',
   '11111111-0000-4000-e000-000000000003', now() + interval '2 days', now() + interval '2 days 1 hour', 100000, 100000);

-- Anonymous visitors ---------------------------------------------------------
select pg_temp.login_anon();

select is((select count(*)::int from public.listings where id::text like '11111111-%'), 2,
  'anon sees published listings of active businesses only');
select is((select count(*)::int from public.businesses where id::text like '11111111-%'), 2,
  'anon does not see draft businesses');
select is_empty($$ select 1 from public.business_private $$, 'anon cannot read business_private');
select is_empty($$ select 1 from public.bookings $$, 'anon cannot read bookings');
select is_empty($$ select 1 from public.profile_private $$, 'anon cannot read private profiles');
select throws_ok(
  $$ select public.create_booking('11111111-0000-4000-e000-000000000001') $$,
  '42501', null, 'anon cannot call create_booking');

-- Consumers ----------------------------------------------------------------
select pg_temp.login('11111111-0000-4000-a000-000000000005');

select results_eq(
  $$ select id from public.bookings $$,
  $$ values ('11111111-0000-4000-8000-000000000001'::uuid) $$,
  'consumer sees only their own bookings');
select is((select count(*)::int from public.profile_private), 1, 'consumer sees only their own private profile');
select throws_ok(
  $$ insert into public.bookings (business_id, consumer_id, listing_id, starts_at, ends_at, subtotal_amount, total_amount)
     values ('11111111-0000-4000-b000-000000000001', '11111111-0000-4000-a000-000000000005', '11111111-0000-4000-e000-000000000001',
             now() + interval '3 days', now() + interval '3 days 1 hour', 0, 0) $$,
  '42501', null, 'consumers cannot insert bookings directly');
select throws_ok(
  $$ update public.profiles set personality_badge_id = null where id = '11111111-0000-4000-a000-000000000005' $$,
  '42501', null, 'consumers cannot set their own badge');
select lives_ok(
  $$ update public.profiles set display_name = 'Renamed' where id = '11111111-0000-4000-a000-000000000005' $$,
  'consumers can edit their display name');
with u as (update public.profiles set display_name = 'Hacked' where id = '11111111-0000-4000-a000-000000000006' returning 1)
select is(count(*)::int, 0, 'consumers cannot edit other profiles') from u;

-- Staff ----------------------------------------------------------------------
select pg_temp.login('11111111-0000-4000-a000-000000000003');

select is((select count(*)::int from public.listings where business_id = '11111111-0000-4000-b000-000000000001'), 2,
  'staff see their business''s draft listings');
select is((select count(*)::int from public.bookings), 1, 'staff see only their business''s bookings');
select is_empty($$ select 1 from public.business_private $$, 'staff cannot read business_private');
with u as (update public.listings set price_amount = 1 where id = '11111111-0000-4000-e000-000000000001' returning 1)
select is(count(*)::int, 0, 'staff cannot edit listings') from u;
select lives_ok(
  $$ select public.update_booking_status('11111111-0000-4000-8000-000000000001', 'cancelled_by_business', 'Closed') $$,
  'staff can manage their business''s bookings');
select throws_ok(
  $$ select public.update_booking_status('11111111-0000-4000-8000-000000000002', 'cancelled_by_business') $$,
  'P0002', null, 'staff cannot touch another business''s bookings');

-- Managers -------------------------------------------------------------------
select pg_temp.login('11111111-0000-4000-a000-000000000002');

with u as (update public.listings set price_amount = 120000 where id = '11111111-0000-4000-e000-000000000001' returning 1)
select is(count(*)::int, 1, 'managers can change prices') from u;
with u as (update public.listings set price_amount = 1 where id = '11111111-0000-4000-e000-000000000003' returning 1)
select is(count(*)::int, 0, 'managers cannot edit another business''s listings') from u;
with u as (update public.businesses set name = 'Renamed A' where id = '11111111-0000-4000-b000-000000000001' returning 1)
select is(count(*)::int, 0, 'managers cannot change business settings') from u;
select is_empty($$ select 1 from public.business_private $$, 'managers cannot read payouts or private data');
select throws_ok(
  $$ insert into public.business_members (business_id, user_id, role, status)
     values ('11111111-0000-4000-b000-000000000001', '11111111-0000-4000-a000-000000000006', 'staff', 'invited') $$,
  '42501', null, 'managers cannot add team members');
with u as (update public.business_members set role = 'owner'
           where business_id = '11111111-0000-4000-b000-000000000001' and user_id = '11111111-0000-4000-a000-000000000002' returning 1)
select is(count(*)::int, 0, 'managers cannot promote themselves') from u;
select lives_ok(
  $$ insert into public.coupons (business_id, code, title, discount_type, discount_value)
     values ('11111111-0000-4000-b000-000000000001', 'MGR10', 'Manager coupon', 'percent', 10) $$,
  'managers can create coupons');
select throws_ok(
  $$ insert into public.payout_accounts (business_id, provider, account_title)
     values ('11111111-0000-4000-b000-000000000001', 'bank_transfer', 'Mine') $$,
  '42501', null, 'managers cannot add payout accounts');

-- Owners ---------------------------------------------------------------------
select pg_temp.login('11111111-0000-4000-a000-000000000001');

select results_eq(
  $$ select business_id from public.business_private $$,
  $$ values ('11111111-0000-4000-b000-000000000001'::uuid) $$,
  'owners read only their own business_private');
with u as (update public.businesses set name = 'Renamed A' where id = '11111111-0000-4000-b000-000000000001' returning 1)
select is(count(*)::int, 1, 'owners can change business settings') from u;
select throws_ok(
  $$ update public.businesses set status = 'suspended' where id = '11111111-0000-4000-b000-000000000001' $$,
  '42501', null, 'owners cannot change business status');
select lives_ok(
  $$ insert into public.payout_accounts (business_id, provider, account_title)
     values ('11111111-0000-4000-b000-000000000001', 'bank_transfer', 'Business A') $$,
  'owners can add payout accounts');
select is_empty($$ select 1 from public.bookings where business_id = '11111111-0000-4000-b000-000000000002' $$,
  'owners cannot see another business''s bookings');
set constraints all immediate;
select throws_ok(
  $$ delete from public.business_members where business_id = '11111111-0000-4000-b000-000000000001' and user_id = '11111111-0000-4000-a000-000000000001' $$,
  '23514', null, 'the last owner cannot leave');
select throws_ok(
  $$ select * from public.create_business_api_key('11111111-0000-4000-b000-000000000002', 'POS') $$,
  '42501', null, 'owners cannot create API keys for another business');
select isnt((select api_key from public.create_business_api_key('11111111-0000-4000-b000-000000000001', 'Front desk POS')), null,
  'owners can create API keys');
select throws_ok(
  $$ select key_hash from public.business_api_keys $$,
  '42501', null, 'API key hashes are never readable');

-- New businesses start as drafts owned by their creator
select lives_ok(
  $$ insert into public.businesses (id, slug, name, kind, status)
     values ('11111111-0000-4000-b000-000000000009', 'sneaky', 'Sneaky', 'host', 'active') $$,
  'any user can create a business');
select pg_temp.logout();
select is((select status::text from public.businesses where id = '11111111-0000-4000-b000-000000000009'), 'draft',
  'self-created businesses are forced to draft');
select is((select role::text from public.business_members where business_id = '11111111-0000-4000-b000-000000000009'), 'owner',
  'the creator becomes owner');

-- Super admin ------------------------------------------------------------------
select pg_temp.login('11111111-0000-4000-a000-000000000007');

select is((select count(*)::int from public.bookings where id::text like '11111111-%'), 2, 'admins see every booking');
select is((select count(*)::int from public.business_private where business_id::text like '11111111-%'), 4, 'admins see every business_private');
with u as (update public.businesses set status = 'active' where id = '11111111-0000-4000-b000-000000000003' returning 1)
select is(count(*)::int, 1, 'admins can approve businesses') from u;

select * from finish();
rollback;
