-- "Login or sign up" with email (Figma 12:845): after the email step the app
-- needs to know whether to ask for a password, send a code to an existing
-- account, or start a new sign-up.
--
-- This deliberately reveals whether an email has an account (a product
-- decision: returning users go straight to "Enter Password"). It returns only
-- one of three words, never ids or other user data.

create function public.email_sign_in_method(p_email text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when u.id is null then 'new'
    when coalesce(u.encrypted_password, '') <> '' then 'password'
    else 'code'
  end
  from (select 1) as one
  left join auth.users u
    on lower(u.email) = lower(trim(p_email))
   and u.deleted_at is null
  limit 1;
$$;

comment on function public.email_sign_in_method(text) is
  'Sign-in step after an email: ''password'' (account with a password), ''code'' (account without one; send an email code) or ''new''.';

revoke all on function public.email_sign_in_method(text) from public;
grant execute on function public.email_sign_in_method(text) to anon, authenticated;
