-- Home "Services near you" (Figma 17:1027, replaces "Just for you"): active
-- service businesses (venues: spas, salons, barbers) with what their card shows.
--
-- Order:
--   * with a location: nearest first (to 0.1 km, as the card shows it), then
--     the quiz badge's affinity for the business's service tags, then rating;
--   * without one: businesses in p_city (all cities when null) by rating
--     (one decimal), then affinity, then number of ratings.
-- Affinity is the sum of the user's badge weights over the distinct tags on
-- the business's published services (0 without a badge or a session).

create function public.services_near_you(
  p_lat double precision default null,
  p_lng double precision default null,
  p_city text default null,
  p_limit integer default 20
)
returns table (
  id uuid,
  slug text,
  name text,
  logo_url text,
  cover_url text,
  rating_avg numeric,
  rating_count integer,
  currency text,
  area text,
  city text,
  category_name text,
  category_slugs text[],
  from_price integer,
  distance_km numeric,
  affinity numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with here as (
    select case
      when p_lat between -90 and 90 and p_lng between -180 and 180
        then extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    end as point
  ),
  venues as (
    select
      b.id,
      b.slug::text,
      b.name,
      b.logo_url,
      coalesce(
        b.cover_url,
        (select ph.url from public.business_photos ph where ph.business_id = b.id order by ph.sort_order limit 1)
      ) as cover_url,
      b.rating_avg,
      b.rating_count,
      b.currency::text,
      loc.area,
      loc.city,
      (
        select c.name from public.listings l join public.categories c on c.id = l.category_id
        where l.business_id = b.id and l.type = 'service' and l.status = 'published'
        group by c.name order by count(*) desc, c.name limit 1
      ) as category_name,
      array(
        select distinct c.slug::text from public.listings l join public.categories c on c.id = l.category_id
        where l.business_id = b.id and l.type = 'service' and l.status = 'published' order by 1
      ) as category_slugs,
      (
        select min(l.price_amount)::integer from public.listings l
        where l.business_id = b.id and l.type = 'service' and l.status = 'published'
      ) as from_price,
      case when (select point from here) is not null and loc.geo is not null
        then round((extensions.st_distance(loc.geo, (select point from here)) / 1000)::numeric, 1)
      end as distance_km,
      coalesce((
        select sum(t.weight) from (
          select distinct bt.tag_id, bt.weight
          from public.listings l
          join public.listing_tags lt on lt.listing_id = l.id
          join public.badge_tags bt on bt.tag_id = lt.tag_id
          join public.profiles p on p.personality_badge_id = bt.badge_id
          where l.business_id = b.id and l.type = 'service' and l.status = 'published'
            and p.id = (select auth.uid())
        ) t
      ), 0) as affinity
    from public.businesses b
    left join lateral (
      select bl.area, bl.city, bl.geo from public.business_locations bl
      where bl.business_id = b.id order by bl.is_primary desc, bl.created_at limit 1
    ) loc on true
    where b.kind = 'venue'
      and b.status = 'active'
      and exists (select 1 from public.listings l where l.business_id = b.id and l.type = 'service' and l.status = 'published')
  )
  select v.id, v.slug, v.name, v.logo_url, v.cover_url, v.rating_avg, v.rating_count, v.currency,
         v.area, v.city, v.category_name, v.category_slugs, v.from_price, v.distance_km, v.affinity
  from venues v
  where (select point from here) is not null or p_city is null or v.city = p_city
  order by
    case when (select point from here) is not null then v.distance_km end asc nulls last,
    case when (select point from here) is null then round(v.rating_avg, 1) end desc,
    v.affinity desc,
    v.rating_avg desc,
    v.rating_count desc,
    v.name
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

comment on function public.services_near_you(double precision, double precision, text, integer) is
  'Home "Services near you": active service businesses, nearest first with a location, else by rating in the city; the quiz badge breaks ties.';

grant execute on function public.services_near_you(double precision, double precision, text, integer) to anon, authenticated;
