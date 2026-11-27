-- Business portal demo data (local and staging only: production never runs
-- seeds). Runs after seed.sql. Every account: password123.
--
--   Owner    portal@moment.test          / +92 300 0000031  (Nadia Qureshi)
--   Manager  manager.portal@moment.test  / +92 300 0000032  (Ahmed Raza)
--   Staff    staff.portal@moment.test    / +92 300 0000033  (Zara Hayat)
--
-- Business "Lahore Heritage Trails" (Lahore, operator, active) with listings in
-- every state, bookings in every status across past and upcoming dates (relative
-- to now()), unread guest chats, reviews with photos, payments and view events.

-- ---------------------------------------------------------------------------
-- Helpers (session-only; seed.sql's helpers live in another session)
-- ---------------------------------------------------------------------------
create or replace function pg_temp.demo_user(p_id uuid, p_email text, p_name text, p_phone text)
returns void
language plpgsql
as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    phone, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    ltrim(p_phone, '+'), now(), '{"provider": "email", "providers": ["email", "phone"]}',
    jsonb_build_object('display_name', p_name), now(), now(),
    '', '', '', '', '', '', '', ''
  ) on conflict (id) do nothing;
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), p_id, p_id::text, 'email',
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
    now(), now(), now()
  ) on conflict do nothing;
end;
$$;

create or replace function pg_temp.d_today() returns date language sql as $$
  select (now() at time zone 'Asia/Karachi')::date;
$$;

create or replace function pg_temp.d_pk(p_date date, p_time time) returns timestamptz language sql as $$
  select (p_date + p_time) at time zone 'Asia/Karachi';
$$;

create or replace function pg_temp.d_cat(p_slug text) returns uuid language sql as $$
  select id from public.categories where slug = p_slug;
$$;

-- ---------------------------------------------------------------------------
-- People and business
-- ---------------------------------------------------------------------------
select pg_temp.demo_user('00000000-0000-4000-a000-000000000031', 'portal@moment.test',         'Nadia Qureshi', '+923000000031');
select pg_temp.demo_user('00000000-0000-4000-a000-000000000032', 'manager.portal@moment.test', 'Ahmed Raza',    '+923000000032');
select pg_temp.demo_user('00000000-0000-4000-a000-000000000033', 'staff.portal@moment.test',   'Zara Hayat',    '+923000000033');

update public.profiles set avatar_url = 'storage://seed-media/hosts/host-2.png', home_city = 'Lahore'
where id = '00000000-0000-4000-a000-000000000031';

insert into public.businesses (id, slug, name, kind, status, tagline, description, phone, email, created_by, logo_url, cover_url, primary_category_id)
values (
  '00000000-0000-4000-b000-000000000031', 'lahore-heritage-trails', 'Lahore Heritage Trails', 'operator', 'active',
  'Food walks, heritage mornings and craft workshops in old Lahore',
  'Small-group walks and workshops in the Walled City, led by Lahoris who grew up between its gates.',
  '+923000000031', 'portal@moment.test', '00000000-0000-4000-a000-000000000031',
  'storage://seed-media/logos/serenity.png', 'storage://seed-media/listings/old-town-walk.jpg', pg_temp.d_cat('tours')
) on conflict (id) do nothing;

insert into public.business_members (business_id, user_id, role, status, invited_by) values
  ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-a000-000000000032', 'manager', 'active', '00000000-0000-4000-a000-000000000031'),
  ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-a000-000000000033', 'staff', 'active', '00000000-0000-4000-a000-000000000031')
on conflict do nothing;

insert into public.business_locations (id, business_id, name, address_line1, area, city, province, postal_code, geo, is_primary)
values ('00000000-0000-4000-c000-000000000031', '00000000-0000-4000-b000-000000000031', 'Delhi Gate',
        'Delhi Gate, Shahi Guzargah', 'Walled City', 'Lahore', 'Punjab', '54000',
        extensions.st_setsrid(extensions.st_makepoint(74.3238, 31.5822), 4326)::extensions.geography, true)
on conflict (id) do nothing;

insert into public.staff_members (id, business_id, user_id, display_name, title, bio, languages, is_host, is_bookable, avatar_url) values
  ('00000000-0000-4000-d000-000000000031', '00000000-0000-4000-b000-000000000031', '00000000-0000-4000-a000-000000000031',
   'Nadia Qureshi', 'Founder and lead guide', 'Born inside Delhi Gate; has walked these lanes with guests for nine years.',
   '{en,ur,pa}', true, true, 'storage://seed-media/hosts/host-2.png'),
  ('00000000-0000-4000-d000-000000000032', '00000000-0000-4000-b000-000000000031', '00000000-0000-4000-a000-000000000033',
   'Zara Hayat', 'Workshop host', 'Truck artist and teacher.', '{en,ur}', true, true, 'storage://seed-media/hosts/host-3.png')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Listings: 4 published, 2 drafts (one half finished), 1 archived
