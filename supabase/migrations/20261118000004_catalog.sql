-- Categories, tags, listings (experiences and services) and their child tables.

-- ---------------------------------------------------------------------------
-- Taxonomy
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique,
  name text not null,
  kind public.category_kind not null,
  icon text, -- Huge Icons name
  parent_id uuid references public.categories (id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);
create index categories_parent_idx on public.categories (parent_id);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique,
  name text not null
);

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  type public.listing_type not null,
  booking_mode public.booking_mode not null,
  slug extensions.citext not null,
  title text not null check (char_length(title) between 3 and 140),
  summary text,
  description text,
  category_id uuid references public.categories (id) on delete set null,
  location_id uuid,
  meeting_point extensions.geography(point, 4326),
  meeting_point_notes text,
  city text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes > 0),
  buffer_minutes integer not null default 0 check (buffer_minutes >= 0),
  min_guests integer not null default 1 check (min_guests >= 1),
  max_guests integer not null default 1,
  price_amount integer not null check (price_amount >= 0), -- minor units
  currency char(3) not null default 'PKR',
  price_unit public.price_unit not null default 'per_person',
  instant_book boolean not null default true,
  cancellation_policy public.cancellation_policy not null default 'moderate',
  languages text[] not null default '{en,ur}',
  includes text[] not null default '{}',
  excludes text[] not null default '{}',
  status public.listing_status not null default 'draft',
  published_at timestamptz,
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  booking_count integer not null default 0,
  popularity_score numeric not null default 0,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(city, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(summary, '')), 'B')
    || setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored,
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_guests >= min_guests),
  unique (business_id, id),
  unique (business_id, slug),
  foreign key (business_id, location_id) references public.business_locations (business_id, id)
);
create index listings_business_idx on public.listings (business_id);
create index listings_category_idx on public.listings (category_id);
create index listings_location_idx on public.listings (location_id);
create index listings_discovery_idx on public.listings (status, category_id, popularity_score desc);
create index listings_city_idx on public.listings (city) where status = 'published';
create index listings_search_idx on public.listings using gin (search_vector);
create index listings_title_trgm_idx on public.listings using gin (title extensions.gin_trgm_ops);
create index listings_meeting_point_idx on public.listings using gist (meeting_point);

create trigger listings_updated_at before update on public.listings
  for each row execute function private.set_updated_at();

-- Aggregates are maintained by triggers; publishing stamps published_at.
create function private.listings_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and private.is_client_request() then
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
    new.booking_count := old.booking_count;
    new.popularity_score := old.popularity_score;
  end if;
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger listings_guard before insert or update on public.listings
  for each row execute function private.listings_guard();

