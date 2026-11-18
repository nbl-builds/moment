-- Reviews, chat, groups, payments.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

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
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Fixtures -----------------------------------------------------------------
select pg_temp.mk_user('33333333-0000-4000-a000-000000000001', 'Owner');
select pg_temp.mk_user('33333333-0000-4000-a000-000000000002', 'Staff');
select pg_temp.mk_user('33333333-0000-4000-a000-000000000003', 'Guest');
select pg_temp.mk_user('33333333-0000-4000-a000-000000000004', 'Stranger');
select pg_temp.mk_user('33333333-0000-4000-a000-000000000005', 'Other owner');

insert into public.businesses (id, slug, name, kind, status, created_by) values
  ('33333333-0000-4000-b000-000000000001', 'test-social-biz', 'Social Biz', 'operator', 'active', '33333333-0000-4000-a000-000000000001'),
  ('33333333-0000-4000-b000-000000000002', 'test-other-biz', 'Other Biz', 'operator', 'active', '33333333-0000-4000-a000-000000000005');
insert into public.business_members (business_id, user_id, role, status)
values ('33333333-0000-4000-b000-000000000001', '33333333-0000-4000-a000-000000000002', 'staff', 'active');

insert into public.listings (id, business_id, type, booking_mode, slug, title, city, duration_minutes, max_guests, price_amount, status)
values ('33333333-0000-4000-e000-000000000001', '33333333-0000-4000-b000-000000000001', 'experience', 'slot', 'test-walk', 'Test walk', 'Karachi', 60, 4, 200000, 'published');

insert into public.bookings (id, business_id, consumer_id, listing_id, starts_at, ends_at, status, subtotal_amount, total_amount) values
  ('33333333-0000-4000-8000-000000000001', '33333333-0000-4000-b000-000000000001', '33333333-0000-4000-a000-000000000003',
   '33333333-0000-4000-e000-000000000001', now() - interval '2 days', now() - interval '2 days' + interval '1 hour', 'completed', 200000, 200000),
  ('33333333-0000-4000-8000-000000000002', '33333333-0000-4000-b000-000000000001', '33333333-0000-4000-a000-000000000003',
   '33333333-0000-4000-e000-000000000001', now() + interval '2 days', now() + interval '2 days 1 hour', 'confirmed', 200000, 200000);

-- Reviews ------------------------------------------------------------------
select pg_temp.login('33333333-0000-4000-a000-000000000003');

select throws_ok(
  $$ insert into public.reviews (booking_id, author_id, rating) values ('33333333-0000-4000-8000-000000000002', '33333333-0000-4000-a000-000000000003', 5) $$,
  '42501', null, 'bookings that have not happened cannot be reviewed');
select lives_ok(
  $$ insert into public.reviews (booking_id, author_id, rating, body, status)
     values ('33333333-0000-4000-8000-000000000001', '33333333-0000-4000-a000-000000000003', 4, 'Lovely', 'hidden') $$,
  'completed bookings can be reviewed');
select is((select status::text from public.reviews where booking_id = '33333333-0000-4000-8000-000000000001'), 'published',
  'authors cannot choose moderation status');
select is((select rating_avg from public.listings where id = '33333333-0000-4000-e000-000000000001'), 4.00::numeric,
  'listing rating is updated');
update public.reviews set business_reply = 'fake reply' where booking_id = '33333333-0000-4000-8000-000000000001';
select is((select business_reply from public.reviews where booking_id = '33333333-0000-4000-8000-000000000001'), null,
  'authors cannot write the business reply');

select pg_temp.login('33333333-0000-4000-a000-000000000004');
select throws_ok(
  $$ insert into public.reviews (booking_id, author_id, rating) values ('33333333-0000-4000-8000-000000000001', '33333333-0000-4000-a000-000000000004', 1) $$,
  '42501', null, 'strangers cannot review other people''s bookings');
select throws_ok(
  $$ select public.reply_to_review((select id from public.reviews where booking_id = '33333333-0000-4000-8000-000000000001'), 'spam') $$,
  'P0002', null, 'strangers cannot reply as the business');

