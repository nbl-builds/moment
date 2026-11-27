-- Business portal sign-up (Figma "Moment Business App": "What does your
-- business provide?" and "We need some more details").
--
-- 1. Category groups: the 7 tiles on "What does your business provide?"
--    (Adventure, Tours, Food, Health & Wellness, Art & Culture, Entertainment,
--    Beauty). They are categories with `is_group = true`; the existing listing
--    categories become their children. `business_kind` says what a "Business"
--    (not a host) becomes when it picks the group: 'operator' runs activities
--    away from a fixed premises, 'venue' is a place customers come to.
--    `list_categories` in the shared API hides groups by default, so the
--    consumer app's flat category list doesn't change.
-- 2. businesses.primary_category_id: the group picked at sign-up.
-- 3. create_business(): one transaction for the onboarding form. Runs as the
--    caller (security invoker), so RLS and the existing triggers apply: the
--    creator becomes the owner, status goes draft -> pending_review (the only
--    change an owner may make), and the primary location is added.

alter table public.categories
  add column description text,
  add column is_group boolean not null default false,
  add column business_kind public.business_kind,
  add constraint categories_business_kind_groups_only check (business_kind is null or is_group);

create index categories_groups_idx on public.categories (sort_order) where is_group;

insert into public.categories (slug, name, kind, icon, sort_order, is_group, business_kind, description) values
  ('adventure', 'Adventure', 'experience', 'mountain', 101, true, 'operator',
   'Hiking, trekking, paragliding, rafting, camping and off-road trips'),
  ('tours', 'Tours', 'experience', 'route-01', 102, true, 'operator',
   'City walks, heritage sites, guided day trips and sightseeing'),
  ('food', 'Food', 'experience', 'pizza-01', 103, true, 'venue',
   'Restaurants, cafes, food streets, tastings and cooking classes'),
  ('health-wellness', 'Health & Wellness', 'service', 'heart-check', 104, true, 'venue',
   'Spas, massage, yoga, fitness studios and wellness retreats'),
  ('art-culture', 'Art & Culture', 'experience', 'paint-brush-01', 105, true, 'operator',
   'Workshops, galleries, crafts, music and cultural performances'),
  ('entertainment', 'Entertainment', 'experience', 'armchair-01', 106, true, 'venue',
   'Gaming zones, bowling, escape rooms, cinemas and live events'),
  ('beauty', 'Beauty', 'service', 'beauty', 107, true, 'venue',
   'Salons, barbers, nails, skin care, makeup and grooming')
on conflict (slug) do nothing;

-- Existing listing categories (seeded on staging already; fresh databases get
-- them from seed.sql, which sets the same parents).
update public.categories c
set parent_id = g.id
from (values
  ('tours-walks', 'tours'),
  ('day-trips', 'tours'),
  ('food-drink', 'food'),
  ('outdoor-adventure', 'adventure'),
  ('water-activities', 'adventure'),
  ('arts-workshops', 'art-culture'),
  ('spa-massage', 'health-wellness'),
  ('hair', 'beauty'),
  ('nails', 'beauty'),
  ('grooming', 'beauty'),
  ('skin-care', 'beauty')
) as m(child, grp)
join public.categories g on g.slug = m.grp
where c.slug = m.child and c.parent_id is null;

alter table public.businesses
  add column primary_category_id uuid references public.categories (id) on delete set null;
create index businesses_primary_category_idx on public.businesses (primary_category_id);

-- ---------------------------------------------------------------------------
-- create_business
-- ---------------------------------------------------------------------------
create function public.create_business(
  p_name text,
  p_kind public.business_kind,
  p_category_id uuid,
  p_address text,
  p_city text,
  p_country_code text default 'PK',
  p_email text default null,
  p_phone text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid := gen_random_uuid();
  v_name text := btrim(p_name);
  v_base text;
  v_slug text;
  v_attempt integer := 0;
begin
  if v_uid is null then
    raise exception 'Sign in to create a business' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.business_members m where m.user_id = v_uid and m.status = 'active'
  ) then
    raise exception 'You already manage a business on Moment' using errcode = '23505';
  end if;
  if not exists (
    select 1 from public.categories c where c.id = p_category_id and c.is_group and c.is_active
  ) then
    raise exception 'Choose what your business provides' using errcode = '22023';
  end if;
  if coalesce(btrim(p_address), '') = '' or coalesce(btrim(p_city), '') = '' then
    raise exception 'Address and city are required' using errcode = '22023';
  end if;

  v_base := left(btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-'), 60);
  if v_base = '' then
    v_base := 'business';
  end if;
  v_slug := v_base;

  -- Slugs are unique across every business, including ones this user can't
  -- see, so retry with a random suffix on a clash.
  loop
    begin
      insert into public.businesses (id, slug, name, kind, email, phone, primary_category_id)
      values (v_id, v_slug, v_name, p_kind, nullif(btrim(p_email), ''), nullif(btrim(p_phone), ''), p_category_id);
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt > 5 then
        raise;
      end if;
      v_slug := v_base || '-' || substr(md5(random()::text), 1, 5);
    end;
  end loop;

  -- The insert trigger made the caller the owner; owners may submit for review.
  update public.businesses set status = 'pending_review' where id = v_id;

  insert into public.business_locations (business_id, name, address_line1, city, country_code, is_primary)
  values (v_id, v_name, btrim(p_address), btrim(p_city), upper(coalesce(p_country_code, 'PK')), true);

  return v_id;
end;
$$;

revoke execute on function public.create_business(text, public.business_kind, uuid, text, text, text, text, text)
  from public, anon;
grant execute on function public.create_business(text, public.business_kind, uuid, text, text, text, text, text)
  to authenticated;
