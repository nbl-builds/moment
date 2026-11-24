-- "Finish signing up": private name fields and the sign-up-completed marker.
-- Uses its own numbers, not the test_otp ones, which may already exist locally.
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

select has_column('public', 'profile_private', 'first_name', 'profile_private has first_name');
select has_column('public', 'profile_private', 'last_name', 'profile_private has last_name');
select has_column('public', 'profile_private', 'sign_up_completed_at', 'profile_private has sign_up_completed_at');

-- A phone sign-up starts unfinished, with the phone normalised to E.164.
select pg_temp.mk_user('44444444-0000-4000-a000-000000000001', '923990000001');
select pg_temp.mk_user('44444444-0000-4000-a000-000000000002', '923990000002');

select is(
  (select phone from public.profile_private where user_id = '44444444-0000-4000-a000-000000000001'),
  '+923990000001', 'phone sign-up stores the number in E.164');
select ok(
  (select sign_up_completed_at is null from public.profile_private where user_id = '44444444-0000-4000-a000-000000000001'),
  'a new user has not finished sign up');

-- The user finishes sign up on their own row.
select pg_temp.login('44444444-0000-4000-a000-000000000001');
update public.profile_private
  set first_name = 'Nabeel', last_name = 'Ahmed', date_of_birth = '1996-03-23', sign_up_completed_at = now()
  where user_id = '44444444-0000-4000-a000-000000000001';
select results_eq(
  $$ select first_name, last_name, sign_up_completed_at is not null from public.profile_private $$,
  $$ values ('Nabeel'::text, 'Ahmed'::text, true) $$,
  'a user finishes sign up and sees only their own private profile');

-- Nobody else can read or change those fields.
select pg_temp.login('44444444-0000-4000-a000-000000000002');
select is_empty(
  $$ select 1 from public.profile_private where user_id = '44444444-0000-4000-a000-000000000001' $$,
  'another user cannot read the names');
update public.profile_private set first_name = 'Hacked' where user_id = '44444444-0000-4000-a000-000000000001';
reset role;
select is(
  (select first_name from public.profile_private where user_id = '44444444-0000-4000-a000-000000000001'),
  'Nabeel', 'another user cannot change the names');

select throws_ok(
  $$ update public.profile_private set first_name = '' where user_id = '44444444-0000-4000-a000-000000000001' $$,
  '23514', null, 'empty names are rejected');

select * from finish();
rollback;