create table public.listing_options (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  listing_id uuid not null,
  name text not null,
  description text,
  price_amount integer not null check (price_amount >= 0),
  duration_minutes integer check (duration_minutes > 0), -- overrides listing duration
  max_quantity integer check (max_quantity > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  external_ref text,
  unique (business_id, id),
  foreign key (business_id, listing_id) references public.listings (business_id, id) on delete cascade
);
create index listing_options_listing_idx on public.listing_options (listing_id);
create index listing_options_business_idx on public.listing_options (business_id);

create table public.listing_media (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  listing_id uuid not null,
  url text not null, -- storage path or absolute URL
  alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (business_id, listing_id) references public.listings (business_id, id) on delete cascade
);
create index listing_media_listing_idx on public.listing_media (listing_id, sort_order);
create index listing_media_business_idx on public.listing_media (business_id);

create table public.listing_tags (
  business_id uuid not null,
  listing_id uuid not null,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (listing_id, tag_id),
  foreign key (business_id, listing_id) references public.listings (business_id, id) on delete cascade
);
create index listing_tags_tag_idx on public.listing_tags (tag_id);
create index listing_tags_business_idx on public.listing_tags (business_id);

create table public.listing_staff (
  business_id uuid not null,
  listing_id uuid not null,
  staff_id uuid not null,
  primary key (listing_id, staff_id),
  foreign key (business_id, listing_id) references public.listings (business_id, id) on delete cascade,
  foreign key (business_id, staff_id) references public.staff_members (business_id, id) on delete cascade
);
create index listing_staff_staff_idx on public.listing_staff (staff_id);
create index listing_staff_business_idx on public.listing_staff (business_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.listings enable row level security;
alter table public.listing_options enable row level security;
alter table public.listing_media enable row level security;
alter table public.listing_tags enable row level security;
alter table public.listing_staff enable row level security;

create policy "categories: public read" on public.categories
  for select to anon, authenticated using (true);
create policy "categories: admins manage" on public.categories
  for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create policy "tags: public read" on public.tags
  for select to anon, authenticated using (true);
create policy "tags: admins manage" on public.tags
  for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

-- A listing is public when it is published and its business is active.
create function private.is_listing_public(lid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.listings l
    join public.businesses b on b.id = l.business_id
    where l.id = lid and l.status = 'published' and b.status = 'active'
  );
$$;

create policy "listings: public read published" on public.listings
  for select to anon, authenticated
  using (status = 'published' and (select private.is_business_active(business_id)));
create policy "listings: members and admins read" on public.listings
  for select to authenticated
  using ((select private.is_business_member(business_id)) or (select private.is_super_admin()));
create policy "listings: managers and admins manage" on public.listings
  for all to authenticated
  using ((select private.is_business_manager(business_id)) or (select private.is_super_admin()))
  with check ((select private.is_business_manager(business_id)) or (select private.is_super_admin()));

-- Child tables follow the same pattern.
create policy "listing_options: public read" on public.listing_options
  for select to anon, authenticated
  using (is_active and (select private.is_listing_public(listing_id)));
create policy "listing_options: members and admins read" on public.listing_options
  for select to authenticated
  using ((select private.is_business_member(business_id)) or (select private.is_super_admin()));
create policy "listing_options: managers and admins manage" on public.listing_options
  for all to authenticated
  using ((select private.is_business_manager(business_id)) or (select private.is_super_admin()))
  with check ((select private.is_business_manager(business_id)) or (select private.is_super_admin()));

create policy "listing_media: public read" on public.listing_media
  for select to anon, authenticated
  using ((select private.is_listing_public(listing_id)));
create policy "listing_media: members and admins read" on public.listing_media
  for select to authenticated
  using ((select private.is_business_member(business_id)) or (select private.is_super_admin()));
create policy "listing_media: managers and admins manage" on public.listing_media
  for all to authenticated
  using ((select private.is_business_manager(business_id)) or (select private.is_super_admin()))
  with check ((select private.is_business_manager(business_id)) or (select private.is_super_admin()));

create policy "listing_tags: public read" on public.listing_tags
  for select to anon, authenticated
  using ((select private.is_listing_public(listing_id)));
create policy "listing_tags: members and admins read" on public.listing_tags
  for select to authenticated
  using ((select private.is_business_member(business_id)) or (select private.is_super_admin()));
create policy "listing_tags: managers and admins manage" on public.listing_tags
  for all to authenticated
  using ((select private.is_business_manager(business_id)) or (select private.is_super_admin()))
  with check ((select private.is_business_manager(business_id)) or (select private.is_super_admin()));

create policy "listing_staff: public read" on public.listing_staff
  for select to anon, authenticated
  using ((select private.is_listing_public(listing_id)));
create policy "listing_staff: members and admins read" on public.listing_staff
  for select to authenticated
  using ((select private.is_business_member(business_id)) or (select private.is_super_admin()));
create policy "listing_staff: managers and admins manage" on public.listing_staff
  for all to authenticated
  using ((select private.is_business_manager(business_id)) or (select private.is_super_admin()))
  with check ((select private.is_business_manager(business_id)) or (select private.is_super_admin()));
