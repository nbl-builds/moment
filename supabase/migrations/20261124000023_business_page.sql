-- Business page (Figma "Business Look" 25:2265 ...): opening hours ("Open now"),
-- the hero photo gallery, the verified badge and a bucket for review photos.

-- ---------------------------------------------------------------------------
-- Opening hours: one row per opening period, wall-clock in the business's
-- timezone (Asia/Karachi by default). A day without rows is closed. Periods may
-- run past midnight (closes_at <= opens_at, e.g. 18:00-02:00).
-- ---------------------------------------------------------------------------
create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday, as in JS getDay()
  opens_at time not null,
  closes_at time not null check (closes_at <> opens_at),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, weekday, opens_at)
);

create trigger business_hours_updated_at before update on public.business_hours
  for each row execute function private.set_updated_at();

-- Whether a business is open at an instant (default now), in its own timezone.
create function public.business_is_open(p_business_id uuid, p_at timestamptz default now())
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  with local as (
    select (p_at at time zone b.timezone) as ts
    from public.businesses b
    where b.id = p_business_id
  )
  select coalesce(bool_or(
    case
      -- Same-day period
      when h.closes_at > h.opens_at then
        h.weekday = extract(dow from l.ts) and l.ts::time >= h.opens_at and l.ts::time < h.closes_at
      -- Past midnight: the evening part on its weekday, the early part on the next day
      else
        (h.weekday = extract(dow from l.ts) and l.ts::time >= h.opens_at)
        or (h.weekday = (extract(dow from l.ts)::int + 6) % 7 and l.ts::time < h.closes_at)
    end
  ), false)
  from local l
  join public.business_hours h on h.business_id = p_business_id;
$$;

-- ---------------------------------------------------------------------------
-- Gallery: the swipeable hero photos (storage refs or URLs), in order.
-- ---------------------------------------------------------------------------
create table public.business_photos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  url text not null,
  alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index business_photos_business_idx on public.business_photos (business_id, sort_order);

-- Moment checked this business (verified badge next to the name). Set by admins.
alter table public.businesses add column is_verified boolean not null default false;

-- ---------------------------------------------------------------------------
-- RLS: public read for active businesses; owners and managers edit hours and
-- photos (managers edit schedules, as for availability); admins through policy.
-- ---------------------------------------------------------------------------
alter table public.business_hours enable row level security;
alter table public.business_photos enable row level security;

create policy "business_hours: public read for active businesses" on public.business_hours
  for select to anon, authenticated
  using ((select private.is_business_active(business_id)));
create policy "business_hours: members and admins read" on public.business_hours
  for select to authenticated
  using ((select private.is_business_member(business_id)) or (select private.is_super_admin()));
create policy "business_hours: owners, managers and admins manage" on public.business_hours
  for all to authenticated
  using ((select private.has_business_role(business_id, array['owner', 'manager']::public.business_role[])) or (select private.is_super_admin()))
  with check ((select private.has_business_role(business_id, array['owner', 'manager']::public.business_role[])) or (select private.is_super_admin()));

create policy "business_photos: public read for active businesses" on public.business_photos
  for select to anon, authenticated
  using ((select private.is_business_active(business_id)));
create policy "business_photos: members and admins read" on public.business_photos
  for select to authenticated
  using ((select private.is_business_member(business_id)) or (select private.is_super_admin()));
create policy "business_photos: owners, managers and admins manage" on public.business_photos
  for all to authenticated
  using ((select private.has_business_role(business_id, array['owner', 'manager']::public.business_role[])) or (select private.is_super_admin()))
  with check ((select private.has_business_role(business_id, array['owner', 'manager']::public.business_role[])) or (select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Review photos: review-photos/<user_id>/..., public to read (reviews are public).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "review-photos: users upload to their folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'review-photos' and private.storage_folder_uuid(name) = (select auth.uid()));
create policy "review-photos: users delete their own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'review-photos' and private.storage_folder_uuid(name) = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Who may write a review here: the signed-in user's completed bookings at this
-- business that have no review yet (newest first). Empty = "review after your visit".
-- ---------------------------------------------------------------------------
create function public.reviewable_bookings(p_business_id uuid)
returns table (booking_id uuid, listing_id uuid, listing_title text, starts_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select b.id, b.listing_id, l.title, b.starts_at
  from public.bookings b
  join public.listings l on l.id = b.listing_id
  where b.business_id = p_business_id
    and b.consumer_id = (select auth.uid())
    and b.status = 'completed'
    and not exists (select 1 from public.reviews r where r.booking_id = b.id)
  order by b.starts_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Map pin and distance on the business page: a business's locations as lat/lng
-- (geography columns come back from the API as WKB).
-- ---------------------------------------------------------------------------
create function public.business_location_points(p_business_id uuid)
returns table (location_id uuid, lat double precision, lng double precision)
language sql
stable
security invoker
set search_path = ''
as $$
  select l.id, extensions.st_y(l.geo::extensions.geometry), extensions.st_x(l.geo::extensions.geometry)
  from public.business_locations l
  where l.business_id = p_business_id and l.geo is not null
  order by l.is_primary desc, l.id;
$$;
