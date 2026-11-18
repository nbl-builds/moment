-- Bucket list and "Recommend a place".

create table public.bucket_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  check (num_nonnulls(listing_id, business_id) = 1)
);
create unique index bucket_list_listing_idx on public.bucket_list_items (user_id, listing_id) where listing_id is not null;
create unique index bucket_list_business_idx on public.bucket_list_items (user_id, business_id) where business_id is not null;
create index bucket_list_items_user_idx on public.bucket_list_items (user_id, created_at desc);
create index bucket_list_items_listing_idx on public.bucket_list_items (listing_id);
create index bucket_list_items_business_idx on public.bucket_list_items (business_id);

create table public.place_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 140),
  category_id uuid references public.categories (id) on delete set null,
  address text,
  city text not null,
  geo extensions.geography(point, 4326),
  contact_phone text,
  note text check (char_length(note) <= 1000),
  status public.recommendation_status not null default 'new',
  admin_notes text,
  business_id uuid references public.businesses (id) on delete set null, -- set when onboarded
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index place_recommendations_user_idx on public.place_recommendations (user_id);
create index place_recommendations_status_idx on public.place_recommendations (status, created_at);
create index place_recommendations_category_idx on public.place_recommendations (category_id);
create index place_recommendations_business_idx on public.place_recommendations (business_id);

create trigger place_recommendations_updated_at before update on public.place_recommendations
  for each row execute function private.set_updated_at();

alter table public.bucket_list_items enable row level security;
alter table public.place_recommendations enable row level security;

create policy "bucket_list: own" on public.bucket_list_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "bucket_list: admins read" on public.bucket_list_items
  for select to authenticated
  using ((select private.is_super_admin()));

create policy "recommendations: own read" on public.place_recommendations
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_super_admin()));
create policy "recommendations: own create" on public.place_recommendations
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'new' and admin_notes is null and business_id is null);
create policy "recommendations: admins manage" on public.place_recommendations
  for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
