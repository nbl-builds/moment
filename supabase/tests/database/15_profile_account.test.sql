-- Profile screens: personal details, saved payment methods (one default),
-- saved coupons, booking / payment notifications and public app config.
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

\set dev '''00000000-0000-4000-a000-000000000099'''
\set hamza '''00000000-0000-4000-a000-000000000021'''

select has_column('public', 'profile_private', 'pronouns', 'pronouns column');
select has_column('public', 'profile_private', 'emergency_contact_phone', 'emergency contact column');
select has_column('public', 'profile_private', 'privacy_prefs', 'privacy prefs column');
select has_column('public', 'profiles', 'identity_verified_at', 'verified column');
select ok((select relrowsecurity from pg_class where oid = 'public.saved_payment_methods'::regclass), 'RLS on saved_payment_methods');
select ok((select relrowsecurity from pg_class where oid = 'public.saved_coupons'::regclass), 'RLS on saved_coupons');

-- Personal details
select pg_temp.login(:dev);
select lives_ok($$ update public.profile_private set pronouns = 'they/them' where user_id = auth.uid() $$, 'edit own pronouns');
select throws_ok($$ update public.profile_private set emergency_contact_phone = '03001234567' where user_id = auth.uid() $$, '23514', null, 'emergency phone must be +92');
select throws_ok($$ update public.profile_private set emergency_contact_name = null where user_id = auth.uid() $$, '23514', null, 'emergency contact needs name and phone together');
select throws_ok($$ update public.profiles set identity_verified_at = now() where id = auth.uid() $$, '42501', null, 'cannot verify yourself');
select pg_temp.logout();

-- Saved payment methods: own only, one default, promotion on remove
select pg_temp.login(:dev);
select is((select count(*)::int from public.saved_payment_methods), 2, 'dev sees own two methods');
select is((select last4 from public.saved_payment_methods where is_default), '4242', 'card is the default');
insert into public.saved_payment_methods (user_id, method, last4, provider, provider_token) values (auth.uid(), 'easypaisa', '1111', 'mock', 'mock_ep');
select is((select last4 from public.saved_payment_methods where is_default), '4242', 'adding keeps the default');
select lives_ok($$ select public.set_default_payment_method((select id from public.saved_payment_methods where last4 = '1111')) $$, 'set default');
select is((select array_agg(last4)::text from public.saved_payment_methods where is_default), '{1111}', 'exactly one default');
delete from public.saved_payment_methods where last4 = '1111';
select is((select count(*)::int from public.saved_payment_methods where is_default), 1, 'removing the default promotes another');
select throws_ok($$ insert into public.saved_payment_methods (user_id, method, last4) values ('00000000-0000-4000-a000-000000000021', 'card', '1234') $$, '42501', null, 'cannot add for someone else');
select throws_ok($$ insert into public.saved_payment_methods (user_id, method, last4) values (auth.uid(), 'card', '1234') $$, '23514', null, 'a card needs an expiry');
select pg_temp.logout();
select pg_temp.login(:hamza);
select is((select count(*)::int from public.saved_payment_methods), 0, 'others see none of mine');
select throws_ok($$ select public.set_default_payment_method((select id from public.saved_payment_methods limit 1)) $$, 'P0002', null, 'cannot default a method that is not mine');
select pg_temp.logout();

-- Saved coupons: public offers only
select pg_temp.login(:dev);
select lives_ok($$ insert into public.saved_coupons (user_id, coupon_id) values (auth.uid(), '00000000-0000-4000-8100-000000000001') $$, 'save a public offer');
select throws_ok($$ insert into public.saved_coupons (user_id, coupon_id) values (auth.uid(), '00000000-0000-4000-8100-000000000004') $$, '42501', null, 'cannot save a private code');
select pg_temp.logout();

-- Notifications from booking and payment events
select is((select count(distinct data ->> 'booking_id')::int from public.notifications where user_id = :dev and type like 'booking_%'),
  (select count(*)::int from public.bookings where consumer_id = :dev), 'every seeded booking notified the guest');
update public.bookings set status = 'cancelled_by_business'
where id = (select id from public.bookings where consumer_id = :dev and status = 'pending' limit 1);
select is((select title from public.notifications where user_id = :dev order by created_at desc, id limit 1), 'Booking cancelled', 'status change notifies the guest');
select ok((select data ? 'booking_id' from public.notifications where user_id = :dev and type = 'booking_cancelled' order by created_at desc limit 1), 'notification links to the booking');

-- Public config
set local role anon;
select is((select value::int from public.platform_settings where key = 'referrals.reward_amount'), 50000, 'referral reward is public');
select ok((select value ? 'instagram' from public.platform_settings where key = 'app.social_links'), 'social links are public');
reset role;

set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$ select public.set_default_payment_method(gen_random_uuid()) $$, '42501', null, 'guests cannot set a default');

select * from finish();
rollback;
