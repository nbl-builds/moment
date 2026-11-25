-- Groups screens: link sharing and likes visibility on groups, experiences
-- and businesses saved to a group (group_likes), Group Match requests,
-- recommendations for a group, people search for invites, and group covers.

create type public.likes_visibility as enum ('everyone', 'only_me');
create type public.match_request_status as enum ('pending', 'accepted', 'declined');

-- ---------------------------------------------------------------------------
-- Groups: sharing, likes visibility, invite link token
-- ---------------------------------------------------------------------------
alter table public.groups
  add column sharing_enabled boolean not null default false,
  add column likes_visibility public.likes_visibility not null default 'everyone',
  add column invite_token text not null unique default encode(extensions.gen_random_bytes(12), 'hex');

comment on column public.groups.sharing_enabled is 'Group Settings > Enable Sharing: the invite link (moment://group/<invite_token>) can be shared.';
comment on column public.groups.likes_visibility is 'Group Settings > Who can see likes?: everyone in the group, or only the member who liked.';
comment on column public.groups.invite_token is 'Secret for invite links; rotate to revoke old links.';

-- ---------------------------------------------------------------------------
-- Liked by group
-- ---------------------------------------------------------------------------
create table public.group_likes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(listing_id, business_id) = 1)
);
create unique index group_likes_listing_idx on public.group_likes (group_id, user_id, listing_id) where listing_id is not null;
create unique index group_likes_business_idx on public.group_likes (group_id, user_id, business_id) where business_id is not null;
create index group_likes_group_idx on public.group_likes (group_id, created_at desc);
create index group_likes_user_idx on public.group_likes (user_id);
create index group_likes_listing_ref_idx on public.group_likes (listing_id);
create index group_likes_business_ref_idx on public.group_likes (business_id);

alter table public.group_likes enable row level security;

-- Members see their own likes, and everyone's when the group shares likes.
create policy "group_likes: members read" on public.group_likes
  for select to authenticated
  using (
    (user_id = (select auth.uid()) and (select private.is_group_member(group_id)))
    or (
      (select private.is_group_member(group_id))
      and exists (select 1 from public.groups g where g.id = group_id and g.likes_visibility = 'everyone')
    )
    or (select private.is_super_admin())
  );
create policy "group_likes: members like" on public.group_likes
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_group_member(group_id)));
create policy "group_likes: unlike own" on public.group_likes
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select private.is_group_admin(group_id)) or (select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Group Match requests
-- ---------------------------------------------------------------------------
create table public.group_match_requests (
  id uuid primary key default gen_random_uuid(),
  from_group_id uuid not null references public.groups (id) on delete cascade,
  to_group_id uuid not null references public.groups (id) on delete cascade,
  status public.match_request_status not null default 'pending',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_group_id <> to_group_id),
  unique (from_group_id, to_group_id)
);
create index group_match_requests_to_idx on public.group_match_requests (to_group_id, status);
create index group_match_requests_created_by_idx on public.group_match_requests (created_by);
create trigger group_match_requests_updated_at before update on public.group_match_requests
  for each row execute function private.set_updated_at();

alter table public.group_match_requests enable row level security;

create policy "match: members of either group read" on public.group_match_requests
  for select to authenticated
  using ((select private.is_group_member(from_group_id)) or (select private.is_group_member(to_group_id)) or (select private.is_super_admin()));
-- Any member of a group open to match can send a request to another public, open group.
create policy "match: members send" on public.group_match_requests
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and status = 'pending'
    and (select private.is_group_member(from_group_id))
    and exists (select 1 from public.groups g where g.id = to_group_id and g.visibility = 'public' and g.is_open_to_match)
  );
create policy "match: receiving admins answer" on public.group_match_requests
  for update to authenticated
  using ((select private.is_group_admin(to_group_id)))
  with check ((select private.is_group_admin(to_group_id)));