select pg_temp.login('33333333-0000-4000-a000-000000000002');
select is((select business_reply from public.reply_to_review(
  (select id from public.reviews where booking_id = '33333333-0000-4000-8000-000000000001'), 'Thank you!')), 'Thank you!',
  'business staff can reply');
select is((select replied_by from public.reviews where booking_id = '33333333-0000-4000-8000-000000000001'),
  '33333333-0000-4000-a000-000000000002'::uuid, 'the reply records who wrote it');

-- Chat ---------------------------------------------------------------------
select pg_temp.login('33333333-0000-4000-a000-000000000003');
select lives_ok(
  $$ select public.start_business_conversation('33333333-0000-4000-b000-000000000001', '33333333-0000-4000-8000-000000000002') $$,
  'guests can message a business about their booking');
select lives_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     select id, '33333333-0000-4000-a000-000000000003', 'Is parking available?' from public.conversations
     where business_id = '33333333-0000-4000-b000-000000000001' $$,
  'guests can send messages');
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, sender_business_id, body)
     select id, '33333333-0000-4000-a000-000000000003', '33333333-0000-4000-b000-000000000001', 'I am the business'
     from public.conversations where business_id = '33333333-0000-4000-b000-000000000001' $$,
  '42501', null, 'guests cannot impersonate the business');
select throws_ok(
  $$ select public.start_business_conversation('33333333-0000-4000-b000-000000000002', '33333333-0000-4000-8000-000000000002') $$,
  'P0002', null, 'a booking can only be discussed with its own business');

select pg_temp.login('33333333-0000-4000-a000-000000000002');
select is((select count(*)::int from public.messages), 1, 'business staff see the shared inbox');
select lives_ok(
  $$ insert into public.messages (conversation_id, sender_id, sender_business_id, body)
     select id, '33333333-0000-4000-a000-000000000002', '33333333-0000-4000-b000-000000000001', 'Yes, free parking.'
     from public.conversations where business_id = '33333333-0000-4000-b000-000000000001' $$,
  'staff reply as the business');
select ok((select private.realtime_conversation_topic_allowed('conversation:' || id::text)
           from public.conversations where business_id = '33333333-0000-4000-b000-000000000001'),
  'staff may subscribe to the conversation channel');

select pg_temp.login('33333333-0000-4000-a000-000000000005');
select is_empty($$ select 1 from public.messages $$, 'another business cannot read the conversation');

-- Strangers cannot see the conversation, so hand them its id directly.
select pg_temp.logout();
create temp table t_conversation as
  select id from public.conversations where business_id = '33333333-0000-4000-b000-000000000001';
grant select on t_conversation to authenticated;

select pg_temp.login('33333333-0000-4000-a000-000000000004');
select is_empty($$ select 1 from public.messages $$, 'strangers cannot read the conversation');
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ((select id from t_conversation), '33333333-0000-4000-a000-000000000004', 'hi') $$,
  '42501', null, 'strangers cannot post');
select pg_temp.logout();
select ok(
  not (select private.realtime_conversation_topic_allowed('conversation:' || id::text)
       from public.conversations where business_id = '33333333-0000-4000-b000-000000000001'),
  'unauthenticated sessions may not subscribe');

-- Groups -------------------------------------------------------------------
select pg_temp.login('33333333-0000-4000-a000-000000000003');
insert into public.groups (id, owner_id, name, visibility, is_open_to_match, destination_city)
values ('33333333-0000-4000-7000-000000000001', '33333333-0000-4000-a000-000000000003', 'Open trip', 'public', true, 'Karachi'),
       ('33333333-0000-4000-7000-000000000002', '33333333-0000-4000-a000-000000000003', 'Secret trip', 'private', false, 'Lahore');
select is((select count(*)::int from public.group_members where group_id::text like '33333333-%'), 2,
  'group owners are added automatically');
select is((select count(*)::int from public.conversations where group_id::text like '33333333-%'), 2,
  'each group gets a chat');

