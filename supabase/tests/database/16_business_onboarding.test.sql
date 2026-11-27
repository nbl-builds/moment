-- Business portal sign-up: category groups and create_business().
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

-- Hamza is a consumer with no business.
\set hamza '''00000000-0000-4000-a000-000000000021'''
\set dev '''00000000-0000-4000-a000-000000000099'''

select is((select count(*)::int from public.categories where is_group), 7, 'seven sign-up tiles');
select is((select count(*)::int from public.categories where not is_group and parent_id is null), 0, 'every listing category has a group');
select is((select business_kind::text from public.categories where slug = 'beauty'), 'venue', 'beauty businesses are venues');
select is((select business_kind::text from public.categories where slug = 'tours'), 'operator', 'tour businesses are operators');
select throws_ok($$ insert into public.categories (slug, name, kind, business_kind) values ('x', 'X', 'service', 'venue') $$,
  '23514', null, 'only groups carry a business kind');

select pg_temp.login(:hamza);
select is((select count(*)::int from public.business_members where user_id = auth.uid() and status = 'active'), 0, 'hamza has no business');
select throws_ok($$ select public.create_business('Hamza Salon', 'venue', (select id from public.categories where slug = 'hair'), 'Main Blvd', 'Lahore') $$,
  '22023', null, 'must pick a group, not a listing category');
select lives_ok($$ select public.create_business('Hamza''s Salon', 'venue', (select id from public.categories where slug = 'beauty'), '12 Main Boulevard, Gulberg', 'Lahore', 'PK', 'salon@example.pk') $$,
  'create a business');
select is((select status::text from public.businesses where created_by = auth.uid()), 'pending_review', 'submitted for review');
select is((select slug::text from public.businesses where created_by = auth.uid()), 'hamza-s-salon', 'slug from the name');
select is((select role::text from public.business_members where user_id = auth.uid()), 'owner', 'creator is the owner');
select is((select count(*)::int from public.business_locations l join public.businesses b on b.id = l.business_id
  where b.created_by = auth.uid() and l.is_primary and l.city = 'Lahore'), 1, 'primary location added');
select throws_ok($$ select public.create_business('Second', 'venue', (select id from public.categories where slug = 'beauty'), 'x', 'Lahore') $$,
  '23505', null, 'one business per account from onboarding');
select throws_ok($$ update public.businesses set status = 'active' where created_by = auth.uid() $$,
  '42501', null, 'owners cannot approve themselves');
select pg_temp.logout();

-- Slug clash with someone else's business gets a suffix.
select pg_temp.login(:dev);
delete from public.business_members where user_id = auth.uid();
select pg_temp.logout();
delete from public.business_members where user_id = :dev;
select pg_temp.login(:dev);
select lives_ok($$ select public.create_business('Hamza''s Salon', 'venue', (select id from public.categories where slug = 'beauty'), '1 Mall Road', 'Lahore') $$,
  'same name, different owner');
select matches((select slug::text from public.businesses where created_by = auth.uid() order by created_at desc limit 1), '^hamza-s-salon-[0-9a-f]{5}$', 'slug gets a suffix');
select pg_temp.logout();

select throws_ok($$ select public.create_business('Anon', 'venue', null, 'x', 'Lahore') $$, '42501', null, 'anon cannot call it');

select * from finish();
rollback;