create policy "match: senders withdraw" on public.group_match_requests
  for delete to authenticated
  using ((select private.is_group_member(from_group_id)) and status = 'pending');

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
-- Group Match for one group: public groups open to match in the same
-- destination city (any city when unset), best badge overlap first, with
-- member counts and the request this group already sent.
create function public.group_matches(p_group_id uuid, p_limit integer default 20)
returns table (
  id uuid, name text, description text, cover_url text, destination_city text,
  member_count integer, shared_badges integer, request_status public.match_request_status
)
language sql
stable
security invoker
set search_path = ''
as $$
  select g.id, g.name, g.description, g.cover_url, g.destination_city,
    (select count(*)::integer from public.group_members m where m.group_id = g.id and m.status = 'active'),
    (select count(*)::integer from public.group_members m
       join public.profiles p on p.id = m.user_id
       where m.group_id = g.id and m.status = 'active' and p.personality_badge_id in (
         select p2.personality_badge_id from public.group_members m2 join public.profiles p2 on p2.id = m2.user_id
         where m2.group_id = p_group_id and m2.status = 'active' and p2.personality_badge_id is not null)),
    r.status
  from public.groups me
  join public.groups g on g.id <> me.id
  left join public.group_match_requests r on r.from_group_id = me.id and r.to_group_id = g.id
  where me.id = p_group_id
    and private.is_group_member(me.id)
    and g.visibility = 'public'
    and g.is_open_to_match
    and (g.end_date is null or g.end_date >= current_date)
    and (me.destination_city is null or g.destination_city = me.destination_city)
    and not private.has_group_relation(g.id)
  order by 7 desc, g.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

comment on function public.group_matches(uuid, integer) is 'Group page > Group Match: groups to match with, and the request already sent.';

-- Recommended for a group: published experiences ranked by the members'
-- badge tag weights plus the tags of what the group already liked; things
-- already liked are left out. Popularity breaks ties.
create function public.group_recommendations(p_group_id uuid, p_limit integer default 10)
returns table (listing_id uuid, score numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with members as (
    select m.user_id from public.group_members m
    where m.group_id = p_group_id and m.status = 'active' and private.is_group_member(p_group_id)
  ),
  tag_weights as (
    select bt.tag_id, sum(bt.weight) as w
    from members mb
    join public.profiles p on p.id = mb.user_id
    join public.badge_tags bt on bt.badge_id = p.personality_badge_id
    group by bt.tag_id
    union all
    select lt.tag_id, count(*) * 2.0
    from public.group_likes gl
    join public.listing_tags lt on lt.listing_id = gl.listing_id
    where gl.group_id = p_group_id
    group by lt.tag_id
  ),
  weights as (select tag_id, sum(w) as w from tag_weights group by tag_id)
  select l.id, coalesce(sum(w.w), 0) + l.popularity_score / 100.0
  from public.listings l
  left join public.listing_tags lt on lt.listing_id = l.id
  left join weights w on w.tag_id = lt.tag_id
  where l.status = 'published'
    and l.type = 'experience'
    and private.is_business_active(l.business_id)
    and exists (select 1 from members)
    and not exists (select 1 from public.group_likes gl where gl.group_id = p_group_id and gl.listing_id = l.id)
  group by l.id, l.popularity_score
  order by 2 desc, l.id
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;

comment on function public.group_recommendations(uuid, integer) is 'Group page > Recommended Group: experiences for the whole group.';

-- Invite others: find Moment users by name or exact phone (E.164 or 03xx).
create function public.find_people(p_query text, p_limit integer default 20)
returns table (id uuid, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select trim(p_query) as text,
      case
        when regexp_replace(p_query, '\D', '', 'g') ~ '^03\d{9}$' then '+92' || substr(regexp_replace(p_query, '\D', '', 'g'), 2)
        when regexp_replace(p_query, '\D', '', 'g') ~ '^923\d{9}$' then '+' || regexp_replace(p_query, '\D', '', 'g')
      end as phone
  )
  select p.id, p.display_name, p.avatar_url
  from public.profiles p
  left join public.profile_private pp on pp.user_id = p.id
  cross join q
  where (select auth.uid()) is not null
    and p.id <> (select auth.uid())
    and char_length(q.text) >= 2
    and (p.display_name ilike '%' || q.text || '%' or (q.phone is not null and pp.phone = q.phone))
  order by (q.phone is not null and pp.phone = q.phone) desc, p.display_name
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

comment on function public.find_people(text, integer) is 'Invite others: Moment users by name, or by exact phone number (never returns the phone).';

-- Signed-in users only (functions are executable by PUBLIC by default).
revoke execute on function public.group_matches(uuid, integer) from public, anon;
revoke execute on function public.group_recommendations(uuid, integer) from public, anon;
revoke execute on function public.find_people(text, integer) from public, anon;
grant execute on function public.group_matches(uuid, integer) to authenticated;
grant execute on function public.group_recommendations(uuid, integer) to authenticated;
grant execute on function public.find_people(text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Group covers: public bucket, uploads into your own folder
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('group-covers', 'group-covers', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "group-covers: upload own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'group-covers' and private.storage_folder_uuid(name) = (select auth.uid()));
create policy "group-covers: replace own" on storage.objects
  for update to authenticated
  using (bucket_id = 'group-covers' and private.storage_folder_uuid(name) = (select auth.uid()));
create policy "group-covers: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'group-covers' and private.storage_folder_uuid(name) = (select auth.uid()));