-- ---------------------------------------------------------------------------
insert into public.listings (
  id, business_id, type, booking_mode, slug, title, summary, description, category_id, location_id,
  meeting_point, meeting_point_notes, city, duration_minutes, min_guests, max_guests, price_amount, price_unit,
  instant_book, cancellation_policy, languages, includes, excludes, status, published_at, created_at
) values
  ('00000000-0000-4000-e000-000000000331', '00000000-0000-4000-b000-000000000031', 'experience', 'slot', 'walled-city-food-walk-dusk',
   'Walled City Food Walk at Dusk', 'Twelve stops from Delhi Gate to Gawalmandi as the lamps come on.',
   'Start with chana and kulcha at Delhi Gate, wander the Shahi Guzargah for fried fish and tikka, and end with doodh patti at Gawalmandi. Vegetarian options at every stop.',
   pg_temp.d_cat('food-drink'), '00000000-0000-4000-c000-000000000031',
   extensions.st_setsrid(extensions.st_makepoint(74.3238, 31.5822), 4326)::extensions.geography,
   'Meet under the arch of Delhi Gate, look for the lime Moment flag.', 'Lahore', 180, 1, 12, 450000, 'per_person',
   true, 'flexible', '{en,ur}', '{"All food and drinks","Local guide","Bottled water"}', '{"Hotel pickup"}',
   'published', now() - interval '140 days', now() - interval '150 days'),
  ('00000000-0000-4000-e000-000000000332', '00000000-0000-4000-b000-000000000031', 'experience', 'slot', 'badshahi-fort-sunrise',
   'Badshahi Mosque & Fort at Sunrise', 'See the mosque glow pink at dawn, then walk the Fort before the crowds.',
   'An early start rewarded with the quietest hour at Badshahi Mosque, followed by the Sheesh Mahal and Alamgiri Gate inside Lahore Fort, and halwa puri breakfast at Fort Road.',
   pg_temp.d_cat('tours-walks'), '00000000-0000-4000-c000-000000000031',
   extensions.st_setsrid(extensions.st_makepoint(74.3104, 31.5880), 4326)::extensions.geography,
   'Hazuri Bagh main gate.', 'Lahore', 210, 1, 15, 550000, 'per_person',
   false, 'moderate', '{en,ur}', '{"Entry tickets","Breakfast","Local guide"}', '{}',
   'published', now() - interval '95 days', now() - interval '100 days'),
  ('00000000-0000-4000-e000-000000000333', '00000000-0000-4000-b000-000000000031', 'experience', 'slot', 'truck-art-painting-workshop',
   'Truck Art Painting Workshop', 'Paint your own kettle in the bold style of Pakistani truck art.',
   'Zara walks you through the motifs, colours and brushwork of truck art, then you paint a steel kettle (or tray) to take home. All materials included.',
   pg_temp.d_cat('arts-workshops'), '00000000-0000-4000-c000-000000000031', null, 'Studio on Lytton Road, 2nd floor.',
   'Lahore', 150, 1, 8, 650000, 'per_person',
   true, 'strict', '{en,ur}', '{"Kettle or tray","Paints and brushes","Chai"}', '{}',
   'published', now() - interval '40 days', now() - interval '45 days'),
  ('00000000-0000-4000-e000-000000000334', '00000000-0000-4000-b000-000000000031', 'experience', 'slot', 'androon-rickshaw-ride',
   'Rickshaw Ride through Androon Lahore', 'A private rickshaw loop of the thirteen gates with chai stops.',
   'Hop in a decorated rickshaw for a loop of the old city gates, stopping at Wazir Khan Mosque and a 200-year-old haveli. Private for your group.',
   pg_temp.d_cat('tours-walks'), '00000000-0000-4000-c000-000000000031', null, null,
   'Lahore', 120, 1, 3, 800000, 'per_booking',
   true, 'flexible', '{en,ur,pa}', '{"Private rickshaw","Chai"}', '{}',
   'published', now() - interval '9 days', now() - interval '12 days'),
  ('00000000-0000-4000-e000-000000000335', '00000000-0000-4000-b000-000000000031', 'experience', 'slot', 'basant-kite-making',
   'Basant Kite-Making Class', 'Build and fly a paper kite the old Lahori way.',
   'Learn to cut, glue and balance a guddi kite from paper and bamboo, then fly it from a rooftop.',
   pg_temp.d_cat('arts-workshops'), '00000000-0000-4000-c000-000000000031', null, null,
   'Lahore', 120, 1, 10, 350000, 'per_person',
   true, 'moderate', '{en,ur}', '{"Kite materials"}', '{}',
   'draft', null, now() - interval '6 days'),
  ('00000000-0000-4000-e000-000000000336', '00000000-0000-4000-b000-000000000031', 'experience', 'slot', 'shalimar-gardens-picnic',
   'Shalimar Gardens Picnic', null, null,
   pg_temp.d_cat('tours-walks'), null, null, null,
   'Lahore', 120, 1, 6, 0, 'per_person',
   true, 'moderate', '{en,ur}', '{}', '{}',
   'draft', null, now() - interval '2 days'),
  ('00000000-0000-4000-e000-000000000337', '00000000-0000-4000-b000-000000000031', 'experience', 'slot', 'lahore-museum-after-hours',
   'Lahore Museum After Hours', 'The Fasting Buddha and the Gandhara galleries by torchlight.',
   'A members-only evening at the Lahore Museum, now paused while the galleries are renovated.',
   pg_temp.d_cat('tours-walks'), '00000000-0000-4000-c000-000000000031', null, null,
   'Lahore', 90, 1, 12, 400000, 'per_person',
   true, 'moderate', '{en}', '{"Entry ticket"}', '{}',
   'archived', now() - interval '200 days', now() - interval '210 days')
