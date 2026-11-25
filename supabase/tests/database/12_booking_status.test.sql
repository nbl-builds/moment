-- Booking Status: unread counts per business, the private user:<id> Realtime
-- topic, and the dev user's seeded bookings and chats.
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

select has_function('public', 'my_business_unread', 'my_business_unread exists');

-- Seed: the dev user has past, cancelled and upcoming bookings (local testing may change which)
select ok(
  (select count(distinct status) from public.bookings where consumer_id = '00000000-0000-4000-a000-000000000099') >= 3,
  'the dev user has bookings in several statuses');

-- Unread counts on a fresh chat with Gulberg Glow (independent of local test data)
select pg_temp.login('00000000-0000-4000-a000-000000000099');
create temp table glow_chat as select (public.start_business_conversation('00000000-0000-4000-b000-000000000005')).id;
select pg_temp.logout();
insert into public.messages (conversation_id, sender_id, sender_business_id, body)
select id, (select user_id from public.business_members where business_id = '00000000-0000-4000-b000-000000000005' limit 1),
       '00000000-0000-4000-b000-000000000005', v.body
from glow_chat, (values ('Salam!'), ('Your keratin is confirmed.')) as v(body);
select pg_temp.login('00000000-0000-4000-a000-000000000099');
select is((select unread from public.my_business_unread() where business_id = '00000000-0000-4000-b000-000000000005'), 2, 'two unread from the business');

-- My own messages never count; replying (or marking read) clears the count.
insert into public.messages (conversation_id, sender_id, body)
select id, '00000000-0000-4000-a000-000000000099', 'Thanks!' from glow_chat;
select is((select unread from public.my_business_unread() where business_id = '00000000-0000-4000-b000-000000000005'), 0, 'replying marks the chat read');

select ok(private.realtime_user_topic_allowed('user:00000000-0000-4000-a000-000000000099'), 'I can listen to my own topic');
select ok(not private.realtime_user_topic_allowed('user:00000000-0000-4000-a000-000000000021'), 'but not to someone else''s');

-- Another user sees only their own conversations
select pg_temp.login('00000000-0000-4000-a000-000000000021');
select is_empty($$ select 1 from public.my_business_unread() where business_id = '00000000-0000-4000-b000-000000000002' $$, 'others don''t see my chats');

select * from finish();
rollback;
