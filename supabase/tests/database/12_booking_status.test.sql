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

select has_function('public', 'my_business_unread', 'my_business_unread exists');

-- Seed: every status for the dev user
select is(
  (select array_agg(distinct status::text order by status::text) from public.bookings where consumer_id = '00000000-0000-4000-a000-000000000099'),
  array['cancelled_by_business', 'cancelled_by_consumer', 'completed', 'confirmed', 'pending'],
  'the dev user has bookings in every status');

select pg_temp.login('00000000-0000-4000-a000-000000000099');
select is((select unread from public.my_business_unread() where business_id = '00000000-0000-4000-b000-000000000002'), 3, 'three unread from Saffron');
select is((select unread from public.my_business_unread() where business_id = '00000000-0000-4000-b000-000000000001'), 0, 'Margalla is read');

-- My own messages never count; reading clears the count.
insert into public.messages (conversation_id, sender_id, body)
select conversation_id, '00000000-0000-4000-a000-000000000099', 'Thanks!' from public.my_business_unread() where business_id = '00000000-0000-4000-b000-000000000002';
select is((select unread from public.my_business_unread() where business_id = '00000000-0000-4000-b000-000000000002'), 0, 'replying marks the chat read');

select ok(private.realtime_user_topic_allowed('user:00000000-0000-4000-a000-000000000099'), 'I can listen to my own topic');
select ok(not private.realtime_user_topic_allowed('user:00000000-0000-4000-a000-000000000021'), 'but not to someone else''s');

-- Another user sees only their own conversations
select pg_temp.login('00000000-0000-4000-a000-000000000021');
select is_empty($$ select 1 from public.my_business_unread() where business_id = '00000000-0000-4000-b000-000000000002' $$, 'others don''t see my chats');

select * from finish();
rollback;