on conflict (id) do nothing;

insert into public.listing_options (business_id, listing_id, name, price_amount, duration_minutes, sort_order) values
  ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-e000-000000000331', 'Standard', 450000, 180, 1),
  ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-e000-000000000331', 'Vegetarian', 400000, 180, 2),
  ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-e000-000000000333', 'Kettle', 650000, 150, 1),
  ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-e000-000000000333', 'Tray', 750000, 150, 2);

insert into public.listing_media (business_id, listing_id, url, alt, sort_order)
select '00000000-0000-4000-b000-000000000031', v.listing::uuid, 'storage://seed-media/listings/' || v.photo || '.jpg', v.alt, v.n
from (values
  ('00000000-0000-4000-e000-000000000331', 'night-market', 'Lamps along the food street', 0),
  ('00000000-0000-4000-e000-000000000331', 'street-drinks', 'Doodh patti at Gawalmandi', 1),
  ('00000000-0000-4000-e000-000000000331', 'food-tasting', 'Fried fish', 2),
  ('00000000-0000-4000-e000-000000000332', 'old-town-walk', 'Badshahi Mosque at dawn', 0),
  ('00000000-0000-4000-e000-000000000332', 'museum-gallery', 'Sheesh Mahal', 1),
  ('00000000-0000-4000-e000-000000000333', 'museum-gallery', 'Painted kettles', 0),
  ('00000000-0000-4000-e000-000000000333', 'family-cooking', 'Workshop table', 1),
  ('00000000-0000-4000-e000-000000000334', 'street-drinks', 'Rickshaw by Delhi Gate', 0),
  ('00000000-0000-4000-e000-000000000335', 'kids-adventure', 'Kites drying on a rooftop', 0),
  ('00000000-0000-4000-e000-000000000337', 'museum-gallery', 'Gandhara gallery', 0)
) as v(listing, photo, alt, n);

insert into public.listing_staff (business_id, listing_id, staff_id) values
  ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-e000-000000000331', '00000000-0000-4000-d000-000000000031'),
  ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-e000-000000000332', '00000000-0000-4000-d000-000000000031'),
  ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-e000-000000000333', '00000000-0000-4000-d000-000000000032'),
  ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-e000-000000000334', '00000000-0000-4000-d000-000000000031')
on conflict do nothing;

-- Content the consumer app shows on Experience details: reasons, what to bring,
-- itinerary and at least six photos per published experience.
update public.listings l set highlights = v.highlights::text[], what_to_bring = v.bring::text[]
from (values
  ('00000000-0000-4000-e000-000000000331', '{"Twelve stops, all tasted","Vegetarian options at every stop","Small groups of 12 max"}', '{"Comfortable shoes","An empty stomach","Cash for extra snacks"}'),
  ('00000000-0000-4000-e000-000000000332', '{"Badshahi Mosque before the crowds","Sheesh Mahal inside the Fort","Halwa puri breakfast"}', '{"A shawl for the dawn chill","Modest clothing","Camera"}'),
  ('00000000-0000-4000-e000-000000000333', '{"Take home what you paint","All materials included","Led by a working truck artist"}', '{"Clothes you can get paint on"}'),
  ('00000000-0000-4000-e000-000000000334', '{"Private rickshaw for your group","Wazir Khan Mosque stop","Chai in a 200-year-old haveli"}', '{"Sunglasses","Small change for tips"}'),
  ('00000000-0000-4000-e000-000000000335', '{"Build your own guddi kite"}', '{}')
) as v(id, highlights, bring)
where l.id = v.id::uuid;

