-- Named bucket lists: structure, owner-only access, one listing in several
-- lists, uniqueness per list, items only in your own lists, cascade on delete.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.mk_user(p_id uuid, p_phone text) returns void language sql as $$
  insert into auth.users (instance_id, id, aud, role, phone, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
          p_phone, '{}'::jsonb, now(), now());
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

select has_table('public', 'bucket_lists', 'bucket_lists exists');
select has_column('public', 'bucket_list_items', 'bucket_list_id', 'items belong to a list');
select col_not_null('public', 'bucket_list_items', 'bucket_list_id', 'every item is in a list');
select has_column('public', 'bucket_lists', 'share_token', 'lists have a share token');
select ok((select relrowsecurity from pg_class where oid = 'public.bucket_lists'::regclass), 'RLS on bucket_lists');

select pg_temp.mk_user('88888888-0000-4000-a000-000000000001', '923990000081');
select pg_temp.mk_user('88888888-0000-4000-a000-000000000002', '923990000082');

-- Owner creates two lists and saves the same listing in both
select pg_temp.login('88888888-0000-4000-a000-000000000001');
insert into public.bucket_lists (id, user_id, name) values
  ('88888888-0000-4000-b100-000000000001', '88888888-0000-4000-a000-000000000001', 'I love nature'),
  ('88888888-0000-4000-b100-000000000002', '88888888-0000-4000-a000-000000000001', 'Food trips');
select lives_ok(
  $$ insert into public.bucket_list_items (bucket_list_id, user_id, listing_id) values
       ('88888888-0000-4000-b100-000000000001', '88888888-0000-4000-a000-000000000001', '00000000-0000-4000-e000-000000000001'),
       ('88888888-0000-4000-b100-000000000002', '88888888-0000-4000-a000-000000000001', '00000000-0000-4000-e000-000000000001') $$,
  'the same listing can be in two lists');
select throws_ok(
  $$ insert into public.bucket_list_items (bucket_list_id, user_id, listing_id) values
       ('88888888-0000-4000-b100-000000000001', '88888888-0000-4000-a000-000000000001', '00000000-0000-4000-e000-000000000001') $$,
  '23505', null, 'but only once per list');
select throws_ok(
  $$ insert into public.bucket_lists (user_id, name) values ('88888888-0000-4000-a000-000000000001', '   ') $$,
  '23514', null, 'a list needs a name');
select throws_ok(
  $$ insert into public.bucket_lists (user_id, name) values ('88888888-0000-4000-a000-000000000001', repeat('x', 61)) $$,
  '23514', null, 'names are at most 60 characters');
select pg_temp.logout();

-- Another user sees nothing and cannot add to or rename someone else's list
select pg_temp.login('88888888-0000-4000-a000-000000000002');
select is_empty($$ select 1 from public.bucket_lists where user_id = '88888888-0000-4000-a000-000000000001' $$, 'lists are private');
select is_empty($$ select 1 from public.bucket_list_items where user_id = '88888888-0000-4000-a000-000000000001' $$, 'items are private');
select throws_ok(
  $$ insert into public.bucket_list_items (bucket_list_id, user_id, listing_id) values
       ('88888888-0000-4000-b100-000000000001', '88888888-0000-4000-a000-000000000002', '00000000-0000-4000-e000-000000000002') $$,
  '23503', null, 'cannot save into someone else''s list');
update public.bucket_lists set name = 'Hacked' where id = '88888888-0000-4000-b100-000000000001';
select pg_temp.logout();
select is((select name from public.bucket_lists where id = '88888888-0000-4000-b100-000000000001'), 'I love nature', 'cannot rename someone else''s list');

-- Deleting a list removes its items, not the same listing saved in another list
select pg_temp.login('88888888-0000-4000-a000-000000000001');
delete from public.bucket_lists where id = '88888888-0000-4000-b100-000000000001';
select is(
  (select count(*)::int from public.bucket_list_items where user_id = '88888888-0000-4000-a000-000000000001'),
  1, 'deleting a list deletes its items only');
select pg_temp.logout();

-- Guests see nothing
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select is_empty($$ select 1 from public.bucket_lists $$, 'guests see no lists');

select * from finish();
rollback;
