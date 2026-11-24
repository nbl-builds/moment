-- "Finish signing up" (Figma 7:949) collects first and last name. Until now they
-- only lived in auth user metadata and the public display_name. Keep them as
-- private profile fields, next to date_of_birth, and record when sign up was
-- completed so returning users skip that screen.

alter table public.profile_private
  add column first_name text check (first_name is null or char_length(first_name) between 1 and 50),
  add column last_name text check (last_name is null or char_length(last_name) between 1 and 50),
  add column sign_up_completed_at timestamptz;

comment on column public.profile_private.first_name is 'Given name from "Finish signing up". Private; profiles.display_name is the public name.';
comment on column public.profile_private.last_name is 'Family name from "Finish signing up". Private.';
comment on column public.profile_private.sign_up_completed_at is 'Set when the user finishes sign up. Null means the app shows "Finish signing up" after sign in.';

-- Users who signed up before this migration and already have a name and date of
-- birth count as finished.
update public.profile_private pp
set sign_up_completed_at = pp.updated_at
from public.profiles p
where p.id = pp.user_id
  and pp.date_of_birth is not null
  and p.display_name <> '';