insert into public.listing_itinerary_steps (business_id, listing_id, position, title, description, duration_minutes)
select '00000000-0000-4000-b000-000000000031', v.listing::uuid, v.pos, v.title, v.description, v.mins
from (values
  ('00000000-0000-4000-e000-000000000331', 0, 'Delhi Gate', 'Chana and kulcha under the old arch.', 25),
  ('00000000-0000-4000-e000-000000000331', 1, 'Shahi Guzargah', 'Fried fish, seekh kebabs and tikka along the royal route.', 70),
  ('00000000-0000-4000-e000-000000000331', 2, 'Wazir Khan Chowk', 'Sweets and a look at the mosque tiles by lamplight.', 40),
  ('00000000-0000-4000-e000-000000000331', 3, 'Gawalmandi', 'Doodh patti to finish.', 45),
  ('00000000-0000-4000-e000-000000000332', 0, 'Badshahi Mosque', 'Sunrise over the courtyard.', 60),
  ('00000000-0000-4000-e000-000000000332', 1, 'Lahore Fort', 'Alamgiri Gate, Sheesh Mahal and the picture wall.', 90),
  ('00000000-0000-4000-e000-000000000332', 2, 'Fort Road breakfast', 'Halwa puri and chai.', 60),
  ('00000000-0000-4000-e000-000000000333', 0, 'Motifs and colours', 'Peacocks, florals and calligraphy.', 30),
  ('00000000-0000-4000-e000-000000000333', 1, 'Paint your piece', 'Brushwork with Zara.', 120),
  ('00000000-0000-4000-e000-000000000334', 0, 'Thirteen gates loop', 'From Delhi Gate round to Bhati Gate.', 70),
  ('00000000-0000-4000-e000-000000000334', 1, 'Haveli chai', 'A break in a family haveli.', 50)
) as v(listing, pos, title, description, mins);

insert into public.listing_media (business_id, listing_id, url, alt, sort_order)
select '00000000-0000-4000-b000-000000000031', l.id, 'storage://seed-media/listings/' || p.photo || '.jpg', l.title, 10 + p.n
from public.listings l
cross join (values ('old-town-walk', 1), ('museum-gallery', 2), ('food-tasting', 3), ('night-market', 4),
                   ('street-drinks', 5), ('family-cooking', 6)) as p(photo, n)
where l.business_id = '00000000-0000-4000-b000-000000000031' and l.status = 'published';

-- A private-guide service (appointments with Nadia), opening hours, photos and
-- a membership plan, as every business on the consumer business page has.
insert into public.listings (
  id, business_id, type, booking_mode, slug, title, summary, description, category_id, location_id,
  city, duration_minutes, min_guests, max_guests, price_amount, price_unit, instant_book, status, published_at, created_at
) values (
  '00000000-0000-4000-e000-000000000338', '00000000-0000-4000-b000-000000000031', 'service', 'appointment', 'private-heritage-guide',
  'Private Heritage Guide (2 hours)', 'Your own guide for the Walled City, at your pace.',
  'Pick the sights and the pace: Nadia plans a private route around what you want to see.',
  pg_temp.d_cat('tours-walks'), '00000000-0000-4000-c000-000000000031',
  'Lahore', 120, 1, 6, 1200000, 'per_booking', true, 'published', now() - interval '60 days', now() - interval '62 days'
) on conflict (id) do nothing;
insert into public.listing_staff (business_id, listing_id, staff_id) values
  ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-e000-000000000338', '00000000-0000-4000-d000-000000000031')
on conflict do nothing;
insert into public.listing_media (business_id, listing_id, url, alt, sort_order) values
  ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-e000-000000000338', 'storage://seed-media/listings/old-town-walk.jpg', 'Walled City lanes', 0);

insert into public.staff_schedules (business_id, staff_id, location_id, weekday, start_time, end_time)
select '00000000-0000-4000-b000-000000000031', '00000000-0000-4000-d000-000000000031', '00000000-0000-4000-c000-000000000031', d, '09:00', '17:00'
from generate_series(1, 6) d;

insert into public.business_hours (business_id, weekday, opens_at, closes_at)
select '00000000-0000-4000-b000-000000000031', d, '05:30', '22:00' from generate_series(0, 6) d
on conflict do nothing;

insert into public.business_photos (business_id, url, alt, sort_order) values
  ('00000000-0000-4000-b000-000000000031', 'storage://seed-media/listings/old-town-walk.jpg', 'Delhi Gate at dusk', 0),
  ('00000000-0000-4000-b000-000000000031', 'storage://seed-media/listings/night-market.jpg', 'Food street', 1),
  ('00000000-0000-4000-b000-000000000031', 'storage://seed-media/listings/museum-gallery.jpg', 'Truck art kettles', 2);

insert into public.membership_plans (id, business_id, name, description, price_amount, interval, benefits, included_sessions, discount_percent, sort_order)
values ('00000000-0000-4000-8200-000000000031', '00000000-0000-4000-b000-000000000031', 'Old City Insider',
        'One food walk a month and 10% off workshops.', 900000, 'month',
        '{"perks": ["1 food walk a month", "10% off workshops", "Members-only heritage evenings"]}', 1, 10, 1)
on conflict (id) do nothing;

