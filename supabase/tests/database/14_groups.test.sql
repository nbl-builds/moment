-- Groups: likes and their visibility, Group Match requests, recommendations,
-- people search, link-sharing columns and group covers.
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

select has_table('public', 'group_likes', 'group_likes exists');
select has_table('public', 'group_match_requests', 'group_match_requests exists');
select has_column('public', 'groups', 'sharing_enabled', 'groups can share links');
select has_column('public', 'groups', 'likes_visibility', 'groups choose who sees likes');
select has_column('public', 'groups', 'invite_token', 'groups have an invite token');
select ok((select relrowsecurity from pg_class where oid = 'public.group_likes'::regclass), 'RLS on group_likes');
select ok((select relrowsecurity from pg_class where oid = 'public.group_match_requests'::regclass), 'RLS on group_match_requests');
select is((select count(distinct invite_token)::int from public.groups), (select count(*)::int from public.groups), 'invite tokens are unique');

-- Seed: the dev user owns two groups and is a member of a third
select is((select count(*)::int from public.group_members where user_id = '00000000-0000-4000-a000-000000000099' and status = 'active'), 3, 'dev user is in three groups');

-- Likes: everyone sees all likes; with only_me, members see their own
select pg_temp.login('00000000-0000-4000-a000-000000000099');
select is((select count(distinct user_id)::int from public.group_likes where group_id = '00000000-0000-4000-7000-000000000004'), 4, 'everyone: likes from all members');
select pg_temp.logout();
update public.groups set likes_visibility = 'only_me' where id = '00000000-0000-4000-7000-000000000004';
select pg_temp.login('00000000-0000-4000-a000-000000000099');
select is((select array_agg(distinct user_id)::text from public.group_likes where group_id = '00000000-0000-4000-7000-000000000004'),
  '{00000000-0000-4000-a000-000000000099}', 'only_me: just my likes');

-- Members like; outsiders cannot
select lives_ok(
  $$ insert into public.group_likes (group_id, user_id, listing_id)
     values ('00000000-0000-4000-7000-000000000004', '00000000-0000-4000-a000-000000000099', (select id from public.listings where slug = 'rawal-lake-kayaking')) $$,
  'a member likes an experience for the group');
select throws_ok(
  $$ insert into public.group_likes (group_id, user_id, listing_id)
     values ('00000000-0000-4000-7000-000000000006', '00000000-0000-4000-a000-000000000099', (select id from public.listings where slug = 'rawal-lake-kayaking')) $$,
  '42501', null, 'not in a group you are not in');

-- Group Match
select is((select count(*)::int from public.group_matches('00000000-0000-4000-7000-000000000005')), 3, 'three Islamabad groups to match with');
select is((select request_status::text from public.group_matches('00000000-0000-4000-7000-000000000005') where name = 'Islamabad Hiking Crew'), 'pending', 'the sent request shows');
select lives_ok(
  $$ insert into public.group_match_requests (from_group_id, to_group_id, created_by)
     values ('00000000-0000-4000-7000-000000000005', '00000000-0000-4000-7000-000000000006', '00000000-0000-4000-a000-000000000099') $$,
  'members send a match request');
select throws_ok(
  $$ insert into public.group_match_requests (from_group_id, to_group_id, created_by)
     values ('00000000-0000-4000-7000-000000000005', '00000000-0000-4000-7000-000000000002', '00000000-0000-4000-a000-000000000099') $$,
  '42501', null, 'not to a private group');
select is_empty($$ select 1 from public.group_matches('00000000-0000-4000-7000-000000000006') $$, 'no matches for a group I am not in');

-- Recommendations leave out what the group already liked
select ok((select count(*) from public.group_recommendations('00000000-0000-4000-7000-000000000004', 10)) = 10, 'ten recommendations');
select is_empty($$
  select 1 from public.group_recommendations('00000000-0000-4000-7000-000000000004', 50) r
  join public.group_likes gl on gl.listing_id = r.listing_id and gl.group_id = '00000000-0000-4000-7000-000000000004'
$$, 'liked experiences are not recommended again');

-- People search: by name and by phone, never yourself
select is((select display_name from public.find_people('fatima')), 'Fatima Noor', 'find by name');
select is((select count(*)::int from public.find_people('Ali Raza')), 0, 'never yourself');
select pg_temp.logout();
update public.profile_private set phone = '+923331234567' where user_id = '00000000-0000-4000-a000-000000000024';
select pg_temp.login('00000000-0000-4000-a000-000000000099');
select is((select display_name from public.find_people('0333 1234567')), 'Zainab Rizvi', 'find by local phone number');

-- Covers: upload into your own folder only
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('group-covers', '00000000-0000-4000-a000-000000000099/c.jpg', '00000000-0000-4000-a000-000000000099') $$,
  'upload a cover to your folder');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('group-covers', '00000000-0000-4000-a000-000000000021/c.jpg', '00000000-0000-4000-a000-000000000099') $$,
  '42501', null, 'not to someone else''s folder');
select pg_temp.logout();

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$ select * from public.find_people('fatima') $$, '42501', null, 'guests cannot search people');

select * from finish();
rollback;
