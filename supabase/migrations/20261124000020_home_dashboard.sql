-- Home dashboard (Figma 13:1487, 17:1027).

-- "55 miles away" on listing cards, in km. Experiences use their meeting point,
-- services their business location. Only listings the caller can see (RLS on
-- listings applies: security invoker), and only those with a known point.
create function public.listing_distances(p_lat double precision, p_lng double precision, p_listing_ids uuid[])
returns table (listing_id uuid, distance_km numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    l.id,
    round((extensions.st_distance(
      coalesce(l.meeting_point, bl.geo),
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    ) / 1000)::numeric, 1)
  from public.listings l
  left join public.business_locations bl on bl.id = l.location_id
  where l.id = any (p_listing_ids)
    and coalesce(l.meeting_point, bl.geo) is not null
    and p_lat between -90 and 90
    and p_lng between -180 and 180;
$$;

comment on function public.listing_distances(double precision, double precision, uuid[]) is
  'Distance in km from a point to each listing (meeting point, else business location), for listing cards.';

grant execute on function public.listing_distances(double precision, double precision, uuid[]) to anon, authenticated;

-- Curation tags for the Home rails "Local fun" and "Must-trys". The Moment team
-- tags listings (super admin) and the app shows the tagged ones in the user's city.
insert into public.tags (slug, name) values
  ('local-fun', 'Local fun'),
  ('must-try', 'Must-try')
on conflict (slug) do nothing;