-- Slots for the next 90 days come from these rules (trigger).
insert into public.availability_rules (business_id, listing_id, staff_id, weekdays, start_time, capacity, valid_from) values
  ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-e000-000000000331', '00000000-0000-4000-d000-000000000031', '{1,2,3,4,5,6,7}', '18:00', 12, pg_temp.d_today()),
  ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-e000-000000000332', '00000000-0000-4000-d000-000000000031', '{2,3,4,5,6,7}', '05:45', 15, pg_temp.d_today()),
  ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-e000-000000000333', '00000000-0000-4000-d000-000000000032', '{3,6,7}', '11:00', 8, pg_temp.d_today()),
  ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-e000-000000000334', '00000000-0000-4000-d000-000000000031', '{1,2,3,4,5,6,7}', '10:00', 1, pg_temp.d_today());

-- ---------------------------------------------------------------------------
-- Bookings in every status (past and upcoming)
-- ---------------------------------------------------------------------------
-- (listing, guest, days from today, time, guests, status, created days before start, paid)
create temporary table demo_bookings on commit drop as
select row_number() over () as n, v.*
from (values
  -- today: one in progress, two later today (Ongoing), one ended but not closed yet
  ('31', '21', 0, 'now-1h',  2, 'confirmed', 6, true),
  ('34', '22', 0, 'now+3h',  2, 'confirmed', 3, true),
  ('31', '25', 0, 'now+5h',  3, 'confirmed', 9, true),
  ('32', '26', -1, '05:45',  2, 'confirmed', 10, true),
  -- upcoming confirmed
  ('31', '23', 2, '18:00', 4, 'confirmed', 5, true),
  ('32', '24', 3, '05:45', 2, 'confirmed', 7, true),
  ('33', '21', 4, '11:00', 1, 'confirmed', 4, true),
  ('34', '25', 6, '10:00', 3, 'confirmed', 2, false),
  ('31', '26', 9, '18:00', 2, 'confirmed', 1, true),
  ('32', '22', 13, '05:45', 5, 'confirmed', 3, true),
  -- pending (Badshahi needs approval: instant book off)
  ('32', '23', 1, '05:45', 2, 'pending', 1, false),
  ('32', '25', 5, '05:45', 4, 'pending', 0, false),
  ('32', '21', 8, '05:45', 1, 'pending', 0, false),
  ('32', '26', 11, '05:45', 3, 'pending', 0, false),
  -- cancelled
  ('31', '24', -4, '18:00', 2, 'cancelled_by_consumer', 8, false),
  ('33', '22', -10, '11:00', 1, 'cancelled_by_consumer', 5, false),
  ('32', '25', 7, '05:45', 2, 'cancelled_by_consumer', 3, false),
  ('31', '23', -20, '18:00', 6, 'cancelled_by_business', 9, true),
  ('34', '21', 3, '10:00', 2, 'cancelled_by_business', 4, true),
  -- past no-shows
  ('31', '26', -15, '18:00', 2, 'no_show', 6, true),
  ('33', '24', -30, '11:00', 1, 'no_show', 10, true)
) as v(listing, guest, day_offset, at_time, guests, status, lead_days, paid);

-- Completed: ~3 a week over the last 5 months, on every published listing.
insert into demo_bookings (n, listing, guest, day_offset, at_time, guests, status, lead_days, paid)
select 100 + g,
       (array['31', '32', '33', '31', '34', '31', '32'])[1 + g % 7],
       (array['21', '22', '23', '24', '25', '26'])[1 + g % 6],
       -(2 + g * 2 + (g % 3)),
       (array['18:00', '05:45', '11:00', '18:00', '10:00', '18:00', '05:45'])[1 + g % 7],
       1 + g % 4,
       'completed', 3 + g % 9, g % 5 <> 0
from generate_series(0, 70) g
where -(2 + g * 2 + (g % 3)) >= -150;

insert into public.bookings (
  id, business_id, consumer_id, listing_id, slot_id, staff_id, location_id, starts_at, ends_at, guest_count, status,
  payment_status, contact_name, contact_phone, contact_email, notes, subtotal_amount, discount_amount, fee_amount,
  tax_amount, total_amount, source, cancellation_reason, created_at
)
select
  ('00000000-0000-4000-8300-' || lpad(d.n::text, 12, '0'))::uuid,
  l.business_id,
  ('00000000-0000-4000-a000-0000000000' || d.guest)::uuid,
  l.id,
  s.id,
  ls.staff_id,
  l.location_id,
  t.starts_at,
  t.starts_at + make_interval(mins => l.duration_minutes),
  case when l.price_unit = 'per_booking' then least(d.guests, l.max_guests) else d.guests end,
  d.status::public.booking_status,
  case when d.paid and d.status in ('cancelled_by_business') then 'refunded'
       when d.paid then 'paid' else 'unpaid' end::public.booking_payment_status,
  pr.display_name,
  '+9230000000' || d.guest,
  case d.guest when '21' then 'hamza' when '22' then 'fatima' when '23' then 'bilal' when '24' then 'zainab'
               when '25' then 'usman' else 'sana' end || '@moment.test',
  case when d.n % 4 = 0 then 'Celebrating a birthday, a small surprise would be lovely!'
       when d.n % 4 = 1 then 'One of us is vegetarian.'
       else null end,
  p.subtotal, 0, 15000, round(p.subtotal * 0.16)::integer, p.subtotal + 15000 + round(p.subtotal * 0.16)::integer,
  'app',
  case d.status when 'cancelled_by_business' then 'The Fort closed for a state event that day.'
                when 'cancelled_by_consumer' then 'Change of plans, sorry!' end,
  least(t.starts_at - make_interval(days => d.lead_days), now() - make_interval(hours => 2 + (d.n % 20)::int))
