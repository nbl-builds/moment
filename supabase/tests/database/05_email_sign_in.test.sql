-- email_sign_in_method: which step follows the email on "Login or sign up".
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '55555555-0000-4000-a000-000000000001', 'authenticated', 'authenticated',
   'has.password@sign-in.test', extensions.crypt('moment2026', extensions.gen_salt('bf')), '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '55555555-0000-4000-a000-000000000002', 'authenticated', 'authenticated',
   'code.only@sign-in.test', '', '{}', now(), now());

-- Callable while signed out.
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is(public.email_sign_in_method('has.password@sign-in.test'), 'password', 'an account with a password asks for it');
select is(public.email_sign_in_method('  HAS.Password@Sign-In.test '), 'password', 'matching ignores case and spaces');
select is(public.email_sign_in_method('code.only@sign-in.test'), 'code', 'an account without a password gets a code');
select is(public.email_sign_in_method('nobody@sign-in.test'), 'new', 'an unknown email starts sign up');

reset role;
select is(
  (select prosecdef from pg_proc where oid = 'public.email_sign_in_method(text)'::regprocedure),
  true, 'runs as definer so anon never reads auth.users directly');

select * from finish();
rollback;