select pg_temp.login('33333333-0000-4000-a000-000000000004');
select results_eq(
  $$ select name from public.groups where id::text like '33333333-%' $$,
  $$ values ('Open trip') $$,
  'private groups are hidden from non-members');
select results_eq(
  $$ select name from public.find_matching_groups('Karachi') where id::text like '33333333-%' $$,
  $$ values ('Open trip') $$,
  'open public groups show up in Group Match');
select lives_ok(
  $$ insert into public.group_members (group_id, user_id, status) values ('33333333-0000-4000-7000-000000000001', '33333333-0000-4000-a000-000000000004', 'requested') $$,
  'anyone can request to join a public group');
select throws_ok(
  $$ insert into public.group_members (group_id, user_id, status) values ('33333333-0000-4000-7000-000000000002', '33333333-0000-4000-a000-000000000004', 'requested') $$,
  '42501', null, 'private groups cannot be joined uninvited');
select throws_ok(
  $$ update public.group_members set status = 'active' where group_id = '33333333-0000-4000-7000-000000000001' and user_id = '33333333-0000-4000-a000-000000000004' $$,
  '42501', null, 'requesters cannot approve themselves');
select is_empty(
  $$ select 1 from public.messages m join public.conversations c on c.id = m.conversation_id where c.group_id = '33333333-0000-4000-7000-000000000001' $$,
  'pending members cannot read the group chat');

select pg_temp.login('33333333-0000-4000-a000-000000000003');
with u as (update public.group_members set status = 'active'
           where group_id = '33333333-0000-4000-7000-000000000001' and user_id = '33333333-0000-4000-a000-000000000004' returning 1)
select is(count(*)::int, 1, 'group owners approve requests') from u;
insert into public.messages (conversation_id, sender_id, body)
select id, '33333333-0000-4000-a000-000000000003', 'Welcome!' from public.conversations where group_id = '33333333-0000-4000-7000-000000000001';

select pg_temp.login('33333333-0000-4000-a000-000000000004');
select is(
  (select count(*)::int from public.messages m join public.conversations c on c.id = m.conversation_id where c.group_id = '33333333-0000-4000-7000-000000000001'),
  1, 'active members read the group chat');

-- Payments -----------------------------------------------------------------
select pg_temp.login('33333333-0000-4000-a000-000000000002');
select lives_ok(
  $$ insert into public.payments (business_id, booking_id, payer_id, amount, collected_by, provider, method, status, recorded_by)
     values ('33333333-0000-4000-b000-000000000001', '33333333-0000-4000-8000-000000000002', '33333333-0000-4000-a000-000000000003',
             200000, 'direct', 'cash', 'cash', 'succeeded', '33333333-0000-4000-a000-000000000002') $$,
  'staff can record a cash payment');
select throws_ok(
  $$ insert into public.payments (business_id, booking_id, amount, collected_by, provider, status, recorded_by)
     values ('33333333-0000-4000-b000-000000000001', '33333333-0000-4000-8000-000000000002', 200000, 'platform_collect', 'jazzcash', 'succeeded', '33333333-0000-4000-a000-000000000002') $$,
  '42501', null, 'provider payments can only be written by the backend');

select pg_temp.logout();
select is((select payment_status::text from public.bookings where id = '33333333-0000-4000-8000-000000000002'), 'paid',
  'a succeeded payment marks the booking paid');

select pg_temp.login('33333333-0000-4000-a000-000000000003');
select is((select count(*)::int from public.payments where booking_id = '33333333-0000-4000-8000-000000000002'), 1,
  'the payer sees their payment');
select pg_temp.login('33333333-0000-4000-a000-000000000004');
select is_empty($$ select 1 from public.payments where booking_id = '33333333-0000-4000-8000-000000000002' $$,
  'strangers cannot see payments');
select pg_temp.login('33333333-0000-4000-a000-000000000005');
select is_empty($$ select 1 from public.payments where booking_id = '33333333-0000-4000-8000-000000000002' $$,
  'other businesses cannot see payments');

select * from finish();
rollback;