from demo_bookings d
join public.listings l on l.id = ('00000000-0000-4000-e000-0000000003' || d.listing)::uuid
join public.profiles pr on pr.id = ('00000000-0000-4000-a000-0000000000' || d.guest)::uuid
left join public.listing_staff ls on ls.listing_id = l.id
cross join lateral (
  select case
    when d.at_time = 'now-1h' then date_trunc('minute', now()) - interval '1 hour'
    when d.at_time = 'now+3h' then date_trunc('hour', now()) + interval '3 hours'
    when d.at_time = 'now+5h' then date_trunc('hour', now()) + interval '5 hours'
    else pg_temp.d_pk(pg_temp.d_today() + d.day_offset, d.at_time::time)
  end as starts_at
) t
cross join lateral (
  select case when l.price_unit = 'per_booking' then l.price_amount else l.price_amount * d.guests end as subtotal
) p
left join public.slots s on s.listing_id = l.id and s.starts_at = t.starts_at
on conflict (id) do nothing;

insert into public.booking_items (business_id, booking_id, option_id, name, quantity, unit_amount, total_amount)
select b.business_id, b.id, o.id, o.name, b.guest_count, o.price_amount, o.price_amount * b.guest_count
from public.bookings b
join lateral (
  select * from public.listing_options o where o.listing_id = b.listing_id order by o.sort_order limit 1
) o on true
where b.business_id = '00000000-0000-4000-b000-000000000031';

-- Status history that matches the dates (the insert trigger stamped now()).
delete from public.booking_events where business_id = '00000000-0000-4000-b000-000000000031';
insert into public.booking_events (business_id, booking_id, actor_id, from_status, to_status, note, created_at)
select b.business_id, b.id, b.consumer_id, null::public.booking_status, 'pending'::public.booking_status, null, b.created_at
from public.bookings b where b.business_id = '00000000-0000-4000-b000-000000000031'
union all
select b.business_id, b.id, '00000000-0000-4000-a000-000000000031'::uuid, 'pending'::public.booking_status, 'confirmed'::public.booking_status, null,
       least(b.created_at + interval '2 hours', b.starts_at)
from public.bookings b where b.business_id = '00000000-0000-4000-b000-000000000031'
  and b.status in ('confirmed', 'completed', 'no_show', 'cancelled_by_business')
union all
select b.business_id, b.id, '00000000-0000-4000-a000-000000000031'::uuid, 'confirmed'::public.booking_status, b.status, null, b.ends_at + interval '1 hour'
from public.bookings b where b.business_id = '00000000-0000-4000-b000-000000000031' and b.status in ('completed', 'no_show')
union all
select b.business_id, b.id, '00000000-0000-4000-a000-000000000031'::uuid, 'confirmed'::public.booking_status, b.status, b.cancellation_reason,
       least(b.created_at + interval '1 day', b.starts_at - interval '1 day')
from public.bookings b where b.business_id = '00000000-0000-4000-b000-000000000031' and b.status = 'cancelled_by_business'
union all
select b.business_id, b.id, b.consumer_id, 'pending'::public.booking_status, b.status, b.cancellation_reason,
       least(b.created_at + interval '1 day', b.starts_at - interval '6 hours')
from public.bookings b where b.business_id = '00000000-0000-4000-b000-000000000031' and b.status = 'cancelled_by_consumer';

update public.bookings b
set confirmed_at = least(b.created_at + interval '2 hours', b.starts_at),
    completed_at = case when b.status = 'completed' then b.ends_at + interval '1 hour' end,
    cancelled_at = case when b.status in ('cancelled_by_consumer', 'cancelled_by_business')
                        then least(b.created_at + interval '1 day', b.starts_at - interval '6 hours') end,
    cancelled_by = case b.status when 'cancelled_by_consumer' then b.consumer_id
                                 when 'cancelled_by_business' then '00000000-0000-4000-a000-000000000031' end
where b.business_id = '00000000-0000-4000-b000-000000000031';

-- Payments for paid bookings (Moment collects; provider is the test mock).
insert into public.payments (business_id, booking_id, payer_id, amount, platform_fee_amount, collected_by, provider,
  provider_transaction_ref, method, method_summary, status, paid_at, created_at)
