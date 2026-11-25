-- Explore, Experience details and Host Profile:
--   * experience content the detail page shows (reasons to book, what to
--     bring, cuisine) and its itinerary ("What you will be doing");
--   * a cover photo for host profiles;
--   * map-area queries for Explore (experiences and service businesses in a
--     bounding box, with the same filters as Search).

-- ---------------------------------------------------------------------------
-- Experience content
-- ---------------------------------------------------------------------------
alter table public.listings
  add column highlights text[] not null default '{}'
    check (cardinality(highlights) <= 10),
  add column what_to_bring text[] not null default '{}'
    check (cardinality(what_to_bring) <= 20),
  add column cuisine text check (char_length(cuisine) <= 60);

comment on column public.listings.highlights is 'Experience details: "N Reasons to book this experience".';
comment on column public.listings.what_to_bring is 'Experience details: "What to bring".';
comment on column public.listings.cuisine is 'Experience details facts grid (food experiences): "Pakistani", "Lahori street food".';

create table public.listing_itinerary_steps (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  listing_id uuid not null,
  position integer not null check (position >= 0),
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 600),
  duration_minutes integer check (duration_minutes between 1 and 1440),
  created_at timestamptz not null default now(),
  foreign key (business_id, listing_id) references public.listings (business_id, id) on delete cascade,
  unique (listing_id, position)
);
create index listing_itinerary_steps_business_idx on public.listing_itinerary_steps (business_id);

comment on table public.listing_itinerary_steps is 'Experience details: "What you will be doing" timeline, in order.';

alter table public.listing_itinerary_steps enable row level security;

create policy "itinerary: public read" on public.listing_itinerary_steps
  for select to anon, authenticated
  using ((select private.is_listing_public(listing_id)));
create policy "itinerary: members and admins read" on public.listing_itinerary_steps
  for select to authenticated
  using ((select private.is_business_member(business_id)) or (select private.is_super_admin()));
create policy "itinerary: managers and admins manage" on public.listing_itinerary_steps
  for all to authenticated
  using ((select private.is_business_manager(business_id)) or (select private.is_super_admin()))
  with check ((select private.is_business_manager(business_id)) or (select private.is_super_admin()));

-- ---------------------------------------------------------------------------
-- Host Profile
-- ---------------------------------------------------------------------------
alter table public.staff_members add column cover_url text;
comment on column public.staff_members.cover_url is 'Host Profile cover photo (storage ref or URL); falls back to the business cover.';

-- ---------------------------------------------------------------------------
-- Explore: what is inside the visible map area
-- ---------------------------------------------------------------------------
-- Experiences whose meeting point (else business location) is in the box,
-- filtered like Search. Distance from the user when given. Best first.
create function public.explore_listings(
  p_min_lat double precision,
  p_min_lng double precision,
  p_max_lat double precision,
  p_max_lng double precision,
  p_category_ids uuid[] default null,
  p_query text default null,
  p_min_price integer default null,
  p_max_price integer default null,
  p_min_rating numeric default null,
  p_user_lat double precision default null,
  p_user_lng double precision default null,
  p_limit integer default 100
)
returns table (listing_id uuid, lat double precision, lng double precision, distance_km numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with pts as (
    select l.id, l.popularity_score, coalesce(l.meeting_point, bl.geo) as geo
    from public.listings l
    left join public.business_locations bl on bl.id = l.location_id
    where l.status = 'published'
      and l.type = 'experience'
      and private.is_business_active(l.business_id)
      and (p_category_ids is null or l.category_id = any (p_category_ids))
      and (p_query is null or l.search_vector @@ websearch_to_tsquery('simple', p_query) or l.title ilike '%' || p_query || '%')
      and (p_min_price is null or l.price_amount >= p_min_price)
      and (p_max_price is null or l.price_amount <= p_max_price)
      and (p_min_rating is null or l.rating_avg >= p_min_rating)
  )
  select p.id,
         extensions.st_y(p.geo::extensions.geometry),
         extensions.st_x(p.geo::extensions.geometry),
         case when p_user_lat is not null and p_user_lng is not null then
           round((extensions.st_distance(p.geo, extensions.st_setsrid(extensions.st_makepoint(p_user_lng, p_user_lat), 4326)::extensions.geography) / 1000)::numeric, 1)
         end
  from pts p
  where p.geo is not null
    and extensions.st_intersects(
      p.geo::extensions.geometry,
      extensions.st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326))
  order by p.popularity_score desc, p.id
  limit least(greatest(coalesce(p_limit, 100), 1), 300);
$$;

comment on function public.explore_listings is
  'Explore map (experiences): published experiences inside a lat/lng box with Search filters; coordinates and distance for pins and cards.';

-- Service businesses (as "Services near you") inside the box.
create function public.explore_businesses(
  p_min_lat double precision,
  p_min_lng double precision,
  p_max_lat double precision,
  p_max_lng double precision,
  p_category_slugs text[] default null,
  p_query text default null,
  p_min_rating numeric default null,
  p_user_lat double precision default null,
  p_user_lng double precision default null,
  p_limit integer default 100
)
returns table (
  id uuid, slug text, name text, logo_url text, cover_url text, rating_avg numeric, rating_count integer,
  currency text, area text, city text, category_name text, category_slugs text[], from_price integer,
  distance_km numeric, affinity numeric, lat double precision, lng double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.id, s.slug, s.name, s.logo_url, s.cover_url, s.rating_avg, s.rating_count, s.currency, s.area, s.city,
         s.category_name, s.category_slugs, s.from_price, s.distance_km, s.affinity,
         extensions.st_y(loc.geo::extensions.geometry), extensions.st_x(loc.geo::extensions.geometry)
  from public.services_near_you(p_user_lat, p_user_lng, null, 300) s
  join lateral (
    select bl.geo from public.business_locations bl
    where bl.business_id = s.id order by bl.is_primary desc, bl.created_at limit 1
  ) loc on true
  where loc.geo is not null
    and extensions.st_intersects(
      loc.geo::extensions.geometry,
      extensions.st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326))
    and (p_category_slugs is null or s.category_slugs && p_category_slugs)
    and (p_query is null or s.name ilike '%' || p_query || '%' or s.category_name ilike '%' || p_query || '%')
    and (p_min_rating is null or s.rating_avg >= p_min_rating)
  limit least(greatest(coalesce(p_limit, 100), 1), 300);
$$;

comment on function public.explore_businesses is
  'Explore map (businesses): active service businesses inside a lat/lng box, same fields as services_near_you plus coordinates.';

grant execute on function public.explore_listings to anon, authenticated;
grant execute on function public.explore_businesses to anon, authenticated;
