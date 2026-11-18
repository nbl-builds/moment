-- Profiles, private profile data, platform admins, sign-up trigger.

-- ---------------------------------------------------------------------------
-- Platform admins
-- ---------------------------------------------------------------------------
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now()
);
create index platform_admins_granted_by_idx on public.platform_admins (granted_by);

create function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins a where a.user_id = (select auth.uid())
  );
$$;

-- True for writes coming straight from the API (anon/authenticated roles) by
-- someone who is not a super admin. Internal security definer functions run as
-- their owner, so triggers they cause are not treated as client requests.
-- Must stay security invoker so current_user is the real caller.
create function private.is_client_request()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('anon', 'authenticated') and not private.is_super_admin();
$$;

alter table public.platform_admins enable row level security;

create policy "admins: read own row or all if admin" on public.platform_admins
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_super_admin()));

create policy "admins: super admins manage" on public.platform_admins
  for all to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Profiles (public card)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  avatar_url text,
  bio text check (char_length(bio) <= 500),
  home_city text,
  personality_badge_id uuid, -- FK added with badges
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles: public read" on public.profiles
  for select to anon, authenticated
  using (true);

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select private.is_super_admin()))
  with check (id = (select auth.uid()) or (select private.is_super_admin()));

-- Users may only edit display fields; the badge is set by submit_quiz.
revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url, bio, home_city) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Private profile data (owner only)
-- ---------------------------------------------------------------------------
create table public.profile_private (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email extensions.citext,
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  date_of_birth date,
  locale text not null default 'en-PK',
  notification_prefs jsonb not null default '{"push": true, "email": true, "sms": false, "marketing": false}',
  updated_at timestamptz not null default now()
);

create trigger profile_private_updated_at before update on public.profile_private
  for each row execute function private.set_updated_at();

alter table public.profile_private enable row level security;

create policy "profile_private: own or admin read" on public.profile_private
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_super_admin()));

create policy "profile_private: own update" on public.profile_private
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Sign-up: create profile rows
-- ---------------------------------------------------------------------------
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', '')
  );

  insert into public.profile_private (user_id, email, phone)
  values (
    new.id,
    new.email,
    case when new.phone is null or new.phone = '' then null
         when left(new.phone, 1) = '+' then new.phone
         else '+' || new.phone end
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