select b.business_id, b.id, b.consumer_id, b.total_amount, round(b.total_amount * 0.1)::integer, 'platform_collect', 'test',
       'demo-' || b.code, case when b.guest_count % 2 = 0 then 'jazzcash' else 'card' end,
       case when b.guest_count % 2 = 0 then 'JazzCash 0300 ***4567' else 'Visa **** 4242' end,
       'succeeded', b.created_at + interval '5 minutes', b.created_at + interval '5 minutes'
from public.bookings b
where b.business_id = '00000000-0000-4000-b000-000000000031' and b.payment_status in ('paid', 'refunded');

insert into public.refunds (business_id, payment_id, amount, reason, status, processed_at, created_at)
select p.business_id, p.id, p.amount, 'Cancelled by the business', 'succeeded', b.cancelled_at, b.cancelled_at
from public.payments p join public.bookings b on b.id = p.booking_id
where b.business_id = '00000000-0000-4000-b000-000000000031' and b.status = 'cancelled_by_business';

-- One payout already made, so the wallet shows what is still owed.
insert into public.payouts (business_id, amount, period_start, period_end, status, provider, paid_at, created_at)
values ('00000000-0000-4000-b000-000000000031', 25000000, pg_temp.d_today() - 60, pg_temp.d_today() - 31, 'paid', 'test',
        now() - interval '28 days', now() - interval '29 days');

-- ---------------------------------------------------------------------------
-- Reviews (some with photos and replies)
-- ---------------------------------------------------------------------------
insert into public.reviews (booking_id, author_id, rating, body, photos, business_reply, replied_at, replied_by, created_at)
select b.id, b.consumer_id, r.rating, r.body, r.photos,
       case when r.reply then 'Shukriya! It was lovely having you, come back again soon.' end,
       case when r.reply then b.ends_at + interval '2 days' end,
       case when r.reply then '00000000-0000-4000-a000-000000000031'::uuid end,
       b.ends_at + interval '1 day'
from (
  select b.*, row_number() over (partition by b.listing_id order by b.starts_at desc) as k
  from public.bookings b
  where b.business_id = '00000000-0000-4000-b000-000000000031' and b.status = 'completed'
) b
join (values
  ('331', 1, 5, 'Nadia knew every stall owner by name. The fried fish and the final doodh patti were the highlights. Come hungry!',
   '{storage://seed-media/listings/food-tasting.jpg,storage://seed-media/listings/night-market.jpg,storage://seed-media/listings/street-drinks.jpg}'::text[], false),
  ('331', 2, 5, 'Best evening of our Lahore trip. Small group, lots of stories, and the vegetarian options were thoughtful.', '{}', true),
  ('331', 3, 3, 'Food was great but the group was larger than I expected and it was hard to hear the guide.', '{}', false),
  ('331', 4, 2, 'We waited 25 minutes at Delhi Gate before the walk started.', '{}', false),
  ('331', 5, 5, 'Fantastic food, and Nadia made sure everyone was comfortable.', '{storage://seed-media/listings/family-cooking.jpg}', true),
  ('332', 1, 5, 'The mosque at sunrise was unreal, pink marble and no crowds. Breakfast on Fort Road was the cherry on top.', '{}', true),
  ('332', 2, 4, 'Early start but worth it. Bring a shawl, it is chilly at dawn.', '{}', false),
  ('332', 3, 5, 'Worth every rupee. Already recommended it to friends visiting from Karachi.', '{storage://seed-media/listings/old-town-walk.jpg}', false),
  ('333', 1, 4, 'Great workshop, my kettle now lives on the kitchen shelf. Ran a little over time but nobody minded.',
   '{storage://seed-media/listings/museum-gallery.jpg}', false),
  ('333', 2, 5, 'Zara is a patient teacher. Even my 10 year old painted a proper peacock.', '{}', true),
  ('334', 1, 5, 'Rickshaw ride through the gates with chai at a 200-year-old haveli. Felt like time travel.',
   '{storage://seed-media/listings/old-town-walk.jpg,storage://seed-media/listings/kids-adventure.jpg}', false),
  ('334', 2, 4, 'Loved the stories about the havelis. Wish it was a bit longer.', '{}', false)
) as r(listing, k, rating, body, photos, reply)
  on b.listing_id = ('00000000-0000-4000-e000-000000000' || r.listing)::uuid and r.k = b.k
on conflict (booking_id) do nothing;

-- ---------------------------------------------------------------------------
-- Chats (shared business inbox); the newest guest messages are unread
-- ---------------------------------------------------------------------------
insert into public.conversations (id, type, business_id, booking_id, created_by, created_at)
select ('00000000-0000-4000-6300-00000000000' || v.n)::uuid, 'business', '00000000-0000-4000-b000-000000000031',
       (select b.id from public.bookings b
        where b.business_id = '00000000-0000-4000-b000-000000000031'
          and b.consumer_id = ('00000000-0000-4000-a000-0000000000' || v.guest)::uuid and b.status = v.status::public.booking_status
        order by b.starts_at limit 1),
       ('00000000-0000-4000-a000-0000000000' || v.guest)::uuid, now() - v.ago::interval
from (values
  (1, '21', 'confirmed', '3 days'),
  (2, '23', 'pending', '2 days'),
  (3, '25', 'confirmed', '6 days'),
  (4, '24', 'completed', '20 days'),
  (5, '26', 'confirmed', '12 days')
) as v(n, guest, status, ago)
on conflict (id) do nothing;

insert into public.conversation_participants (conversation_id, user_id)
select c.id, c.created_by from public.conversations c
where c.business_id = '00000000-0000-4000-b000-000000000031'
on conflict do nothing;

insert into public.messages (conversation_id, sender_id, sender_business_id, body, created_at)
select ('00000000-0000-4000-6300-00000000000' || v.conv)::uuid,
       case when v.from_business then '00000000-0000-4000-a000-000000000031'::uuid
            else (select c.created_by from public.conversations c where c.id = ('00000000-0000-4000-6300-00000000000' || v.conv)::uuid) end,
       case when v.from_business then '00000000-0000-4000-b000-000000000031'::uuid end,
       v.body, now() - v.ago::interval
from (values
  (1, false, 'Assalam o alaikum! Is the food walk okay for my 70 year old father? He walks slowly.', '3 days'),
  (1, true, 'Walaikum assalam Hamza! Absolutely, it is about 2 km with lots of stops. We will keep a gentle pace.', '71 hours'),
  (1, false, 'Thank you! Also, can we skip the spicy stops?', '50 minutes'),
  (1, false, 'And is there parking near Delhi Gate?', '45 minutes'),
  (2, false, 'Hi, I sent a booking request for the sunrise tour. Could you confirm soon? We fly back on Sunday.', '2 days'),
  (2, false, 'Just checking in on this.', '3 hours'),
  (2, false, 'Also, what should I bring?', '2 hours'),
  (2, false, 'Is it okay to bring a camera inside the mosque?', '1 hour'),
  (2, false, 'Thanks!', '58 minutes'),
  (3, false, 'We are three people for tonight, all good?', '6 days'),
  (3, true, 'Yes Usman, see you at 6 under Delhi Gate!', '6 days'),
  (4, false, 'Thank you for the lovely workshop, the kettle made it home safe.', '19 days'),
  (4, true, 'So happy to hear that Zainab! Tag us when you use it.', '19 days'),
  (5, false, 'Can we move our booking 30 minutes later?', '12 days'),
  (5, true, 'Of course, I have noted it. See you then!', '12 days')
) as v(conv, from_business, body, ago);

-- The owner has read everything except the newest guest messages.
insert into public.conversation_participants (conversation_id, user_id, last_read_at)
select c.id, '00000000-0000-4000-a000-000000000031', now() - interval '4 days'
from public.conversations c where c.business_id = '00000000-0000-4000-b000-000000000031'
on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;
update public.conversation_participants p set last_read_at = now() - interval '70 hours'
where p.user_id = '00000000-0000-4000-a000-000000000031' and p.conversation_id = '00000000-0000-4000-6300-000000000001';
update public.conversation_participants p set last_read_at = now()
where p.user_id = '00000000-0000-4000-a000-000000000031'
  and p.conversation_id in ('00000000-0000-4000-6300-000000000003', '00000000-0000-4000-6300-000000000004',
                            '00000000-0000-4000-6300-000000000005');

-- ---------------------------------------------------------------------------
-- Views over the last year (more recently, and more for the food walk)
-- ---------------------------------------------------------------------------
insert into public.listing_views (business_id, listing_id, viewer_id, session_key, source, viewed_at)
select '00000000-0000-4000-b000-000000000031',
       case when r < 0.45 then '00000000-0000-4000-e000-000000000331'::uuid
            when r < 0.70 then '00000000-0000-4000-e000-000000000332'::uuid
            when r < 0.85 then '00000000-0000-4000-e000-000000000333'::uuid
            when r < 0.95 then '00000000-0000-4000-e000-000000000334'::uuid
            else null end,
       null, 'demo-session-' || g, 'app',
       now() - make_interval(secs => (power(random(), 1.6) * 365 * 86400)::integer)
from (select g, random() as r from generate_series(1, 4200) g) x;

-- A blocked evening on the food walk (Listing Details > Availability).
insert into public.availability_exceptions (business_id, scope, listing_id, starts_at, ends_at, reason, created_by)
values ('00000000-0000-4000-b000-000000000031', 'listing', '00000000-0000-4000-e000-000000000331',
        pg_temp.d_pk(pg_temp.d_today() + 16, '00:00'), pg_temp.d_pk(pg_temp.d_today() + 17, '00:00'),
        'Private event', '00000000-0000-4000-a000-000000000031');
