-- Local development seed. Runs after migrations on `supabase db reset`.
-- Every account: password123. Businesses and people are fictional.
-- Dates are relative to now() so the data never goes stale.
-- Money is in minor units: PKR 4,500 = 450000.

-- ---------------------------------------------------------------------------
-- Helpers (session-only)
-- ---------------------------------------------------------------------------
create function pg_temp.seed_user(p_id uuid, p_email text, p_name text, p_phone text)
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
  );
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), p_id, p_id::text, 'email',
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
    now(), now(), now()
  );
end;
$$;

-- Run RPCs as a given user (auth.uid() reads these claims).
create function pg_temp.act_as(p_uid uuid)
returns text
language sql
as $$
  select set_config(
    'request.jwt.claims',
    case when p_uid is null then '' else json_build_object('sub', p_uid, 'role', 'authenticated')::text end,
    false
  );
$$;

create function pg_temp.today() returns date language sql as $$
  select (now() at time zone 'Asia/Karachi')::date;
$$;

-- Local Pakistan time -> timestamptz
create function pg_temp.pk(p_date date, p_time time) returns timestamptz language sql as $$
  select (p_date + p_time) at time zone 'Asia/Karachi';
$$;

-- Monday of next week (local)
create function pg_temp.next_monday() returns date language sql as $$
  select (date_trunc('week', now() at time zone 'Asia/Karachi')::date + 7);
$$;

create function pg_temp.pt(p_lat double precision, p_lng double precision)
returns extensions.geography language sql as $$
  select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
$$;

create function pg_temp.cat(p_slug text) returns uuid language sql as $$
  select id from public.categories where slug = p_slug;
$$;

create function pg_temp.next_slot(p_listing uuid, p_after interval) returns uuid language sql as $$
  select id from public.slots
  where listing_id = p_listing and status = 'open' and starts_at > now() + p_after
  order by starts_at limit 1;
$$;

-- Pick quiz answers by position: element i = answer number for question i.
create function pg_temp.quiz_picks(p_positions int[]) returns uuid[] language sql as $$
  select array_agg(a.id order by q.sort_order)
  from public.quiz_questions q
  join public.quiz_answers a on a.question_id = q.id and a.sort_order = p_positions[q.sort_order];
$$;

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
select pg_temp.seed_user('00000000-0000-4000-a000-000000000001', 'admin@moment.test',          'Moment Admin',     '+923000000001');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000002', 'owner.margalla@moment.test', 'Omar Farooq',      '+923000000002');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000003', 'owner.saffron@moment.test',  'Sara Malik',       '+923000000003');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000004', 'manager.saffron@moment.test','Hassan Javed',     '+923000000004');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000005', 'staff.saffron@moment.test',  'Mehwish Akhtar',   '+923000000005');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000006', 'owner.androon@moment.test',  'Tariq Mehmood',    '+923000000006');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000007', 'staff.androon@moment.test',  'Usama Tariq',      '+923000000007');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000008', 'ayesha@moment.test',         'Ayesha Siddiqui',  '+923000000008');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000009', 'owner.glow@moment.test',     'Amna Sheikh',      '+923000000009');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000010', 'owner.coastal@moment.test',  'Kamran Baloch',    '+923000000010');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000011', 'owner.barber@moment.test',   'Imran Qureshi',    '+923000000011');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000012', 'owner.hunza@moment.test',    'Karim Hunzai',     '+923000000012');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000021', 'hamza@moment.test',          'Hamza Khan',       '+923000000021');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000022', 'fatima@moment.test',         'Fatima Noor',      '+923000000022');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000023', 'bilal@moment.test',          'Bilal Hussain',    '+923000000023');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000024', 'zainab@moment.test',         'Zainab Rizvi',     '+923000000024');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000025', 'usman@moment.test',          'Usman Ali',        '+923000000025');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000026', 'sana@moment.test',           'Sana Iqbal',       '+923000000026');

insert into public.platform_admins (user_id) values ('00000000-0000-4000-a000-000000000001');

update public.profiles set home_city = 'Lahore'    where id in ('00000000-0000-4000-a000-000000000021', '00000000-0000-4000-a000-000000000026');
update public.profiles set home_city = 'Islamabad' where id in ('00000000-0000-4000-a000-000000000022', '00000000-0000-4000-a000-000000000025');
update public.profiles set home_city = 'Karachi'   where id in ('00000000-0000-4000-a000-000000000023', '00000000-0000-4000-a000-000000000024');

-- ---------------------------------------------------------------------------
-- Platform settings
-- ---------------------------------------------------------------------------
insert into public.platform_settings (key, value, description, is_public) values
  ('payments.default_payout_model', '"platform_collect"', 'Used when a business has no payout_model override. Undecided: placeholder for local dev.', false),
  ('payments.commission_bps', '1000', 'Default platform fee in basis points (1000 = 10%).', false),
  ('payments.enabled_providers', '["jazzcash", "easypaisa", "bank_transfer", "cash"]', 'Providers offered at checkout.', true),
  ('locale.default_currency', '"PKR"', 'Default currency for new businesses.', true),
  ('locale.default_timezone', '"Asia/Karachi"', 'Default timezone for new businesses.', true),
  ('locale.launch_cities', '["Islamabad", "Lahore", "Karachi"]', 'Cities shown in the city picker.', true),
  ('support.contact', '{"email": "support@moment.test", "phone": "+923000000000"}', 'Support contact shown in the app.', true);

-- ---------------------------------------------------------------------------
-- Taxonomy
-- ---------------------------------------------------------------------------
insert into public.categories (slug, name, kind, icon, sort_order) values
  ('tours-walks', 'Tours & Walks', 'experience', 'route-01', 1),
  ('food-drink', 'Food & Drink', 'experience', 'restaurant-01', 2),
  ('outdoor-adventure', 'Outdoor & Adventure', 'experience', 'mountain', 3),
  ('water-activities', 'Water Activities', 'experience', 'sailing-boat-02', 4),
  ('arts-workshops', 'Arts & Workshops', 'experience', 'paint-brush-01', 5),
  ('day-trips', 'Day Trips', 'experience', 'bus-01', 6),
  ('spa-massage', 'Spa & Massage', 'service', 'spa', 10),
  ('hair', 'Hair', 'service', 'hair-dryer', 11),
  ('nails', 'Nails', 'service', 'nail-polish', 12),
  ('grooming', 'Grooming', 'service', 'razor', 13),
  ('skin-care', 'Skin Care', 'service', 'face-id', 14);

insert into public.tags (slug, name) values
  ('adventure', 'Adventure'), ('hiking', 'Hiking'), ('nature', 'Nature'), ('water', 'Water'),
  ('heritage', 'Heritage'), ('history', 'History'), ('culture', 'Culture'), ('food', 'Food'),
  ('street-food', 'Street Food'), ('cooking', 'Cooking'), ('art', 'Art'), ('photography', 'Photography'),
  ('wellness', 'Wellness'), ('beauty', 'Beauty'), ('nightlife', 'Nightlife'), ('family-friendly', 'Family Friendly');

-- ---------------------------------------------------------------------------
-- Businesses (creator becomes owner via trigger)
-- ---------------------------------------------------------------------------
insert into public.businesses (id, slug, name, kind, status, tagline, description, phone, email, created_by, logo_url, cover_url) values
  ('00000000-0000-4000-b000-000000000001', 'margalla-trails', 'Margalla Trails Co.', 'operator', 'active',
   'Guided hikes and lake mornings in Islamabad',
   'Small-group hikes in the Margalla Hills and mornings on Rawal Lake, led by certified local guides.',
   '+923000000102', 'hello@margallatrails.test', '00000000-0000-4000-a000-000000000002',
   'https://picsum.photos/seed/margalla-logo/200/200', 'https://picsum.photos/seed/margalla-cover/1200/600'),
  ('00000000-0000-4000-b000-000000000002', 'saffron-spa', 'Saffron Spa & Wellness', 'venue', 'active',
   'Calm in the heart of F-7',
   'Massages, hammam rituals and facials by trained therapists. Separate suites for women and men.',
   '+923000000103', 'book@saffronspa.test', '00000000-0000-4000-a000-000000000003',
   'https://picsum.photos/seed/saffron-logo/200/200', 'https://picsum.photos/seed/saffron-cover/1200/600'),
  ('00000000-0000-4000-b000-000000000003', 'androon-walks', 'Androon Walks', 'operator', 'active',
   'Lahore''s Walled City, one street at a time',
   'Food walks, heritage tours and workshops inside and around the Walled City of Lahore.',
   '+923000000106', 'salaam@androonwalks.test', '00000000-0000-4000-a000-000000000006',
   'https://picsum.photos/seed/androon-logo/200/200', 'https://picsum.photos/seed/androon-cover/1200/600'),
  ('00000000-0000-4000-b000-000000000004', 'ayeshas-lahori-kitchen', 'Ayesha''s Lahori Kitchen', 'host', 'active',
   'Cook Lahori classics in a family kitchen',
   'Hands-on cooking classes at home in Model Town, ending with a shared meal.',
   '+923000000008', 'ayesha@moment.test', '00000000-0000-4000-a000-000000000008',
   'https://picsum.photos/seed/ayesha-logo/200/200', 'https://picsum.photos/seed/ayesha-cover/1200/600'),
  ('00000000-0000-4000-b000-000000000005', 'gulberg-glow', 'Gulberg Glow Salon', 'venue', 'active',
   'Hair, nails and treatments on MM Alam Road',
   'A women''s salon for cuts, colour, keratin and nail care.',
   '+923000000109', 'hello@gulbergglow.test', '00000000-0000-4000-a000-000000000009',
   'https://picsum.photos/seed/glow-logo/200/200', 'https://picsum.photos/seed/glow-cover/1200/600'),
  ('00000000-0000-4000-b000-000000000006', 'karachi-coastal', 'Karachi Coastal Co.', 'operator', 'active',
   'Mangroves, islands and Burns Road nights',
   'Kayaking, snorkelling trips and food crawls along Karachi''s coast and old city.',
   '+923000000110', 'ahoy@karachicoastal.test', '00000000-0000-4000-a000-000000000010',
   'https://picsum.photos/seed/coastal-logo/200/200', 'https://picsum.photos/seed/coastal-cover/1200/600'),
  ('00000000-0000-4000-b000-000000000007', 'clifton-barber', 'The Clifton Barber', 'venue', 'active',
   'Classic cuts and hot-towel shaves',
   'A neighbourhood barbershop in DHA for haircuts, beard work and facials.',
   '+923000000111', 'chair@cliftonbarber.test', '00000000-0000-4000-a000-000000000011',
   'https://picsum.photos/seed/barber-logo/200/200', 'https://picsum.photos/seed/barber-cover/1200/600'),
  ('00000000-0000-4000-b000-000000000008', 'hunza-heights', 'Hunza Heights Tours', 'operator', 'pending_review',
   'Treks and valley tours in Hunza',
   'Multi-day treks and cultural tours across Hunza and Nagar.',
   '+923000000112', 'info@hunzaheights.test', '00000000-0000-4000-a000-000000000012',
   null, null);

update public.business_private set
  legal_name = v.legal_name, tax_id = v.tax_id, contact_name = v.contact_name,
  contact_phone = v.contact_phone, payout_model = v.payout_model::public.payout_model, verified_at = v.verified_at
from (values
  ('00000000-0000-4000-b000-000000000001'::uuid, 'Margalla Trails (Pvt) Ltd', '1234567-1', 'Omar Farooq', '+923000000002', null, now() - interval '60 days'),
  ('00000000-0000-4000-b000-000000000002'::uuid, 'Saffron Wellness (Pvt) Ltd', '2345678-2', 'Sara Malik', '+923000000003', null, now() - interval '90 days'),
  ('00000000-0000-4000-b000-000000000003'::uuid, 'Androon Walks', '3456789-3', 'Tariq Mehmood', '+923000000006', 'platform_collect', now() - interval '120 days'),
  ('00000000-0000-4000-b000-000000000004'::uuid, 'Ayesha Siddiqui', null, 'Ayesha Siddiqui', '+923000000008', null, now() - interval '30 days'),
  ('00000000-0000-4000-b000-000000000005'::uuid, 'Gulberg Glow', '4567890-4', 'Amna Sheikh', '+923000000009', 'direct', now() - interval '45 days'),
  ('00000000-0000-4000-b000-000000000006'::uuid, 'Karachi Coastal Co.', '5678901-5', 'Kamran Baloch', '+923000000010', null, now() - interval '75 days'),
  ('00000000-0000-4000-b000-000000000007'::uuid, 'The Clifton Barber', '6789012-6', 'Imran Qureshi', '+923000000011', 'direct', now() - interval '20 days'),
  ('00000000-0000-4000-b000-000000000008'::uuid, 'Hunza Heights Tours', null, 'Karim Hunzai', '+923000000012', null, null)
) as v(business_id, legal_name, tax_id, contact_name, contact_phone, payout_model, verified_at)
where business_private.business_id = v.business_id;

-- Managers and staff with logins
insert into public.business_members (business_id, user_id, role, status, invited_by) values
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000004', 'manager', 'active', '00000000-0000-4000-a000-000000000003'),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000005', 'staff', 'active', '00000000-0000-4000-a000-000000000003'),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000007', 'staff', 'active', '00000000-0000-4000-a000-000000000006');

-- ---------------------------------------------------------------------------
-- Locations
-- ---------------------------------------------------------------------------
insert into public.business_locations (id, business_id, name, address_line1, area, city, province, postal_code, geo, is_primary) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', 'Trail 3 trailhead', 'Trail 3 parking, Margalla Road', 'F-6', 'Islamabad', 'Islamabad Capital Territory', '44000', pg_temp.pt(33.7386, 73.0747), true),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000001', 'Rawal Lake jetty', 'Lake View Park', 'Rawal Town', 'Islamabad', 'Islamabad Capital Territory', '44000', pg_temp.pt(33.7023, 73.1263), false),
  ('00000000-0000-4000-c000-000000000003', '00000000-0000-4000-b000-000000000002', 'Saffron Spa F-7', 'Plot 12, Jinnah Super Market', 'F-7 Markaz', 'Islamabad', 'Islamabad Capital Territory', '44000', pg_temp.pt(33.7208, 73.0563), true),
  ('00000000-0000-4000-c000-000000000004', '00000000-0000-4000-b000-000000000003', 'Delhi Gate meeting point', 'Delhi Gate, Walled City', 'Androon Shehar', 'Lahore', 'Punjab', '54000', pg_temp.pt(31.5822, 74.3204), true),
  ('00000000-0000-4000-c000-000000000005', '00000000-0000-4000-b000-000000000004', 'Ayesha''s kitchen', 'House 45, Block C', 'Model Town', 'Lahore', 'Punjab', '54700', pg_temp.pt(31.4834, 74.3262), true),
  ('00000000-0000-4000-c000-000000000006', '00000000-0000-4000-b000-000000000005', 'Gulberg Glow MM Alam', '88-B, MM Alam Road', 'Gulberg III', 'Lahore', 'Punjab', '54660', pg_temp.pt(31.5136, 74.3504), true),
  ('00000000-0000-4000-c000-000000000007', '00000000-0000-4000-b000-000000000006', 'Sandspit base', 'Sandspit Beach Road', 'Kiamari', 'Karachi', 'Sindh', '75620', pg_temp.pt(24.8414, 66.9177), true),
  ('00000000-0000-4000-c000-000000000008', '00000000-0000-4000-b000-000000000006', 'Burns Road meeting point', 'Burns Road, near Fresco Chowk', 'Saddar', 'Karachi', 'Sindh', '74200', pg_temp.pt(24.8556, 67.0148), false),
  ('00000000-0000-4000-c000-000000000009', '00000000-0000-4000-b000-000000000007', 'The Clifton Barber DHA', 'Shop 7, Khayaban-e-Ittehad', 'DHA Phase 6', 'Karachi', 'Sindh', '75500', pg_temp.pt(24.8012, 67.0598), true),
  ('00000000-0000-4000-c000-000000000010', '00000000-0000-4000-b000-000000000008', 'Karimabad office', 'Main Bazaar', 'Karimabad', 'Hunza', 'Gilgit-Baltistan', '15700', pg_temp.pt(36.3167, 74.6667), true);

-- ---------------------------------------------------------------------------
-- Staff and hosts
-- ---------------------------------------------------------------------------
insert into public.staff_members (id, business_id, user_id, display_name, title, bio, languages, is_host, is_bookable, avatar_url) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000005', 'Mehwish Akhtar', 'Senior therapist', 'Eight years in Swedish and deep tissue massage.', '{en,ur}', false, true, 'https://picsum.photos/seed/mehwish/300/300'),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-b000-000000000002', null, 'Rabia Kanwal', 'Therapist', 'Hammam and facial specialist.', '{ur,en}', false, true, 'https://picsum.photos/seed/rabia/300/300'),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-b000-000000000002', null, 'Kashif Rana', 'Therapist', 'Sports and deep tissue massage for men.', '{ur,en,pa}', false, true, 'https://picsum.photos/seed/kashif/300/300'),
  ('00000000-0000-4000-d000-000000000004', '00000000-0000-4000-b000-000000000001', null, 'Faraz Khan', 'Lead trail guide', 'Has walked every Margalla trail in every season. Wilderness first-aid certified.', '{en,ur}', true, false, 'https://picsum.photos/seed/faraz/300/300'),
  ('00000000-0000-4000-d000-000000000005', '00000000-0000-4000-b000-000000000001', null, 'Hira Abbasi', 'Guide', 'Architecture student who loves Islamabad''s golden hour.', '{en,ur}', true, false, 'https://picsum.photos/seed/hira/300/300'),
  ('00000000-0000-4000-d000-000000000006', '00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000007', 'Usama Tariq', 'Food walk host', 'Grew up above a Gawalmandi sweet shop. Knows every tikka stall by name.', '{ur,en,pa}', true, false, 'https://picsum.photos/seed/usama/300/300'),
  ('00000000-0000-4000-d000-000000000007', '00000000-0000-4000-b000-000000000003', null, 'Nadia Butt', 'Heritage guide', 'Historian of Mughal Lahore and truck-art enthusiast.', '{en,ur}', true, false, 'https://picsum.photos/seed/nadia/300/300'),
  ('00000000-0000-4000-d000-000000000008', '00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000008', 'Ayesha Siddiqui', 'Home cook and host', 'Three generations of Lahori recipes, taught in my own kitchen.', '{ur,en}', true, false, 'https://picsum.photos/seed/ayesha/300/300'),
  ('00000000-0000-4000-d000-000000000009', '00000000-0000-4000-b000-000000000005', null, 'Sadia Pervaiz', 'Senior stylist', 'Cuts, colour and keratin.', '{ur,en}', false, true, 'https://picsum.photos/seed/sadia/300/300'),
  ('00000000-0000-4000-d000-000000000010', '00000000-0000-4000-b000-000000000005', null, 'Iqra Shah', 'Nail technician', 'Gel, acrylic and nail art.', '{ur,en}', false, true, 'https://picsum.photos/seed/iqra/300/300'),
  ('00000000-0000-4000-d000-000000000011', '00000000-0000-4000-b000-000000000006', '00000000-0000-4000-a000-000000000010', 'Kamran Baloch', 'Founder and kayak guide', 'Paddling Karachi''s mangroves since 2012.', '{ur,en,bal}', true, false, 'https://picsum.photos/seed/kamran/300/300'),
  ('00000000-0000-4000-d000-000000000012', '00000000-0000-4000-b000-000000000006', null, 'Shehzad Ali', 'Dive master', 'PADI dive master running Churna Island trips.', '{ur,en}', true, false, 'https://picsum.photos/seed/shehzad/300/300'),
  ('00000000-0000-4000-d000-000000000013', '00000000-0000-4000-b000-000000000007', '00000000-0000-4000-a000-000000000011', 'Imran Qureshi', 'Master barber', 'Twenty years behind the chair.', '{ur,en}', false, true, 'https://picsum.photos/seed/imran/300/300'),
  ('00000000-0000-4000-d000-000000000014', '00000000-0000-4000-b000-000000000007', null, 'Danish Iqbal', 'Barber', 'Fades and beard sculpting.', '{ur,en}', false, true, 'https://picsum.photos/seed/danish/300/300'),
  ('00000000-0000-4000-d000-000000000015', '00000000-0000-4000-b000-000000000008', '00000000-0000-4000-a000-000000000012', 'Karim Hunzai', 'Trek leader', 'Born in Karimabad, guiding since 2008.', '{bsk,ur,en}', true, false, null);

-- Weekly hours for bookable staff. Friday starts after Jummah.
insert into public.staff_schedules (business_id, staff_id, location_id, weekday, start_time, end_time)
select s.business_id, s.id, l.id, d.weekday, d.start_time, d.end_time
from public.staff_members s
join public.business_locations l on l.business_id = s.business_id and l.is_primary
cross join (values
  (1, '11:00'::time, '20:00'::time), (2, '11:00', '20:00'), (3, '11:00', '20:00'),
  (4, '11:00', '20:00'), (5, '14:30', '21:00'), (6, '11:00', '21:00')
) as d(weekday, start_time, end_time)
where s.is_bookable;

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------
insert into public.listings (
  id, business_id, type, booking_mode, slug, title, summary, description, category_id, location_id,
  meeting_point, city, duration_minutes, min_guests, max_guests, price_amount, price_unit,
  instant_book, cancellation_policy, languages, includes, excludes, status
) values
  -- Margalla Trails Co. (Islamabad)
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-b000-000000000001', 'experience', 'slot', 'margalla-sunrise-hike',
   'Margalla Sunrise Hike on Trail 3', 'Watch the sun rise over Islamabad from the ridge above Trail 3.',
   'A steady climb up Trail 3 in the cool pre-dawn, reaching the ridge as the city lights fade. Chai and parathas at the top, then down by 9.',
   pg_temp.cat('outdoor-adventure'), '00000000-0000-4000-c000-000000000001', pg_temp.pt(33.7386, 73.0747), 'Islamabad',
   180, 1, 12, 300000, 'per_person', true, 'flexible', '{en,ur}', '{Guide,Chai and breakfast,Headlamp}', '{Transport}', 'published'),
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-b000-000000000001', 'experience', 'slot', 'saidpur-faisal-golden-hour',
   'Saidpur Village & Faisal Mosque Golden Hour Walk', 'Old Saidpur''s lanes, then Faisal Mosque at sunset.',
   'Start among the restored Hindu-era homes of Saidpur Village, then drive to Faisal Mosque for golden hour and maghrib.',
   pg_temp.cat('tours-walks'), '00000000-0000-4000-c000-000000000001', pg_temp.pt(33.7445, 73.0640), 'Islamabad',
   150, 1, 10, 250000, 'per_person', true, 'moderate', '{en,ur}', '{Guide,Transport between sites}', '{Meals}', 'published'),
  ('00000000-0000-4000-e000-000000000003', '00000000-0000-4000-b000-000000000001', 'experience', 'slot', 'rawal-lake-kayaking',
   'Rawal Lake Morning Kayaking', 'Paddle calm water with the Margallas behind you.',
   'Beginner-friendly kayaking on Rawal Lake with safety briefing, life jackets and a guide on the water.',
   pg_temp.cat('water-activities'), '00000000-0000-4000-c000-000000000002', pg_temp.pt(33.7023, 73.1263), 'Islamabad',
   120, 1, 8, 450000, 'per_person', true, 'moderate', '{en,ur}', '{Kayak and paddle,Life jacket,Guide}', '{}', 'published'),
  -- Androon Walks (Lahore)
  ('00000000-0000-4000-e000-000000000004', '00000000-0000-4000-b000-000000000003', 'experience', 'slot', 'walled-city-food-walk',
   'Walled City Food Walk: Gawalmandi to Delhi Gate', 'Eight stops, from fried fish to doodh patti.',
   'An evening through Lahore''s oldest food streets: fish, tikka, kulfi, halwa puri and a final cup of doodh patti near Delhi Gate.',
   pg_temp.cat('food-drink'), '00000000-0000-4000-c000-000000000004', pg_temp.pt(31.5822, 74.3204), 'Lahore',
   210, 1, 12, 450000, 'per_person', true, 'moderate', '{ur,en}', '{All food tastings,Bottled water,Host}', '{Hotel pickup}', 'published'),
  ('00000000-0000-4000-e000-000000000005', '00000000-0000-4000-b000-000000000003', 'experience', 'slot', 'badshahi-lahore-fort-tour',
   'Badshahi Mosque & Lahore Fort Heritage Tour', 'Four centuries of Mughal Lahore in one morning.',
   'Walk the Lahore Fort''s Sheesh Mahal and Alamgiri Gate, then Badshahi Mosque and the Hazuri Bagh.',
   pg_temp.cat('tours-walks'), '00000000-0000-4000-c000-000000000004', pg_temp.pt(31.5880, 74.3107), 'Lahore',
   240, 1, 15, 350000, 'per_person', true, 'moderate', '{en,ur}', '{Guide,Entry tickets}', '{Meals}', 'published'),
  ('00000000-0000-4000-e000-000000000006', '00000000-0000-4000-b000-000000000003', 'experience', 'slot', 'wagah-border-ceremony',
   'Wagah Border Ceremony Trip', 'Return transport and reserved seating for the flag-lowering ceremony.',
   'We drive from the Walled City to Wagah for the evening ceremony, with seating arranged in advance. Requests are confirmed by the host.',
   pg_temp.cat('day-trips'), '00000000-0000-4000-c000-000000000004', pg_temp.pt(31.6047, 74.5728), 'Lahore',
   300, 1, 14, 550000, 'per_person', false, 'strict', '{ur,en}', '{Return transport,Host,Water}', '{Food}', 'published'),
  ('00000000-0000-4000-e000-000000000008', '00000000-0000-4000-b000-000000000003', 'experience', 'slot', 'truck-art-workshop',
   'Truck Art Painting Workshop', 'Paint your own panel in Pakistan''s most joyful art form.',
   'Learn the motifs, colours and lettering of truck art from a working artist and take your painted panel home.',
   pg_temp.cat('arts-workshops'), '00000000-0000-4000-c000-000000000004', pg_temp.pt(31.5822, 74.3204), 'Lahore',
   150, 1, 8, 400000, 'per_person', true, 'moderate', '{ur,en}', '{Paints and panel,Chai}', '{}', 'published'),
  -- Ayesha's Lahori Kitchen (Lahore, solo host)
  ('00000000-0000-4000-e000-000000000007', '00000000-0000-4000-b000-000000000004', 'experience', 'slot', 'lahori-home-cooking-class',
   'Lahori Home Cooking Class: Nihari & Roti', 'Cook nihari from scratch, then eat together.',
   'A hands-on class in a family kitchen: spice blends, slow-cooked nihari, tandoori roti and kheer, finished with a shared dinner.',
   pg_temp.cat('food-drink'), '00000000-0000-4000-c000-000000000005', pg_temp.pt(31.4834, 74.3262), 'Lahore',
   180, 1, 6, 750000, 'per_person', true, 'moderate', '{ur,en}', '{Ingredients,Dinner,Recipe cards}', '{}', 'published'),
  -- Karachi Coastal Co. (Karachi)
  ('00000000-0000-4000-e000-000000000009', '00000000-0000-4000-b000-000000000006', 'experience', 'slot', 'sandspit-mangrove-kayaking',
   'Sandspit Mangrove Kayaking', 'Paddle through mangrove channels and spot herons at dawn.',
   'Guided kayaking through the mangrove forests near Sandspit, with a stop to learn about the turtles and birds that live here.',
   pg_temp.cat('water-activities'), '00000000-0000-4000-c000-000000000007', pg_temp.pt(24.8414, 66.9177), 'Karachi',
   150, 1, 10, 650000, 'per_person', true, 'moderate', '{ur,en}', '{Kayak,Life jacket,Guide,Breakfast}', '{Transport}', 'published'),
  ('00000000-0000-4000-e000-000000000010', '00000000-0000-4000-b000-000000000006', 'experience', 'slot', 'churna-island-snorkeling',
   'Churna Island Snorkeling Day Trip', 'Boat out to Churna for snorkelling and cliff jumping.',
   'A full day: boat ride from Mubarak Village, snorkelling over the reef, optional cliff jumping and a fresh fish lunch on board.',
   pg_temp.cat('water-activities'), '00000000-0000-4000-c000-000000000007', pg_temp.pt(24.8750, 66.6720), 'Karachi',
   480, 1, 12, 1200000, 'per_person', true, 'strict', '{ur,en}', '{Boat,Snorkel gear,Lunch,Dive master}', '{Transport to Mubarak Village}', 'published'),
  ('00000000-0000-4000-e000-000000000011', '00000000-0000-4000-b000-000000000006', 'experience', 'slot', 'burns-road-food-crawl',
   'Burns Road Food Crawl', 'Nihari, bun kebab, rabri and more on Karachi''s food street.',
   'Six stops along Burns Road after dark, from nihari and seekh kebab to rabri and paan.',
   pg_temp.cat('food-drink'), '00000000-0000-4000-c000-000000000008', pg_temp.pt(24.8556, 67.0148), 'Karachi',
   150, 1, 12, 350000, 'per_person', true, 'flexible', '{ur,en}', '{All tastings,Host}', '{}', 'published'),
  -- Hunza Heights (pending review, draft)
  ('00000000-0000-4000-e000-000000000012', '00000000-0000-4000-b000-000000000008', 'experience', 'slot', 'eagles-nest-sunrise-trek',
   'Eagle''s Nest Sunrise Trek', 'Sunrise over Rakaposhi and Ultar.',
   'Early trek to Eagle''s Nest for sunrise views over the Hunza valley.',
   pg_temp.cat('outdoor-adventure'), '00000000-0000-4000-c000-000000000010', pg_temp.pt(36.3300, 74.6800), 'Hunza',
   240, 1, 10, 900000, 'per_person', true, 'moderate', '{en,ur}', '{Guide}', '{}', 'draft'),
  -- Saffron Spa (Islamabad, appointments)
  ('00000000-0000-4000-e000-000000000021', '00000000-0000-4000-b000-000000000002', 'service', 'appointment', 'swedish-massage',
   'Swedish Relaxation Massage', 'Long, flowing strokes to release tension.', 'Full-body Swedish massage with warm aromatic oils.',
   pg_temp.cat('spa-massage'), '00000000-0000-4000-c000-000000000003', null, 'Islamabad',
   60, 1, 1, 800000, 'per_booking', true, 'moderate', '{ur,en}', '{Herbal tea,Shower access}', '{}', 'published'),
  ('00000000-0000-4000-e000-000000000022', '00000000-0000-4000-b000-000000000002', 'service', 'appointment', 'deep-tissue-massage',
   'Deep Tissue Massage', 'Firm pressure for knots and sore muscles.', 'Targeted deep tissue work for back, neck and shoulders.',
   pg_temp.cat('spa-massage'), '00000000-0000-4000-c000-000000000003', null, 'Islamabad',
   75, 1, 1, 950000, 'per_booking', true, 'moderate', '{ur,en}', '{Herbal tea}', '{}', 'published'),
  ('00000000-0000-4000-e000-000000000023', '00000000-0000-4000-b000-000000000002', 'service', 'appointment', 'moroccan-hammam-ritual',
   'Moroccan Hammam Ritual', 'Steam, black-soap scrub and clay wrap.', 'A traditional hammam: steam, kessa scrub, rhassoul clay and a short massage.',
   pg_temp.cat('spa-massage'), '00000000-0000-4000-c000-000000000003', null, 'Islamabad',
   90, 1, 1, 1200000, 'per_booking', true, 'strict', '{ur,en}', '{Robe and slippers,Herbal tea}', '{}', 'published'),
  ('00000000-0000-4000-e000-000000000024', '00000000-0000-4000-b000-000000000002', 'service', 'appointment', 'hydrating-gold-facial',
   'Hydrating Gold Facial', 'Deep cleanse and hydration for dry skin.', 'Cleanse, exfoliation, gold mask and facial massage.',
   pg_temp.cat('skin-care'), '00000000-0000-4000-c000-000000000003', null, 'Islamabad',
   60, 1, 1, 650000, 'per_booking', true, 'moderate', '{ur,en}', '{}', '{}', 'published'),
  -- Gulberg Glow Salon (Lahore, appointments)
  ('00000000-0000-4000-e000-000000000025', '00000000-0000-4000-b000-000000000005', 'service', 'appointment', 'haircut-blow-dry',
   'Haircut & Blow-dry', 'Consultation, cut and finish.', 'A consultation with your stylist, wash, cut and blow-dry.',
   pg_temp.cat('hair'), '00000000-0000-4000-c000-000000000006', null, 'Lahore',
   60, 1, 1, 350000, 'per_booking', true, 'flexible', '{ur,en}', '{}', '{}', 'published'),
  ('00000000-0000-4000-e000-000000000026', '00000000-0000-4000-b000-000000000005', 'service', 'appointment', 'gel-manicure',
   'Gel Manicure', 'Shape, cuticle care and long-lasting gel colour.', 'Includes nail shaping, cuticle care and a gel colour of your choice.',
   pg_temp.cat('nails'), '00000000-0000-4000-c000-000000000006', null, 'Lahore',
   45, 1, 1, 250000, 'per_booking', true, 'flexible', '{ur,en}', '{}', '{}', 'published'),
  ('00000000-0000-4000-e000-000000000027', '00000000-0000-4000-b000-000000000005', 'service', 'appointment', 'keratin-treatment',
   'Keratin Smoothing Treatment', 'Frizz-free, glossy hair for months.', 'Professional keratin treatment, including wash and blow-dry.',
   pg_temp.cat('hair'), '00000000-0000-4000-c000-000000000006', null, 'Lahore',
   150, 1, 1, 1800000, 'per_booking', true, 'strict', '{ur,en}', '{}', '{}', 'published'),
  -- The Clifton Barber (Karachi, appointments)
  ('00000000-0000-4000-e000-000000000028', '00000000-0000-4000-b000-000000000007', 'service', 'appointment', 'classic-haircut',
   'Classic Haircut', 'Scissor or clipper cut with hot-towel finish.', 'Consultation, cut, wash and style.',
   pg_temp.cat('grooming'), '00000000-0000-4000-c000-000000000009', null, 'Karachi',
   45, 1, 1, 200000, 'per_booking', true, 'flexible', '{ur,en}', '{}', '{}', 'published'),
  ('00000000-0000-4000-e000-000000000029', '00000000-0000-4000-b000-000000000007', 'service', 'appointment', 'beard-trim-shape',
   'Beard Trim & Shape', 'Line-up, trim and beard oil.', 'Beard shaping with straight-razor line-up and hot towel.',
   pg_temp.cat('grooming'), '00000000-0000-4000-c000-000000000009', null, 'Karachi',
   30, 1, 1, 120000, 'per_booking', true, 'flexible', '{ur,en}', '{}', '{}', 'published'),
  ('00000000-0000-4000-e000-000000000030', '00000000-0000-4000-b000-000000000007', 'service', 'appointment', 'haircut-beard-combo',
   'Haircut + Beard Combo', 'The full works: cut, beard and hot towel.', 'Haircut and beard shaping in one sitting.',
   pg_temp.cat('grooming'), '00000000-0000-4000-c000-000000000009', null, 'Karachi',
   75, 1, 1, 300000, 'per_booking', true, 'flexible', '{ur,en}', '{}', '{}', 'published');

-- More experiences so every Home rail is full in each city (local dev data).
insert into public.listings (
  id, business_id, type, booking_mode, slug, title, summary, description, category_id, location_id,
  meeting_point, city, duration_minutes, min_guests, max_guests, price_amount, price_unit,
  instant_book, cancellation_policy, languages, includes, excludes, status
)
select ('00000000-0000-4000-e000-0000000000' || v.n)::uuid, v.business_id::uuid, 'experience', 'slot', v.slug, v.title, v.summary,
       v.summary, pg_temp.cat(v.category), v.location_id::uuid, pg_temp.pt(v.lat, v.lng), v.city,
       v.minutes, 1, v.max_guests, v.price, 'per_person', true, 'flexible', '{en,ur}', '{Local host}', '{Transport}', 'published'
from (values
  -- Islamabad: Margalla Trails Co.
  ('31', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000001', 'Islamabad', 'lok-virsa-heritage-museum', 'Lok Virsa Heritage Museum Tour', 'Crafts, music and costumes from every province under one roof.', 'tours-walks', 33.6895, 73.0681, 120, 15, 250000),
  ('32', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000001', 'Islamabad', 'daman-e-koh-family-evening', 'Daman-e-Koh Family Evening', 'Monkeys, city views and corn on the cob as the lights come on.', 'outdoor-adventure', 33.7420, 73.0570, 150, 20, 150000),
  ('33', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000001', 'Islamabad', 'melody-food-street-tasting', 'Melody Food Street Tasting Walk', 'Chapli kebab, halwa puri and doodh patti in old Melody market.', 'food-drink', 33.7097, 73.0846, 150, 10, 300000),
  ('34', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000001', 'Islamabad', 'little-chefs-islamabad', 'Little Chefs Cooking Class', 'Kids make their own pizza and kheer, then eat it all.', 'food-drink', 33.7180, 73.0610, 120, 12, 400000),
  ('35', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000001', 'Islamabad', 'skardu-fly-in-day-trip', 'Fly to Skardu: Shangrila Day Trip', 'Morning flight over the Karakoram, a day by the lakes, home for dinner.', 'day-trips', 33.6167, 72.8333, 720, 8, 4500000),
  ('36', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000001', 'Islamabad', 'blue-area-night-bites', 'Blue Area Night Bites & Chai', 'Late-night karahi, BBQ and the city''s best chai dhabas.', 'food-drink', 33.7077, 73.0498, 120, 10, 280000),
  -- Lahore: Androon Walks and Ayesha's kitchen
  ('37', '00000000-0000-4000-b000-000000000003', '00000000-0000-4000-c000-000000000004', 'Lahore', 'lahore-museum-wonder-house', 'Lahore Museum: The Wonder House', 'Gandhara art and Mughal miniatures with a historian.', 'tours-walks', 31.5680, 74.3080, 120, 15, 300000),
  ('38', '00000000-0000-4000-b000-000000000003', '00000000-0000-4000-c000-000000000004', 'Lahore', 'fort-road-food-street-dinner', 'Fort Road Food Street Dinner', 'Rooftop dinner facing Badshahi Mosque, lit up at night.', 'food-drink', 31.5867, 74.3103, 150, 12, 500000),
  ('39', '00000000-0000-4000-b000-000000000003', '00000000-0000-4000-c000-000000000004', 'Lahore', 'gawalmandi-late-night-bites', 'Gawalmandi Late-Night Bites', 'Siri paye, tawa chicken and falooda after dark.', 'food-drink', 31.5745, 74.3150, 120, 10, 350000),
  ('40', '00000000-0000-4000-b000-000000000004', '00000000-0000-4000-c000-000000000005', 'Lahore', 'family-baking-afternoon', 'Family Baking Afternoon', 'Bake naan khatai and cake rusks together in a Lahori kitchen.', 'food-drink', 31.4834, 74.3262, 150, 8, 600000),
  ('41', '00000000-0000-4000-b000-000000000004', '00000000-0000-4000-c000-000000000005', 'Lahore', 'kids-pizza-workshop', 'Kids'' Pizza Workshop', 'Dough, toppings and a lot of flour for 6 to 12 year olds.', 'food-drink', 31.4834, 74.3262, 120, 10, 450000),
  ('42', '00000000-0000-4000-b000-000000000003', '00000000-0000-4000-c000-000000000004', 'Lahore', 'jallo-park-family-day', 'Jallo Park Family Day Out', 'Boating, the wildlife park and a picnic lunch.', 'outdoor-adventure', 31.5813, 74.4829, 240, 20, 200000),
  -- Karachi: Karachi outdoors operator
  ('43', '00000000-0000-4000-b000-000000000006', '00000000-0000-4000-c000-000000000008', 'Karachi', 'mohatta-palace-museum-visit', 'Mohatta Palace Museum Visit', 'Pink Jodhpur stone, art exhibitions and Clifton''s old mansions.', 'tours-walks', 24.8136, 67.0330, 120, 15, 250000),
  ('44', '00000000-0000-4000-b000-000000000006', '00000000-0000-4000-c000-000000000008', 'Karachi', 'port-grand-night-market', 'Port Grand Night Market', 'Harbour lights, street food and live music on the old bridge.', 'food-drink', 24.8414, 66.9888, 150, 12, 300000),
  ('45', '00000000-0000-4000-b000-000000000006', '00000000-0000-4000-c000-000000000008', 'Karachi', 'do-darya-seafood-evening', 'Do Darya Seafood Evening', 'Sunset over the Arabian Sea with fresh grilled fish.', 'food-drink', 24.7866, 67.0567, 150, 10, 650000),
  ('46', '00000000-0000-4000-b000-000000000006', '00000000-0000-4000-c000-000000000007', 'Karachi', 'clifton-beach-family-day', 'Clifton Beach Family Day', 'Camel rides, kites and gola ganda by the sea.', 'outdoor-adventure', 24.8133, 67.0256, 180, 20, 200000),
  ('47', '00000000-0000-4000-b000-000000000006', '00000000-0000-4000-c000-000000000008', 'Karachi', 'boat-basin-street-food', 'Boat Basin Street Food Crawl', 'Bun kebab, chaat and paan along Khayaban-e-Saadi.', 'food-drink', 24.8277, 67.0331, 120, 10, 300000),
  ('48', '00000000-0000-4000-b000-000000000006', '00000000-0000-4000-c000-000000000008', 'Karachi', 'karachi-kids-cooking', 'Karachi Kids'' Cooking Club', 'Little cooks make biryani and gulab jamun.', 'food-drink', 24.8556, 67.0148, 120, 10, 450000)
) as v(n, business_id, location_id, city, slug, title, summary, category, lat, lng, minutes, max_guests, price);

-- Price tiers and variants
insert into public.listing_options (id, business_id, listing_id, name, price_amount, duration_minutes, sort_order) values
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-b000-000000000002', '00000000-0000-4000-e000-000000000021', '60 minutes', 800000, 60, 1),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-b000-000000000002', '00000000-0000-4000-e000-000000000021', '90 minutes', 1100000, 90, 2),
  ('00000000-0000-4000-f000-000000000003', '00000000-0000-4000-b000-000000000003', '00000000-0000-4000-e000-000000000006', 'Adult', 550000, null, 1),
  ('00000000-0000-4000-f000-000000000004', '00000000-0000-4000-b000-000000000003', '00000000-0000-4000-e000-000000000006', 'Child (under 12)', 300000, null, 2);

-- Listing photos: images exported from Figma, uploaded to the local seed-media
-- bucket by `supabase seed buckets`. Stored as storage refs, resolved by the app.
insert into public.listing_media (business_id, listing_id, url, alt, sort_order)
select l.business_id, l.id, 'storage://seed-media/listings/' || photo || '.jpg', l.title, n
from public.listings l
left join (values
  ('margalla-sunrise-hike', 'old-town-walk'), ('saidpur-faisal-golden-hour', 'old-town-walk'),
  ('rawal-lake-kayaking', 'kids-adventure'), ('walled-city-food-walk', 'night-market'),
  ('badshahi-lahore-fort-tour', 'museum-gallery'), ('wagah-border-ceremony', 'old-town-walk'),
  ('truck-art-workshop', 'museum-gallery'), ('lahori-home-cooking-class', 'family-cooking'),
  ('sandspit-mangrove-kayaking', 'kids-adventure'), ('churna-island-snorkeling', 'plane-window'),
  ('burns-road-food-crawl', 'street-drinks'), ('eagles-nest-sunrise-trek', 'plane-window'),
  ('lok-virsa-heritage-museum', 'museum-gallery'), ('daman-e-koh-family-evening', 'kids-adventure'),
  ('melody-food-street-tasting', 'food-tasting'), ('little-chefs-islamabad', 'kids-cooking'),
  ('skardu-fly-in-day-trip', 'plane-window'), ('blue-area-night-bites', 'street-drinks'),
  ('lahore-museum-wonder-house', 'museum-gallery'), ('fort-road-food-street-dinner', 'night-market'),
  ('gawalmandi-late-night-bites', 'street-drinks'), ('family-baking-afternoon', 'family-cooking'),
  ('kids-pizza-workshop', 'kids-cooking'), ('jallo-park-family-day', 'kids-adventure'),
  ('mohatta-palace-museum-visit', 'museum-gallery'), ('port-grand-night-market', 'night-market'),
  ('do-darya-seafood-evening', 'food-tasting'), ('clifton-beach-family-day', 'kids-adventure'),
  ('boat-basin-street-food', 'street-drinks'), ('karachi-kids-cooking', 'kids-cooking')
) as cover(slug, first_photo) on cover.slug = l.slug
cross join lateral (
  -- Cover first, then two more for the gallery. Services (spa, salon) use the spa photo.
  select n,
         case when l.type = 'service' then 'spa-facial'
              when n = 1 then coalesce(cover.first_photo, 'old-town-walk')
              else (array['old-town-walk', 'food-tasting', 'night-market', 'museum-gallery', 'family-cooking'])[1 + (abs(hashtext(l.slug)) + n) % 5]
         end as photo
  from generate_series(1, 3) n
) g;

-- Tags
insert into public.listing_tags (business_id, listing_id, tag_id)
select l.business_id, l.id, t.id
from (values
  ('margalla-sunrise-hike', '{hiking,nature,adventure,photography}'),
  ('saidpur-faisal-golden-hour', '{heritage,history,photography,culture}'),
  ('rawal-lake-kayaking', '{water,adventure,nature}'),
  ('walled-city-food-walk', '{food,street-food,heritage,nightlife}'),
  ('badshahi-lahore-fort-tour', '{heritage,history,culture,photography,family-friendly}'),
  ('wagah-border-ceremony', '{culture,history,family-friendly}'),
  ('truck-art-workshop', '{art,culture}'),
  ('lahori-home-cooking-class', '{food,cooking,culture}'),
  ('sandspit-mangrove-kayaking', '{water,nature,adventure}'),
  ('churna-island-snorkeling', '{water,adventure}'),
  ('burns-road-food-crawl', '{food,street-food,nightlife}'),
  ('eagles-nest-sunrise-trek', '{hiking,nature,adventure}'),
  ('swedish-massage', '{wellness}'),
  ('deep-tissue-massage', '{wellness}'),
  ('moroccan-hammam-ritual', '{wellness,beauty}'),
  ('hydrating-gold-facial', '{beauty,wellness}'),
  ('haircut-blow-dry', '{beauty}'),
  ('gel-manicure', '{beauty}'),
  ('keratin-treatment', '{beauty}'),
  ('classic-haircut', '{beauty}'),
  ('beard-trim-shape', '{beauty}'),
  ('haircut-beard-combo', '{beauty,wellness}')
) as v(slug, tags)
join public.listings l on l.slug = v.slug
join public.tags t on t.slug = any (v.tags::text[]);

-- Who delivers what
insert into public.listing_staff (business_id, listing_id, staff_id)
select l.business_id, l.id, s.id
from (values
  ('margalla-sunrise-hike', 'Faraz Khan'), ('rawal-lake-kayaking', 'Faraz Khan'),
  ('saidpur-faisal-golden-hour', 'Hira Abbasi'),
  ('walled-city-food-walk', 'Usama Tariq'), ('wagah-border-ceremony', 'Usama Tariq'),
  ('badshahi-lahore-fort-tour', 'Nadia Butt'), ('truck-art-workshop', 'Nadia Butt'),
  ('lahori-home-cooking-class', 'Ayesha Siddiqui'),
  ('sandspit-mangrove-kayaking', 'Kamran Baloch'), ('burns-road-food-crawl', 'Kamran Baloch'),
  ('churna-island-snorkeling', 'Shehzad Ali'),
  ('eagles-nest-sunrise-trek', 'Karim Hunzai'),
  ('swedish-massage', 'Mehwish Akhtar'), ('swedish-massage', 'Rabia Kanwal'), ('swedish-massage', 'Kashif Rana'),
  ('deep-tissue-massage', 'Mehwish Akhtar'), ('deep-tissue-massage', 'Kashif Rana'),
  ('moroccan-hammam-ritual', 'Rabia Kanwal'),
  ('hydrating-gold-facial', 'Rabia Kanwal'), ('hydrating-gold-facial', 'Mehwish Akhtar'),
  ('haircut-blow-dry', 'Sadia Pervaiz'), ('keratin-treatment', 'Sadia Pervaiz'),
  ('gel-manicure', 'Iqra Shah'),
  ('classic-haircut', 'Imran Qureshi'), ('classic-haircut', 'Danish Iqbal'),
  ('beard-trim-shape', 'Imran Qureshi'), ('beard-trim-shape', 'Danish Iqbal'),
  ('haircut-beard-combo', 'Imran Qureshi'), ('haircut-beard-combo', 'Danish Iqbal')
) as v(slug, staff_name)
join public.listings l on l.slug = v.slug
join public.staff_members s on s.display_name = v.staff_name and s.business_id = l.business_id;

-- ---------------------------------------------------------------------------
-- Availability rules (slots for the next 90 days are generated by trigger)
-- ---------------------------------------------------------------------------
insert into public.availability_rules (business_id, listing_id, staff_id, weekdays, start_time, capacity, valid_from)
select l.business_id, l.id, s.id, v.weekdays::smallint[], v.start_time::time, v.capacity, pg_temp.today()
from (values
  ('margalla-sunrise-hike', 'Faraz Khan', '{6,7}', '05:30', 12),
  ('saidpur-faisal-golden-hour', 'Hira Abbasi', '{1,2,3,4,5,6,7}', '16:00', 10),
  ('rawal-lake-kayaking', 'Faraz Khan', '{5,6,7}', '07:00', 8),
  ('walled-city-food-walk', 'Usama Tariq', '{1,2,3,4,5,6,7}', '18:30', 12),
  ('badshahi-lahore-fort-tour', 'Nadia Butt', '{2,3,4,5,6,7}', '09:00', 15),
  ('wagah-border-ceremony', 'Usama Tariq', '{1,2,3,4,5,6,7}', '14:00', 14),
  ('truck-art-workshop', 'Nadia Butt', '{6}', '11:00', 8),
  ('lahori-home-cooking-class', 'Ayesha Siddiqui', '{3,5,7}', '17:00', 6),
  ('sandspit-mangrove-kayaking', 'Kamran Baloch', '{6,7}', '06:30', 10),
  ('churna-island-snorkeling', 'Shehzad Ali', '{5,6,7}', '07:00', 12),
  ('burns-road-food-crawl', 'Kamran Baloch', '{1,2,3,4,5,6,7}', '19:30', 12)
) as v(slug, staff_name, weekdays, start_time, capacity)
join public.listings l on l.slug = v.slug
join public.staff_members s on s.display_name = v.staff_name and s.business_id = l.business_id;

-- A public holiday closure at Androon Walks, two weeks out
insert into public.availability_exceptions (business_id, scope, starts_at, ends_at, reason)
values ('00000000-0000-4000-b000-000000000003', 'business',
        pg_temp.pk(pg_temp.today() + 14, '00:00'), pg_temp.pk(pg_temp.today() + 15, '00:00'), 'Public holiday');

-- Past sessions for completed bookings
insert into public.slots (id, business_id, listing_id, staff_id, starts_at, ends_at, capacity) values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-b000-000000000003', '00000000-0000-4000-e000-000000000004', '00000000-0000-4000-d000-000000000006',
   pg_temp.pk(pg_temp.today() - 12, '18:30'), pg_temp.pk(pg_temp.today() - 12, '22:00'), 12),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-e000-000000000001', '00000000-0000-4000-d000-000000000004',
   pg_temp.pk(pg_temp.today() - 6, '05:30'), pg_temp.pk(pg_temp.today() - 6, '08:30'), 12),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-b000-000000000006', '00000000-0000-4000-e000-000000000009', '00000000-0000-4000-d000-000000000011',
   pg_temp.pk(pg_temp.today() - 8, '06:30'), pg_temp.pk(pg_temp.today() - 8, '09:00'), 10),
  ('00000000-0000-4000-9000-000000000004', '00000000-0000-4000-b000-000000000004', '00000000-0000-4000-e000-000000000007', '00000000-0000-4000-d000-000000000008',
   pg_temp.pk(pg_temp.today() - 5, '17:00'), pg_temp.pk(pg_temp.today() - 5, '20:00'), 6),
  ('00000000-0000-4000-9000-000000000005', '00000000-0000-4000-b000-000000000006', '00000000-0000-4000-e000-000000000011', '00000000-0000-4000-d000-000000000011',
   pg_temp.pk(pg_temp.today() - 3, '19:30'), pg_temp.pk(pg_temp.today() - 3, '22:00'), 12)
on conflict (listing_id, starts_at) do nothing;

-- ---------------------------------------------------------------------------
-- Badges and Adventure Quiz
-- ---------------------------------------------------------------------------
-- Personality badges follow Figma's naming ("Nature Lover"); codes stay stable.
-- `icon` is the result illustration; only Nature Lover has one in Figma so far.
insert into public.badges (code, name, description, icon, kind, primary_trait, sort_order) values
  ('trailblazer', 'Adventure Lover', 'You chase summits, rapids and the next big thrill. We''ll find the adventures that get your heart racing.', null, 'personality', 'adventure', 1),
  ('culture-seeker', 'Culture Lover', 'Old cities, stories and art pull you in. We''ll show you the heritage walks and workshops locals love.', null, 'personality', 'culture', 2),
  ('foodie-explorer', 'Food Lover', 'You plan trips around what to eat next. We''ll point you to the food streets, cooking classes and hidden dhabas.', null, 'personality', 'food', 3),
  ('zen-wanderer', 'Wellness Lover', 'You travel to slow down and recharge. We''ll find calm spots, spa days and slow mornings for you.', null, 'personality', 'wellness', 4),
  ('social-butterfly', 'Party Lover', 'The best plans are the ones with your people. We''ll line up nights out and group experiences.', null, 'personality', 'social', 5),
  ('nature-soul', 'Nature Lover', 'Mountains, lakes and open sky are your happy place. We''ll find trails, camps and sunrises worth waking up for.', 'storage://seed-media/badges/nature-lover.png', 'personality', 'nature', 6),
  ('first-booking', 'First Moment', 'Booked your first experience.', 'ticket-01', 'achievement', null, 10);

insert into public.badge_tags (badge_id, tag_id, weight)
select b.id, t.id, v.weight
from (values
  ('trailblazer', 'adventure', 3), ('trailblazer', 'hiking', 2), ('trailblazer', 'water', 2),
  ('culture-seeker', 'heritage', 3), ('culture-seeker', 'history', 2), ('culture-seeker', 'culture', 2), ('culture-seeker', 'art', 1),
  ('foodie-explorer', 'food', 3), ('foodie-explorer', 'street-food', 2), ('foodie-explorer', 'cooking', 2),
  ('zen-wanderer', 'wellness', 3), ('zen-wanderer', 'beauty', 2), ('zen-wanderer', 'nature', 1),
  ('social-butterfly', 'nightlife', 2), ('social-butterfly', 'food', 1), ('social-butterfly', 'culture', 1), ('social-butterfly', 'family-friendly', 1),
  ('nature-soul', 'nature', 3), ('nature-soul', 'hiking', 2), ('nature-soul', 'water', 1), ('nature-soul', 'photography', 1)
) as v(badge, tag, weight)
join public.badges b on b.code = v.badge
join public.tags t on t.slug = v.tag;

-- The Adventure Quiz as designed in Figma (20:2103 ... 20:2453). Each kind maps
-- its interaction onto answer rows (glass halves, seats, temperature buckets),
-- so submit_quiz scores them all the same way. Weights are tuned so every
-- personality can win (see supabase/tests/database/07_quiz.test.sql).
with q as (
  insert into public.quiz_questions (prompt, kind, config, sort_order) values
    ('What do you like to do in your free time?', 'photo_list', '{}', 1),
    ('Where can we find you on a Saturday night?', 'photo_list', '{}', 2),
    ('Is the glass half empty or half full?', 'glass', '{"top": 1, "bottom": 2}', 3),
    ('People are ______?', 'emoji_list', '{}', 4),
    ('Pick your seat on the plane.', 'seat', '{"rows": 3, "columns": [1, 2, 2, 1]}', 5),
    ('What''s the temperature outside on a perfect day?', 'slider',
      '{"min": 0, "max": 50, "default": 20, "unit": "C", "buckets": [{"answer": 1, "max": 14}, {"answer": 2, "max": 24}, {"answer": 3, "max": 32}, {"answer": 4, "max": 50}]}', 6)
  returning id, sort_order
)
insert into public.quiz_answers (question_id, label, image_url, trait_weights, sort_order)
select q.id, a.label, a.image, a.weights::jsonb, a.pos
from q
join (values
  (1, 1, 'I like to hike', 'storage://seed-media/quiz/q1-hike.jpg', '{"nature": 2, "adventure": 1}'),
  (1, 2, 'I like to relax', 'storage://seed-media/quiz/q1-relax.jpg', '{"wellness": 2}'),
  (1, 3, 'I like to take risks', 'storage://seed-media/quiz/q1-risks.jpg', '{"adventure": 2}'),
  (1, 4, 'I like to party', 'storage://seed-media/quiz/q1-party.jpg', '{"social": 2}'),
  (1, 5, 'I like to shop', 'storage://seed-media/quiz/q1-shop.jpg', '{"culture": 1, "food": 1}'),
  (2, 1, 'Camping', 'storage://seed-media/quiz/q2-camping.jpg', '{"nature": 2}'),
  (2, 2, 'At home', 'storage://seed-media/quiz/q2-home.jpg', '{"wellness": 2}'),
  (2, 3, 'Jumping out of a plane', 'storage://seed-media/quiz/q2-jumping.jpg', '{"adventure": 2}'),
  (2, 4, 'At the club', 'storage://seed-media/quiz/q2-club.jpg', '{"social": 2}'),
  (2, 5, 'On a yacht', 'storage://seed-media/quiz/q2-yacht.jpg', '{"food": 1, "social": 1}'),
  (3, 1, 'Half empty', null, '{"wellness": 1, "culture": 1}'),
  (3, 2, 'Half full', null, '{"social": 1, "adventure": 1}'),
  (4, 1, 'Cool', 'storage://seed-media/quiz/emoji-cool.png', '{"social": 2}'),
  (4, 2, 'Scary', 'storage://seed-media/quiz/emoji-fearful.png', '{"nature": 2, "wellness": 1}'),
  (4, 3, 'Just people', 'storage://seed-media/quiz/emoji-happy.png', '{"culture": 1, "food": 1}'),
  (5, 1, 'Window seat', null, '{"nature": 1, "culture": 1}'),
  (5, 2, 'Aisle seat', null, '{"social": 1, "food": 1}'),
  (6, 1, 'Cold (below 15°C)', null, '{"nature": 1, "adventure": 1}'),
  (6, 2, 'Mild (15–24°C)', null, '{"culture": 2}'),
  (6, 3, 'Warm (25–32°C)', null, '{"food": 1, "social": 1}'),
  (6, 4, 'Hot (33°C and up)', null, '{"wellness": 1, "adventure": 1}')
) as a(question, pos, label, image, weights) on a.question = q.sort_order;

-- Consumers take the quiz through the real RPC
select pg_temp.act_as('00000000-0000-4000-a000-000000000021'); select public.submit_quiz(pg_temp.quiz_picks('{5,5,2,3,2,3}')); -- Hamza: foodie
select pg_temp.act_as('00000000-0000-4000-a000-000000000022'); select public.submit_quiz(pg_temp.quiz_picks('{2,2,1,2,1,4}')); -- Fatima: zen
select pg_temp.act_as('00000000-0000-4000-a000-000000000023'); select public.submit_quiz(pg_temp.quiz_picks('{3,3,2,1,2,1}')); -- Bilal: trailblazer
select pg_temp.act_as('00000000-0000-4000-a000-000000000024'); select public.submit_quiz(pg_temp.quiz_picks('{1,1,1,2,1,1}')); -- Zainab: nature
select pg_temp.act_as('00000000-0000-4000-a000-000000000025'); select public.submit_quiz(pg_temp.quiz_picks('{4,4,2,1,2,3}')); -- Usman: social
select pg_temp.act_as('00000000-0000-4000-a000-000000000026'); select public.submit_quiz(pg_temp.quiz_picks('{5,5,1,3,1,2}')); -- Sana: culture
select pg_temp.act_as(null);

-- ---------------------------------------------------------------------------
-- Coupons and memberships
-- ---------------------------------------------------------------------------
insert into public.coupons (id, business_id, code, title, description, discount_type, discount_value, max_discount_amount, min_subtotal_amount, per_user_limit, ends_at, is_public) values
  ('00000000-0000-4000-8100-000000000001', null, 'WELCOME10', '10% off your first booking', 'Up to PKR 1,000 off any experience or service.', 'percent', 10, 100000, 0, 1, now() + interval '180 days', true),
  ('00000000-0000-4000-8100-000000000002', '00000000-0000-4000-b000-000000000002', 'SAFFRON20', '20% off weekday massages', 'Saffron Spa weekday offer.', 'percent', 20, null, 500000, 2, now() + interval '60 days', true),
  ('00000000-0000-4000-8100-000000000003', '00000000-0000-4000-b000-000000000006', 'KARACHI500', 'PKR 500 off coastal trips', 'On bookings over PKR 5,000.', 'fixed', 50000, null, 500000, 1, now() + interval '90 days', true),
  ('00000000-0000-4000-8100-000000000004', '00000000-0000-4000-b000-000000000003', 'ANDROONVIP', 'Friends of Androon Walks', 'Private code for repeat guests.', 'percent', 15, 150000, 0, 3, null, false);

insert into public.membership_plans (id, business_id, name, description, price_amount, interval, benefits, included_sessions, discount_percent, sort_order) values
  ('00000000-0000-4000-8200-000000000001', null, 'Moment Plus', 'Member prices and priority support across Moment.', 99900, 'month',
   '{"perks": ["5% off every booking", "Priority support", "Early access to new experiences"]}', null, 5, 1),
  ('00000000-0000-4000-8200-000000000002', '00000000-0000-4000-b000-000000000002', 'Saffron Wellness Club', 'Two massages a month and 10% off everything else.', 1500000, 'month',
   '{"perks": ["2 x 60-minute massages", "10% off treatments", "Free herbal tea bar"]}', 2, 10, 1),
  ('00000000-0000-4000-8200-000000000003', '00000000-0000-4000-b000-000000000007', 'Clifton Regular', 'Unlimited beard trims for a year.', 1200000, 'year',
   '{"perks": ["Unlimited beard trims", "10% off haircuts"]}', null, 10, 1);

insert into public.memberships (id, plan_id, user_id, status, started_at, current_period_end, sessions_remaining, provider, provider_subscription_ref) values
  ('00000000-0000-4000-8300-000000000001', '00000000-0000-4000-8200-000000000001', '00000000-0000-4000-a000-000000000021', 'active', now() - interval '40 days', now() + interval '20 days', null, 'jazzcash', 'JC-SUB-TEST-0001'),
  ('00000000-0000-4000-8300-000000000002', '00000000-0000-4000-8200-000000000002', '00000000-0000-4000-a000-000000000022', 'active', now() - interval '10 days', now() + interval '20 days', 1, 'easypaisa', 'EP-SUB-TEST-0001');

-- ---------------------------------------------------------------------------
-- Groups (owner and group chat created by triggers)
-- ---------------------------------------------------------------------------
insert into public.groups (id, owner_id, name, description, destination_city, destination_geo, start_date, end_date, visibility, is_open_to_match, max_members, interest_tag_ids, cover_url) values
  ('00000000-0000-4000-7000-000000000001', '00000000-0000-4000-a000-000000000023', 'Karachi Coast Weekend',
   'Snorkelling at Churna, kayaking at Sandspit and Burns Road at night. Looking for 2-3 more people.',
   'Karachi', pg_temp.pt(24.8607, 67.0011), pg_temp.today() + 3, pg_temp.today() + 6, 'public', true, 6,
   array(select id from public.tags where slug in ('water', 'adventure', 'food')), 'https://picsum.photos/seed/karachi-coast-group/1200/600'),
  ('00000000-0000-4000-7000-000000000002', '00000000-0000-4000-a000-000000000021', 'Lahore Food Squad',
   'Monthly food walks around the Walled City.', 'Lahore', pg_temp.pt(31.5820, 74.3294), null, null, 'private', false, 8,
   array(select id from public.tags where slug in ('food', 'street-food')), null),
  ('00000000-0000-4000-7000-000000000003', '00000000-0000-4000-a000-000000000025', 'Islamabad Hiking Crew',
   'Weekend hikes on the Margalla trails. All levels welcome.', 'Islamabad', pg_temp.pt(33.6844, 73.0479), pg_temp.today() + 7, pg_temp.today() + 8, 'public', true, 10,
   array(select id from public.tags where slug in ('hiking', 'nature')), null);

insert into public.group_members (group_id, user_id, role, status, invited_by) values
  ('00000000-0000-4000-7000-000000000001', '00000000-0000-4000-a000-000000000024', 'member', 'active', '00000000-0000-4000-a000-000000000023'),
  ('00000000-0000-4000-7000-000000000001', '00000000-0000-4000-a000-000000000025', 'member', 'requested', null),
  ('00000000-0000-4000-7000-000000000002', '00000000-0000-4000-a000-000000000022', 'admin', 'active', '00000000-0000-4000-a000-000000000021'),
  ('00000000-0000-4000-7000-000000000002', '00000000-0000-4000-a000-000000000026', 'member', 'invited', '00000000-0000-4000-a000-000000000021'),
  ('00000000-0000-4000-7000-000000000003', '00000000-0000-4000-a000-000000000022', 'member', 'active', null);

-- ---------------------------------------------------------------------------
-- Past bookings (inserted directly with their final status)
-- ---------------------------------------------------------------------------
insert into public.bookings (
  id, business_id, consumer_id, listing_id, slot_id, staff_id, location_id, starts_at, ends_at, guest_count, status,
  contact_name, contact_phone, contact_email, subtotal_amount, discount_amount, total_amount, coupon_id, source, created_at
) values
  -- Hamza: food walk, 2 guests
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000021', '00000000-0000-4000-e000-000000000004',
   '00000000-0000-4000-9000-000000000001', '00000000-0000-4000-d000-000000000006', '00000000-0000-4000-c000-000000000004',
   pg_temp.pk(pg_temp.today() - 12, '18:30'), pg_temp.pk(pg_temp.today() - 12, '22:00'), 2, 'completed',
   'Hamza Khan', '+923000000021', 'hamza@moment.test', 900000, 0, 900000, null, 'app', now() - interval '20 days'),
  -- Fatima: 90-minute Swedish massage
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000022', '00000000-0000-4000-e000-000000000021',
   null, '00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000003',
   pg_temp.pk(pg_temp.today() - 9, '15:00'), pg_temp.pk(pg_temp.today() - 9, '16:30'), 1, 'completed',
   'Fatima Noor', '+923000000022', 'fatima@moment.test', 1100000, 0, 1100000, null, 'app', now() - interval '14 days'),
  -- Bilal: sunrise hike, paid cash on the day
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000023', '00000000-0000-4000-e000-000000000001',
   '00000000-0000-4000-9000-000000000002', '00000000-0000-4000-d000-000000000004', '00000000-0000-4000-c000-000000000001',
   pg_temp.pk(pg_temp.today() - 6, '05:30'), pg_temp.pk(pg_temp.today() - 6, '08:30'), 1, 'completed',
   'Bilal Hussain', '+923000000023', 'bilal@moment.test', 300000, 0, 300000, null, 'app', now() - interval '9 days'),
  -- Zainab: mangrove kayaking with KARACHI500
  ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-b000-000000000006', '00000000-0000-4000-a000-000000000024', '00000000-0000-4000-e000-000000000009',
   '00000000-0000-4000-9000-000000000003', '00000000-0000-4000-d000-000000000011', '00000000-0000-4000-c000-000000000007',
   pg_temp.pk(pg_temp.today() - 8, '06:30'), pg_temp.pk(pg_temp.today() - 8, '09:00'), 2, 'completed',
   'Zainab Rizvi', '+923000000024', 'zainab@moment.test', 1300000, 50000, 1250000, '00000000-0000-4000-8100-000000000003', 'app', now() - interval '15 days'),
  -- Usman: haircut + beard combo, walk-in recorded on POS
  ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-b000-000000000007', '00000000-0000-4000-a000-000000000025', '00000000-0000-4000-e000-000000000030',
   null, '00000000-0000-4000-d000-000000000013', '00000000-0000-4000-c000-000000000009',
   pg_temp.pk(pg_temp.today() - 4, '18:00'), pg_temp.pk(pg_temp.today() - 4, '19:15'), 1, 'completed',
   'Usman Ali', '+923000000025', 'usman@moment.test', 300000, 0, 300000, null, 'pos', now() - interval '4 days'),
  -- Sana: cooking class, 2 guests
  ('00000000-0000-4000-8000-000000000006', '00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000026', '00000000-0000-4000-e000-000000000007',
   '00000000-0000-4000-9000-000000000004', '00000000-0000-4000-d000-000000000008', '00000000-0000-4000-c000-000000000005',
   pg_temp.pk(pg_temp.today() - 5, '17:00'), pg_temp.pk(pg_temp.today() - 5, '20:00'), 2, 'completed',
   'Sana Iqbal', '+923000000026', 'sana@moment.test', 1500000, 0, 1500000, null, 'app', now() - interval '12 days'),
  -- Fatima: gel manicure
  ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-b000-000000000005', '00000000-0000-4000-a000-000000000022', '00000000-0000-4000-e000-000000000026',
   null, '00000000-0000-4000-d000-000000000010', '00000000-0000-4000-c000-000000000006',
   pg_temp.pk(pg_temp.today() - 15, '13:00'), pg_temp.pk(pg_temp.today() - 15, '13:45'), 1, 'completed',
   'Fatima Noor', '+923000000022', 'fatima@moment.test', 250000, 0, 250000, null, 'web', now() - interval '18 days'),
  -- Usman: no-show on the Burns Road crawl
  ('00000000-0000-4000-8000-000000000008', '00000000-0000-4000-b000-000000000006', '00000000-0000-4000-a000-000000000025', '00000000-0000-4000-e000-000000000011',
   '00000000-0000-4000-9000-000000000005', '00000000-0000-4000-d000-000000000011', '00000000-0000-4000-c000-000000000008',
   pg_temp.pk(pg_temp.today() - 3, '19:30'), pg_temp.pk(pg_temp.today() - 3, '22:00'), 1, 'no_show',
   'Usman Ali', '+923000000025', 'usman@moment.test', 350000, 0, 350000, null, 'app', now() - interval '6 days');

insert into public.coupon_redemptions (coupon_id, business_id, user_id, booking_id, discount_amount)
values ('00000000-0000-4000-8100-000000000003', '00000000-0000-4000-b000-000000000006', '00000000-0000-4000-a000-000000000024', '00000000-0000-4000-8000-000000000004', 50000);

-- ---------------------------------------------------------------------------
-- Upcoming bookings through the real booking RPCs
-- ---------------------------------------------------------------------------
-- Hamza: heritage tour for 2 with WELCOME10
select pg_temp.act_as('00000000-0000-4000-a000-000000000021');
select public.create_booking(
  p_listing_id => '00000000-0000-4000-e000-000000000005',
  p_slot_id => pg_temp.next_slot('00000000-0000-4000-e000-000000000005', interval '2 days'),
  p_guest_count => 2, p_coupon_code => 'WELCOME10', p_notes => 'My parents are joining, they walk slowly.');
-- Hamza: Saidpur walk
select public.create_booking(
  p_listing_id => '00000000-0000-4000-e000-000000000002',
  p_slot_id => pg_temp.next_slot('00000000-0000-4000-e000-000000000002', interval '4 days'),
  p_guest_count => 1, p_source => 'web');

-- Fatima: hammam with Rabia next Tuesday 15:00 (pay at the spa)
select pg_temp.act_as('00000000-0000-4000-a000-000000000022');
select public.create_booking(
  p_listing_id => '00000000-0000-4000-e000-000000000023',
  p_starts_at => pg_temp.pk(pg_temp.next_monday() + 1, '15:00'),
  p_staff_id => '00000000-0000-4000-d000-000000000002');

-- Bilal and Zainab: Churna snorkeling as a group
select pg_temp.act_as('00000000-0000-4000-a000-000000000023');
select public.create_booking(
  p_listing_id => '00000000-0000-4000-e000-000000000010',
  p_slot_id => pg_temp.next_slot('00000000-0000-4000-e000-000000000010', interval '1 day'),
  p_guest_count => 1, p_group_id => '00000000-0000-4000-7000-000000000001');
select pg_temp.act_as('00000000-0000-4000-a000-000000000024');
select public.create_booking(
  p_listing_id => '00000000-0000-4000-e000-000000000010',
  p_slot_id => pg_temp.next_slot('00000000-0000-4000-e000-000000000010', interval '1 day'),
  p_guest_count => 1, p_group_id => '00000000-0000-4000-7000-000000000001');

-- Usman: Wagah trip request (not instant book, so it stays pending), adult + child
select pg_temp.act_as('00000000-0000-4000-a000-000000000025');
select public.create_booking(
  p_listing_id => '00000000-0000-4000-e000-000000000006',
  p_slot_id => pg_temp.next_slot('00000000-0000-4000-e000-000000000006', interval '2 days'),
  p_guest_count => 2,
  p_items => '[{"option_id": "00000000-0000-4000-f000-000000000003", "quantity": 1}, {"option_id": "00000000-0000-4000-f000-000000000004", "quantity": 1}]');

-- Sana: keratin with Sadia next Wednesday 12:00, and a Rawal Lake booking she cancels
select pg_temp.act_as('00000000-0000-4000-a000-000000000026');
select public.create_booking(
  p_listing_id => '00000000-0000-4000-e000-000000000027',
  p_starts_at => pg_temp.pk(pg_temp.next_monday() + 2, '12:00'),
  p_staff_id => '00000000-0000-4000-d000-000000000009');
select public.create_booking(
  p_listing_id => '00000000-0000-4000-e000-000000000003',
  p_slot_id => pg_temp.next_slot('00000000-0000-4000-e000-000000000003', interval '3 days'),
  p_guest_count => 1);
select public.cancel_booking(
  (select id from public.bookings where consumer_id = '00000000-0000-4000-a000-000000000026' and listing_id = '00000000-0000-4000-e000-000000000003'),
  'Plans changed, sorry!');

select pg_temp.act_as(null);

-- ---------------------------------------------------------------------------
-- Payments, refunds, wallet, payouts
-- ---------------------------------------------------------------------------
insert into public.payout_accounts (id, business_id, provider, provider_account_ref, account_title, bank_name, account_number_last4, iban_masked, is_default, verified_at) values
  ('00000000-0000-4000-8400-000000000001', '00000000-0000-4000-b000-000000000003', 'bank_transfer', 'BANK-TEST-ANDROON', 'Androon Walks', 'Test Bank Ltd', '4821', 'PK** TEST **** **** 4821', true, now() - interval '100 days'),
  ('00000000-0000-4000-8400-000000000002', '00000000-0000-4000-b000-000000000006', 'jazzcash', 'JC-MERCHANT-TEST-0006', 'Karachi Coastal Co.', null, null, null, true, now() - interval '60 days'),
  ('00000000-0000-4000-8400-000000000003', '00000000-0000-4000-b000-000000000005', 'easypaisa', 'EP-MERCHANT-TEST-0005', 'Gulberg Glow', null, null, null, true, now() - interval '40 days');

insert into public.payments (id, business_id, booking_id, membership_id, payer_id, amount, platform_fee_amount, collected_by, provider, provider_transaction_ref, provider_account_ref, method, method_summary, status, paid_at, recorded_by)
select v.id::uuid, v.business_id::uuid, v.booking_id::uuid, v.membership_id::uuid, v.payer_id::uuid, v.amount, v.fee,
       v.collected_by::public.payout_model, v.provider, v.ref, v.account_ref, v.method, v.summary,
       'succeeded'::public.payment_status, now() - v.paid_ago::interval, v.recorded_by::uuid
from (values
  ('00000000-0000-4000-8500-000000000001', '00000000-0000-4000-b000-000000000003', '00000000-0000-4000-8000-000000000001', null, '00000000-0000-4000-a000-000000000021', 900000, 90000, 'platform_collect', 'jazzcash', 'JC-TEST-000101', 'JC-MERCHANT-TEST-MOMENT', 'wallet', 'JazzCash 0300 ***0021', '20 days', null),
  ('00000000-0000-4000-8500-000000000002', '00000000-0000-4000-b000-000000000002', '00000000-0000-4000-8000-000000000002', null, '00000000-0000-4000-a000-000000000022', 1100000, 110000, 'platform_collect', 'easypaisa', 'EP-TEST-000102', 'EP-MERCHANT-TEST-MOMENT', 'wallet', 'Easypaisa 0300 ***0022', '14 days', null),
  ('00000000-0000-4000-8500-000000000003', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-8000-000000000003', null, '00000000-0000-4000-a000-000000000023', 300000, 0, 'direct', 'cash', null, null, 'cash', 'Cash at meeting point', '6 days', '00000000-0000-4000-a000-000000000002'),
  ('00000000-0000-4000-8500-000000000004', '00000000-0000-4000-b000-000000000006', '00000000-0000-4000-8000-000000000004', null, '00000000-0000-4000-a000-000000000024', 1250000, 125000, 'platform_collect', 'bank_transfer', 'IBFT-TEST-000104', 'BANK-TEST-MOMENT', 'bank_transfer', 'Bank transfer ***0024', '15 days', null),
  ('00000000-0000-4000-8500-000000000005', '00000000-0000-4000-b000-000000000007', '00000000-0000-4000-8000-000000000005', null, '00000000-0000-4000-a000-000000000025', 300000, 0, 'direct', 'cash', null, null, 'cash', 'Cash at counter', '4 days', '00000000-0000-4000-a000-000000000011'),
  ('00000000-0000-4000-8500-000000000006', '00000000-0000-4000-b000-000000000004', '00000000-0000-4000-8000-000000000006', null, '00000000-0000-4000-a000-000000000026', 1500000, 150000, 'platform_collect', 'jazzcash', 'JC-TEST-000106', 'JC-MERCHANT-TEST-MOMENT', 'wallet', 'JazzCash 0300 ***0026', '12 days', null),
  ('00000000-0000-4000-8500-000000000007', '00000000-0000-4000-b000-000000000005', '00000000-0000-4000-8000-000000000007', null, '00000000-0000-4000-a000-000000000022', 250000, 25000, 'direct', 'easypaisa', 'EP-TEST-000107', 'EP-MERCHANT-TEST-0005', 'wallet', 'Easypaisa 0300 ***0022', '18 days', null),
  -- Memberships: Moment Plus is platform revenue (no business)
  ('00000000-0000-4000-8500-000000000008', null, null, '00000000-0000-4000-8300-000000000001', '00000000-0000-4000-a000-000000000021', 99900, 99900, 'platform_collect', 'jazzcash', 'JC-TEST-000108', 'JC-MERCHANT-TEST-MOMENT', 'wallet', 'JazzCash 0300 ***0021', '10 days', null),
  ('00000000-0000-4000-8500-000000000009', '00000000-0000-4000-b000-000000000002', null, '00000000-0000-4000-8300-000000000002', '00000000-0000-4000-a000-000000000022', 1500000, 150000, 'platform_collect', 'easypaisa', 'EP-TEST-000109', 'EP-MERCHANT-TEST-MOMENT', 'wallet', 'Easypaisa 0300 ***0022', '10 days', null)
) as v(id, business_id, booking_id, membership_id, payer_id, amount, fee, collected_by, provider, ref, account_ref, method, summary, paid_ago, recorded_by);

-- Upcoming bookings paid in app
insert into public.payments (business_id, booking_id, payer_id, amount, platform_fee_amount, collected_by, provider, provider_transaction_ref, provider_account_ref, method, method_summary, status)
select b.business_id, b.id, b.consumer_id, b.total_amount, b.total_amount / 10, 'platform_collect', v.provider, v.ref, 'MERCHANT-TEST-MOMENT', 'wallet', v.summary, 'succeeded'
from (values
  ('00000000-0000-4000-a000-000000000021'::uuid, '00000000-0000-4000-e000-000000000005'::uuid, 'jazzcash', 'JC-TEST-000201', 'JazzCash 0300 ***0021'),
  ('00000000-0000-4000-a000-000000000023'::uuid, '00000000-0000-4000-e000-000000000010'::uuid, 'easypaisa', 'EP-TEST-000202', 'Easypaisa 0300 ***0023'),
  ('00000000-0000-4000-a000-000000000024'::uuid, '00000000-0000-4000-e000-000000000010'::uuid, 'jazzcash', 'JC-TEST-000203', 'JazzCash 0300 ***0024'),
  ('00000000-0000-4000-a000-000000000026'::uuid, '00000000-0000-4000-e000-000000000003'::uuid, 'easypaisa', 'EP-TEST-000204', 'Easypaisa 0300 ***0026')
) as v(consumer_id, listing_id, provider, ref, summary)
join public.bookings b on b.consumer_id = v.consumer_id and b.listing_id = v.listing_id;

-- Sana's cancelled Rawal Lake booking, refunded to her Moment wallet
with r as (
  insert into public.refunds (business_id, payment_id, amount, reason, status, to_wallet, requested_by, processed_at)
  select p.business_id, p.id, p.amount, 'Cancelled by guest within free cancellation window', 'succeeded', true, p.payer_id, now()
  from public.payments p where p.provider_transaction_ref = 'EP-TEST-000204'
  returning id, amount, requested_by
)
insert into public.wallet_transactions (user_id, type, amount, description, refund_id, booking_id)
select r.requested_by, 'refund_credit', r.amount, 'Refund: Rawal Lake Morning Kayaking', r.id,
       (select id from public.bookings where consumer_id = r.requested_by and listing_id = '00000000-0000-4000-e000-000000000003')
from r;

insert into public.wallet_transactions (user_id, type, amount, description) values
  ('00000000-0000-4000-a000-000000000021', 'promo', 50000, 'Welcome credit'),
  ('00000000-0000-4000-a000-000000000022', 'promo', 50000, 'Welcome credit'),
  ('00000000-0000-4000-a000-000000000023', 'promo', 50000, 'Welcome credit');

-- Androon Walks payout for the food walk (platform_collect)
insert into public.payouts (id, business_id, payout_account_id, amount, period_start, period_end, status, provider, provider_payout_ref, paid_at)
values ('00000000-0000-4000-8600-000000000001', '00000000-0000-4000-b000-000000000003', '00000000-0000-4000-8400-000000000001',
        810000, pg_temp.today() - 14, pg_temp.today() - 8, 'paid', 'bank_transfer', 'PAYOUT-TEST-0001', now() - interval '6 days');
insert into public.payout_items (payout_id, business_id, payment_id, gross_amount, fee_amount, net_amount)
values ('00000000-0000-4000-8600-000000000001', '00000000-0000-4000-b000-000000000003', '00000000-0000-4000-8500-000000000001', 900000, 90000, 810000);

-- ---------------------------------------------------------------------------
-- Reviews (completed bookings only)
-- ---------------------------------------------------------------------------
insert into public.reviews (booking_id, author_id, rating, body, business_reply, replied_at, replied_by, created_at) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-a000-000000000021', 5,
   'Usama knew every stall owner by name. The fried fish and the final doodh patti were the highlights. Come hungry!',
   'Shukriya Hamza! Come back in winter for the gajar halwa stop.', now() - interval '10 days', '00000000-0000-4000-a000-000000000007', now() - interval '11 days'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-a000-000000000022', 5,
   'Mehwish was wonderful. Quiet room, warm oils, and I slept like a baby that night.', null, null, null, now() - interval '8 days'),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-a000-000000000023', 4,
   'Beautiful sunrise and Faraz kept a good pace. Bring a jacket, it is cold at the top before dawn.', null, null, null, now() - interval '5 days'),
  ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-a000-000000000024', 5,
   'Saw herons and a crab colony in the mangroves. Kamran is passionate about protecting this place.',
   'Thank you Zainab! See you on the turtle season trip.', now() - interval '6 days', '00000000-0000-4000-a000-000000000010', now() - interval '7 days'),
  ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-a000-000000000025', 4,
   'Sharp fade and a proper hot towel. Had to wait 10 minutes past my slot.', null, null, null, now() - interval '3 days'),
  ('00000000-0000-4000-8000-000000000006', '00000000-0000-4000-a000-000000000026', 5,
   'Like cooking with my nani. The nihari was better than any restaurant and Ayesha sent us home with recipe cards.',
   'Sana you were a natural with the roti! Come back for the haleem class.', now() - interval '3 days', '00000000-0000-4000-a000-000000000008', now() - interval '4 days'),
  ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-a000-000000000022', 3,
   'Nice colour and it lasted two weeks, but the salon was running late.', null, null, null, now() - interval '14 days');

-- ---------------------------------------------------------------------------
-- Chat
-- ---------------------------------------------------------------------------
-- Hamza asks Androon Walks about his upcoming heritage tour (shared business inbox)
insert into public.conversations (id, type, business_id, booking_id, created_by, created_at)
select '00000000-0000-4000-6000-000000000001', 'business', '00000000-0000-4000-b000-000000000003', b.id, b.consumer_id, now() - interval '1 day'
from public.bookings b
where b.consumer_id = '00000000-0000-4000-a000-000000000021' and b.listing_id = '00000000-0000-4000-e000-000000000005';
insert into public.conversation_participants (conversation_id, user_id) values
  ('00000000-0000-4000-6000-000000000001', '00000000-0000-4000-a000-000000000021');

-- Fatima and Zainab, direct
insert into public.conversations (id, type, created_by, created_at) values
  ('00000000-0000-4000-6000-000000000002', 'direct', '00000000-0000-4000-a000-000000000022', now() - interval '2 days');
insert into public.conversation_participants (conversation_id, user_id) values
  ('00000000-0000-4000-6000-000000000002', '00000000-0000-4000-a000-000000000022'),
  ('00000000-0000-4000-6000-000000000002', '00000000-0000-4000-a000-000000000024');

insert into public.messages (conversation_id, sender_id, sender_business_id, body, created_at) values
  ('00000000-0000-4000-6000-000000000001', '00000000-0000-4000-a000-000000000021', null,
   'Assalam o alaikum! My parents are joining the heritage tour. Is there a lot of walking or stairs?', now() - interval '23 hours'),
  ('00000000-0000-4000-6000-000000000001', '00000000-0000-4000-a000-000000000007', '00000000-0000-4000-b000-000000000003',
   'Walaikum assalam Hamza! About 2 km in total with rest stops. Nadia will keep a gentle pace and there are benches inside the Fort.', now() - interval '22 hours'),
  ('00000000-0000-4000-6000-000000000001', '00000000-0000-4000-a000-000000000021', null,
   'Perfect, thank you!', now() - interval '21 hours'),
  ('00000000-0000-4000-6000-000000000002', '00000000-0000-4000-a000-000000000022', null,
   'Did you try the mangrove kayaking? Thinking of booking it for my sister.', now() - interval '2 days'),
  ('00000000-0000-4000-6000-000000000002', '00000000-0000-4000-a000-000000000024', null,
   'Yes! Go on a Sunday, it is quieter. Use KARACHI500 for PKR 500 off.', now() - interval '47 hours');

insert into public.messages (conversation_id, sender_id, body, created_at)
select c.id, v.sender::uuid, v.body, now() - v.ago::interval
from public.conversations c
join (values
  ('00000000-0000-4000-7000-000000000001', '00000000-0000-4000-a000-000000000023', 'Booked Churna for this weekend! Who is in for Burns Road after?', '20 hours'),
  ('00000000-0000-4000-7000-000000000001', '00000000-0000-4000-a000-000000000024', 'Me! Also booked Churna. Bringing my own mask.', '19 hours'),
  ('00000000-0000-4000-7000-000000000002', '00000000-0000-4000-a000-000000000021', 'Next walk: Gawalmandi on Friday after Isha?', '3 days'),
  ('00000000-0000-4000-7000-000000000002', '00000000-0000-4000-a000-000000000022', 'In. Inviting Sana too.', '3 days')
) as v(group_id, sender, body, ago) on c.group_id = v.group_id::uuid;

-- ---------------------------------------------------------------------------
-- Bucket list, recommendations, notifications, support, legal
-- ---------------------------------------------------------------------------
insert into public.bucket_lists (id, user_id, name) values
  ('00000000-0000-4000-b100-000000000001', '00000000-0000-4000-a000-000000000021', 'Weekend plans'),
  ('00000000-0000-4000-b100-000000000002', '00000000-0000-4000-a000-000000000021', 'I love nature'),
  ('00000000-0000-4000-b100-000000000003', '00000000-0000-4000-a000-000000000022', 'My bucket list'),
  ('00000000-0000-4000-b100-000000000004', '00000000-0000-4000-a000-000000000024', 'Self-care'),
  ('00000000-0000-4000-b100-000000000005', '00000000-0000-4000-a000-000000000025', 'My bucket list'),
  ('00000000-0000-4000-b100-000000000006', '00000000-0000-4000-a000-000000000026', 'My bucket list');

insert into public.bucket_list_items (bucket_list_id, user_id, listing_id, business_id, note) values
  ('00000000-0000-4000-b100-000000000001', '00000000-0000-4000-a000-000000000021', '00000000-0000-4000-e000-000000000010', null, 'With the squad in March'),
  ('00000000-0000-4000-b100-000000000002', '00000000-0000-4000-a000-000000000021', '00000000-0000-4000-e000-000000000007', null, null),
  ('00000000-0000-4000-b100-000000000002', '00000000-0000-4000-a000-000000000021', '00000000-0000-4000-e000-000000000010', null, null),
  ('00000000-0000-4000-b100-000000000003', '00000000-0000-4000-a000-000000000022', '00000000-0000-4000-e000-000000000001', null, 'Need to get fit first'),
  ('00000000-0000-4000-b100-000000000004', '00000000-0000-4000-a000-000000000024', null, '00000000-0000-4000-b000-000000000002', 'Spa day next time in Islamabad'),
  ('00000000-0000-4000-b100-000000000006', '00000000-0000-4000-a000-000000000026', '00000000-0000-4000-e000-000000000008', null, null),
  ('00000000-0000-4000-b100-000000000005', '00000000-0000-4000-a000-000000000025', '00000000-0000-4000-e000-000000000003', null, null);

insert into public.place_recommendations (user_id, name, category_id, address, city, geo, note, status) values
  ('00000000-0000-4000-a000-000000000026', 'Old Anarkali rooftop chai spot', pg_temp.cat('food-drink'), 'Food Street, Old Anarkali', 'Lahore', pg_temp.pt(31.5687, 74.3087), 'Best kashmiri chai with a view of the old city.', 'new'),
  ('00000000-0000-4000-a000-000000000023', 'Hawke''s Bay turtle watch', pg_temp.cat('outdoor-adventure'), 'Hawke''s Bay', 'Karachi', pg_temp.pt(24.8580, 66.8640), 'Green turtle nesting season tours would be amazing.', 'reviewed');

insert into public.notifications (user_id, type, title, body, data, read_at, created_at) values
  ('00000000-0000-4000-a000-000000000021', 'booking_confirmed', 'Booking confirmed', 'Badshahi Mosque & Lahore Fort Heritage Tour is confirmed.', '{"screen": "booking"}', now() - interval '1 day', now() - interval '1 day'),
  ('00000000-0000-4000-a000-000000000021', 'new_message', 'Androon Walks replied', 'About 2 km in total with rest stops...', '{"screen": "chat", "conversation_id": "00000000-0000-4000-6000-000000000001"}', null, now() - interval '22 hours'),
  ('00000000-0000-4000-a000-000000000021', 'review_reply', 'Androon Walks replied to your review', 'Shukriya Hamza!...', '{"screen": "review"}', null, now() - interval '10 days'),
  ('00000000-0000-4000-a000-000000000026', 'group_invite', 'You''re invited to Lahore Food Squad', 'Hamza invited you to join.', '{"screen": "group", "group_id": "00000000-0000-4000-7000-000000000002"}', null, now() - interval '3 days'),
  ('00000000-0000-4000-a000-000000000026', 'refund', 'Refund added to your wallet', 'PKR 4,500 for Rawal Lake Morning Kayaking.', '{"screen": "wallet"}', null, now()),
  ('00000000-0000-4000-a000-000000000025', 'offer', 'PKR 500 off coastal trips', 'Use KARACHI500 on Karachi Coastal Co. bookings.', '{"screen": "offers"}', null, now() - interval '2 days');

insert into public.support_tickets (id, user_id, business_id, booking_id, subject, status) values
  ('00000000-0000-4000-5000-000000000001', '00000000-0000-4000-a000-000000000025', '00000000-0000-4000-b000-000000000006', '00000000-0000-4000-8000-000000000008', 'Marked as no-show but I was stuck in traffic', 'open');
insert into public.support_messages (ticket_id, sender_id, is_staff_reply, body) values
  ('00000000-0000-4000-5000-000000000001', '00000000-0000-4000-a000-000000000025', false, 'I reached Burns Road 20 minutes late because of traffic on Shahrah-e-Faisal and the group had left. Can I reschedule?'),
  ('00000000-0000-4000-5000-000000000001', '00000000-0000-4000-a000-000000000001', true, 'Sorry about that, Usman. We have asked Karachi Coastal Co. about moving you to another night.');

insert into public.legal_documents (type, version, title, body, published_at) values
  ('terms', '2026-11', 'Terms of Service', E'# Terms of Service\n\nPlaceholder terms for local development.', now() - interval '30 days'),
  ('privacy', '2026-11', 'Privacy Policy', E'# Privacy Policy\n\nPlaceholder privacy policy for local development.', now() - interval '30 days'),
  ('cancellation', '2026-11', 'Cancellation Policy', E'# Cancellation Policy\n\n- **Flexible:** full refund up to 24 hours before.\n- **Moderate:** full refund up to 48 hours before.\n- **Strict:** 50% refund up to 7 days before.\n- **Non-refundable:** no refund.', now() - interval '30 days');

insert into public.legal_acceptances (user_id, document_id)
select u.id, d.id
from auth.users u cross join public.legal_documents d
where d.type in ('terms', 'privacy');

-- ---------------------------------------------------------------------------
-- Home dashboard (local dev): tags and hosts for the extra experiences,
-- photos from the seed-media bucket, curation and display ratings.
-- ---------------------------------------------------------------------------
insert into public.listing_tags (business_id, listing_id, tag_id)
select l.business_id, l.id, t.id
from (values
  ('lok-virsa-heritage-museum', '{heritage,culture,history,family-friendly}'),
  ('daman-e-koh-family-evening', '{nature,family-friendly,photography}'),
  ('melody-food-street-tasting', '{food,street-food}'),
  ('little-chefs-islamabad', '{cooking,food,family-friendly}'),
  ('skardu-fly-in-day-trip', '{adventure,nature,photography}'),
  ('blue-area-night-bites', '{food,street-food,nightlife}'),
  ('lahore-museum-wonder-house', '{heritage,history,art,culture}'),
  ('fort-road-food-street-dinner', '{food,heritage,nightlife}'),
  ('gawalmandi-late-night-bites', '{food,street-food,nightlife}'),
  ('family-baking-afternoon', '{cooking,food,family-friendly}'),
  ('kids-pizza-workshop', '{cooking,family-friendly}'),
  ('jallo-park-family-day', '{nature,family-friendly,water}'),
  ('mohatta-palace-museum-visit', '{heritage,art,history}'),
  ('port-grand-night-market', '{food,nightlife,street-food}'),
  ('do-darya-seafood-evening', '{food,water}'),
  ('clifton-beach-family-day', '{water,family-friendly}'),
  ('boat-basin-street-food', '{food,street-food,nightlife}'),
  ('karachi-kids-cooking', '{cooking,family-friendly}'),
  -- Curation for the "Local fun" and "Must-trys" rails, three per city.
  ('daman-e-koh-family-evening', '{local-fun}'), ('blue-area-night-bites', '{local-fun}'), ('rawal-lake-kayaking', '{local-fun}'),
  ('fort-road-food-street-dinner', '{local-fun}'), ('jallo-park-family-day', '{local-fun}'), ('gawalmandi-late-night-bites', '{local-fun}'),
  ('port-grand-night-market', '{local-fun}'), ('clifton-beach-family-day', '{local-fun}'), ('boat-basin-street-food', '{local-fun}'),
  ('margalla-sunrise-hike', '{must-try}'), ('lok-virsa-heritage-museum', '{must-try}'), ('melody-food-street-tasting', '{must-try}'),
  ('walled-city-food-walk', '{must-try}'), ('badshahi-lahore-fort-tour', '{must-try}'), ('lahore-museum-wonder-house', '{must-try}'),
  ('burns-road-food-crawl', '{must-try}'), ('mohatta-palace-museum-visit', '{must-try}'), ('do-darya-seafood-evening', '{must-try}')
) as v(slug, tags)
join public.listings l on l.slug = v.slug
join public.tags t on t.slug = any (v.tags::text[])
on conflict do nothing;

insert into public.listing_staff (business_id, listing_id, staff_id)
select l.business_id, l.id, s.id
from (values
  ('lok-virsa-heritage-museum', 'Hira Abbasi'), ('daman-e-koh-family-evening', 'Faraz Khan'),
  ('melody-food-street-tasting', 'Hira Abbasi'), ('little-chefs-islamabad', 'Hira Abbasi'),
  ('skardu-fly-in-day-trip', 'Faraz Khan'), ('blue-area-night-bites', 'Faraz Khan'),
  ('lahore-museum-wonder-house', 'Nadia Butt'), ('fort-road-food-street-dinner', 'Usama Tariq'),
  ('gawalmandi-late-night-bites', 'Usama Tariq'), ('family-baking-afternoon', 'Ayesha Siddiqui'),
  ('kids-pizza-workshop', 'Ayesha Siddiqui'), ('jallo-park-family-day', 'Nadia Butt'),
  ('mohatta-palace-museum-visit', 'Shehzad Ali'), ('port-grand-night-market', 'Kamran Baloch'),
  ('do-darya-seafood-evening', 'Kamran Baloch'), ('clifton-beach-family-day', 'Shehzad Ali'),
  ('boat-basin-street-food', 'Kamran Baloch'), ('karachi-kids-cooking', 'Shehzad Ali')
) as v(slug, staff_name)
join public.listings l on l.slug = v.slug
join public.staff_members s on s.business_id = l.business_id and s.display_name = v.staff_name
on conflict do nothing;

-- Hosts get the cut-out photos from Figma (shown on coloured tiles); other staff round avatars.
update public.staff_members s
set avatar_url = case
  when s.is_host then 'storage://seed-media/hosts/host-' || (1 + (n.rn - 1) % 4) || '.png'
  else 'storage://seed-media/avatars/avatar-' || (1 + (n.rn - 1) % 2) || '.png'
end
from (select id, row_number() over (partition by is_host order by id) as rn from public.staff_members) n
where n.id = s.id;

-- Spa and salon logos (shown on service cards: "With Saffron Spa").
update public.businesses
set logo_url = case when slug = 'saffron-spa' then 'storage://seed-media/logos/serenity.png'
                    else 'storage://seed-media/logos/beauty.png' end
where kind = 'venue';

-- Display ratings so cards and hosts look like a live app. Real reviews
-- recalculate these (reviews trigger) as soon as they are added.
update public.listings
set rating_avg = 4.5 + (abs(hashtext(slug)) % 6) / 10.0,
    rating_count = 12 + abs(hashtext(slug || '#reviews')) % 230,
    popularity_score = round(((4.5 + (abs(hashtext(slug)) % 6) / 10.0) * ln(13 + abs(hashtext(slug || '#reviews')) % 230))::numeric, 4)
where status = 'published';

update public.staff_members
set rating_avg = 4.6 + (abs(hashtext(display_name)) % 5) / 10.0,
    rating_count = 20 + abs(hashtext(display_name || '#reviews')) % 180
where is_host;

-- ---------------------------------------------------------------------------
-- Business page (Figma "Business Look"): dev user, opening hours, gallery,
-- verified badges, services for every business, membership plans, and reviews
-- with photos (each backed by a completed booking).
-- ---------------------------------------------------------------------------

-- The dev auth bypass user (+92 300 1234567, test_otp 123456), already signed up,
-- so a fresh database doesn't ask to "Finish signing up" again.
select pg_temp.seed_user('00000000-0000-4000-a000-000000000099', 'dev@moment.test', 'Ali Raza', '+923001234567');
update public.profile_private
set first_name = 'Ali', last_name = 'Raza', date_of_birth = '1995-03-14', sign_up_completed_at = now()
where user_id = '00000000-0000-4000-a000-000000000099';
update public.profiles set home_city = 'Islamabad' where id = '00000000-0000-4000-a000-000000000099';

update public.businesses set is_verified = true
where slug in ('saffron-spa', 'margalla-trails', 'androon-walks', 'karachi-coastal', 'clifton-barber', 'ayeshas-lahori-kitchen');

-- Opening hours (Asia/Karachi wall clock). 0 = Sunday.
insert into public.business_hours (business_id, weekday, opens_at, closes_at)
select b.id, d.weekday, d.opens::time, d.closes::time
from public.businesses b
join (values
  -- Venues: 10-9 Monday to Saturday, 12-8 on Sunday
  ('venue', 1, '10:00', '21:00'), ('venue', 2, '10:00', '21:00'), ('venue', 3, '10:00', '21:00'),
  ('venue', 4, '10:00', '21:00'), ('venue', 5, '10:00', '21:00'), ('venue', 6, '10:00', '21:00'), ('venue', 0, '12:00', '20:00'),
  -- Operators run early hikes and late food walks: 6 am to 11 pm every day
  ('operator', 0, '06:00', '23:00'), ('operator', 1, '06:00', '23:00'), ('operator', 2, '06:00', '23:00'), ('operator', 3, '06:00', '23:00'),
  ('operator', 4, '06:00', '23:00'), ('operator', 5, '06:00', '23:00'), ('operator', 6, '06:00', '23:00'),
  -- Home hosts: Tuesday to Sunday afternoons and evenings
  ('host', 2, '11:00', '20:00'), ('host', 3, '11:00', '20:00'), ('host', 4, '11:00', '20:00'),
  ('host', 5, '11:00', '20:00'), ('host', 6, '11:00', '20:00'), ('host', 0, '11:00', '20:00')
) as d(kind, weekday, opens, closes) on d.kind = b.kind::text
where b.slug <> 'clifton-barber';
-- The barber closes for Friday prayers and stays open past midnight on Saturday.
insert into public.business_hours (business_id, weekday, opens_at, closes_at) values
  ('00000000-0000-4000-b000-000000000007', 1, '10:00', '22:00'), ('00000000-0000-4000-b000-000000000007', 2, '10:00', '22:00'),
  ('00000000-0000-4000-b000-000000000007', 3, '10:00', '22:00'), ('00000000-0000-4000-b000-000000000007', 4, '10:00', '22:00'),
  ('00000000-0000-4000-b000-000000000007', 5, '10:00', '12:30'), ('00000000-0000-4000-b000-000000000007', 5, '14:30', '22:00'),
  ('00000000-0000-4000-b000-000000000007', 6, '12:00', '01:00');

-- Hero gallery: Figma's business photos for the venues, listing photos for the rest.
insert into public.business_photos (business_id, url, sort_order)
select b.id, 'storage://seed-media/' || p.path, p.ord
from public.businesses b
join (values
  ('saffron-spa', 'business/spa-1.jpg', 1), ('saffron-spa', 'business/spa-2.jpg', 2), ('saffron-spa', 'business/spa-3.jpg', 3), ('saffron-spa', 'listings/spa-facial.jpg', 4),
  ('gulberg-glow', 'business/spa-2.jpg', 1), ('gulberg-glow', 'listings/spa-facial.jpg', 2), ('gulberg-glow', 'business/spa-3.jpg', 3),
  ('clifton-barber', 'business/spa-3.jpg', 1), ('clifton-barber', 'business/spa-1.jpg', 2),
  ('margalla-trails', 'listings/old-town-walk.jpg', 1), ('margalla-trails', 'listings/kids-adventure.jpg', 2), ('margalla-trails', 'listings/plane-window.jpg', 3),
  ('androon-walks', 'listings/old-town-walk.jpg', 1), ('androon-walks', 'listings/museum-gallery.jpg', 2), ('androon-walks', 'listings/night-market.jpg', 3),
  ('ayeshas-lahori-kitchen', 'listings/family-cooking.jpg', 1), ('ayeshas-lahori-kitchen', 'listings/kids-cooking.jpg', 2),
  ('karachi-coastal', 'listings/street-drinks.jpg', 1), ('karachi-coastal', 'listings/food-tasting.jpg', 2), ('karachi-coastal', 'listings/night-market.jpg', 3),
  ('hunza-heights', 'listings/plane-window.jpg', 1), ('hunza-heights', 'listings/kids-adventure.jpg', 2)
) as p(slug, path, ord) on p.slug = b.slug::text;

-- Services (appointment listings) so every business has a Services tab.
insert into public.listings (
  id, business_id, type, booking_mode, slug, title, summary, description, category_id, location_id,
  city, duration_minutes, min_guests, max_guests, price_amount, price_unit, instant_book, cancellation_policy, languages, status
)
select v.id::uuid, b.id, 'service', 'appointment', v.slug, v.title, v.summary, v.summary, pg_temp.cat(v.category), bl.id,
       bl.city, v.minutes, 1, v.max_guests, v.price, v.unit::public.price_unit, true, 'moderate', '{en,ur}', 'published'
from (values
  ('00000000-0000-4000-e000-000000000049', 'saffron-spa', 'hot-stone-massage', 'Hot Stone Massage', 'Warm basalt stones melt away tension in the back and shoulders.', 'spa-massage', 75, 1, 1100000, 'per_booking'),
  ('00000000-0000-4000-e000-000000000050', 'saffron-spa', 'express-cleanup-facial', 'Express Cleanup Facial', 'A quick deep clean and glow, 30 minutes.', 'skin-care', 30, 1, 350000, 'per_booking'),
  ('00000000-0000-4000-e000-000000000051', 'gulberg-glow', 'bridal-trial-makeup', 'Bridal Trial Makeup', 'Try your wedding look with our senior artist.', 'skin-care', 90, 1, 1500000, 'per_booking'),
  ('00000000-0000-4000-e000-000000000052', 'clifton-barber', 'kids-haircut', 'Kids'' Haircut', 'For under-12s, with a lollipop at the end.', 'hair', 30, 1, 150000, 'per_booking'),
  ('00000000-0000-4000-e000-000000000053', 'margalla-trails', 'private-trail-guide', 'Private Trail Guide (3 hours)', 'Your own guide on any Margalla trail, at your pace.', 'outdoor-adventure', 180, 6, 600000, 'per_booking'),
  ('00000000-0000-4000-e000-000000000054', 'margalla-trails', 'gear-rental-day', 'Hiking Gear Rental (1 day)', 'Poles, headlamp and a daypack, ready at the trailhead.', 'outdoor-adventure', 60, 1, 120000, 'per_person'),
  ('00000000-0000-4000-e000-000000000055', 'androon-walks', 'private-heritage-guide', 'Private Heritage Guide (2 hours)', 'A historian for your family or friends, any route in the Walled City.', 'tours-walks', 120, 8, 500000, 'per_booking'),
  ('00000000-0000-4000-e000-000000000056', 'ayeshas-lahori-kitchen', 'private-dinner-at-home', 'Private Dinner at Home', 'A four-course Lahori dinner cooked for your group.', 'food-drink', 150, 8, 1200000, 'per_booking'),
  ('00000000-0000-4000-e000-000000000057', 'karachi-coastal', 'private-boat-hire', 'Private Boat Hire (2 hours)', 'A boat and crew for sunset in the creek or a swim off Churna.', 'water-activities', 120, 10, 1800000, 'per_booking'),
  ('00000000-0000-4000-e000-000000000058', 'hunza-heights', 'private-jeep-day', 'Private Jeep with Driver (1 day)', 'Attabad, Passu and the Hussaini bridge on your own schedule.', 'day-trips', 480, 4, 2200000, 'per_booking')
) as v(id, slug_b, slug, title, summary, category, minutes, max_guests, price, unit)
join public.businesses b on b.slug = v.slug_b
join public.business_locations bl on bl.business_id = b.id and bl.is_primary;

insert into public.listing_media (business_id, listing_id, url, alt, sort_order)
select l.business_id, l.id, 'storage://seed-media/listings/' || m.file, l.title, 0
from public.listings l
join (values
  ('00000000-0000-4000-e000-000000000049', 'spa-facial.jpg'), ('00000000-0000-4000-e000-000000000050', 'spa-facial.jpg'),
  ('00000000-0000-4000-e000-000000000051', 'spa-facial.jpg'), ('00000000-0000-4000-e000-000000000052', 'street-drinks.jpg'),
  ('00000000-0000-4000-e000-000000000053', 'kids-adventure.jpg'), ('00000000-0000-4000-e000-000000000054', 'plane-window.jpg'),
  ('00000000-0000-4000-e000-000000000055', 'old-town-walk.jpg'), ('00000000-0000-4000-e000-000000000056', 'family-cooking.jpg'),
  ('00000000-0000-4000-e000-000000000057', 'food-tasting.jpg'), ('00000000-0000-4000-e000-000000000058', 'plane-window.jpg')
) as m(id, file) on m.id::uuid = l.id;

-- Options on a few services (length or add-ons).
insert into public.listing_options (business_id, listing_id, name, description, price_amount, duration_minutes, sort_order)
select l.business_id, l.id, o.name, o.description, o.price, o.minutes, o.ord
from public.listings l
join (values
  ('00000000-0000-4000-e000-000000000021', '60 minutes', 'Full body, medium pressure', 800000, 60, 1),
  ('00000000-0000-4000-e000-000000000021', '90 minutes', 'Full body with scalp and feet', 1100000, 90, 2),
  ('00000000-0000-4000-e000-000000000028', 'With hair wash', null, 250000, 40, 1),
  ('00000000-0000-4000-e000-000000000053', 'Add lunch at Monal', 'Lunch for up to 6 at the top', 900000, 240, 1)
) as o(listing, name, description, price, minutes, ord) on o.listing::uuid = l.id;

-- A membership plan for every business that doesn't have one.
insert into public.membership_plans (business_id, name, description, price_amount, interval, benefits, included_sessions, discount_percent, sort_order)
select b.id, v.name, v.description, v.price, v.period::public.membership_interval, v.benefits::jsonb, v.sessions, v.discount, 1
from (values
  ('gulberg-glow', 'Glow Monthly', 'A blow-dry every week and 15% off colour and nails.', 900000, 'month', '{"perks": ["4 x blow-dry", "15% off colour", "15% off nails"]}', 4, 15),
  ('margalla-trails', 'Trail Pass', 'Join any group hike for a year and bring a friend once a month.', 2500000, 'year', '{"perks": ["Unlimited group hikes", "Monthly guest pass", "10% off private guides"]}', null, 10),
  ('androon-walks', 'Walled City Friend', 'Four guided walks a year and 10% off food walks.', 1200000, 'year', '{"perks": ["4 heritage walks", "10% off food walks"]}', 4, 10),
  ('ayeshas-lahori-kitchen', 'Kitchen Club', 'One cooking class a month and recipe cards for every class.', 600000, 'month', '{"perks": ["1 class a month", "Recipe cards", "Spice box on joining"]}', 1, 0),
  ('karachi-coastal', 'Sea Pass', 'Two water trips a month and priority on Churna weekends.', 1800000, 'month', '{"perks": ["2 water trips", "Priority weekend booking", "Free snorkel hire"]}', 2, 10),
  ('hunza-heights', 'Hunza Season Pass', 'Two day trips in the summer season and 15% off jeep hire.', 3500000, 'one_time', '{"perks": ["2 day trips", "15% off jeep hire"]}', 2, 15),
  ('saffron-spa', 'Saffron Glow Monthly', 'One facial a month and 15% off skin care.', 600000, 'month', '{"perks": ["1 facial a month", "15% off skin care"]}', 1, 15)
) as v(slug, name, description, price, period, benefits, sessions, discount)
join public.businesses b on b.slug = v.slug;

-- Past bookings for more reviews (3 per business) and two for the dev user to review.
insert into public.bookings (
  id, business_id, consumer_id, listing_id, location_id, starts_at, ends_at, guest_count, status,
  contact_name, contact_phone, contact_email, subtotal_amount, discount_amount, total_amount, source, created_at
)
select v.id::uuid, l.business_id, v.consumer::uuid, l.id, l.location_id,
       pg_temp.pk(pg_temp.today() - v.days_ago, '16:00'), pg_temp.pk(pg_temp.today() - v.days_ago, '16:00') + make_interval(mins => l.duration_minutes),
       1, 'completed', p.display_name, '+92300' || right(v.consumer, 7), null, l.price_amount, 0, l.price_amount, 'app', now() - make_interval(days => v.days_ago + 3)
from (values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-a000-000000000023', '00000000-0000-4000-e000-000000000049', 20),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-a000-000000000024', '00000000-0000-4000-e000-000000000024', 16),
  ('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-a000-000000000026', '00000000-0000-4000-e000-000000000023', 11),
  ('00000000-0000-4000-8000-000000000014', '00000000-0000-4000-a000-000000000021', '00000000-0000-4000-e000-000000000025', 22),
  ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-a000-000000000026', '00000000-0000-4000-e000-000000000051', 13),
  ('00000000-0000-4000-8000-000000000016', '00000000-0000-4000-a000-000000000023', '00000000-0000-4000-e000-000000000028', 9),
  ('00000000-0000-4000-8000-000000000017', '00000000-0000-4000-a000-000000000021', '00000000-0000-4000-e000-000000000052', 17),
  ('00000000-0000-4000-8000-000000000018', '00000000-0000-4000-a000-000000000022', '00000000-0000-4000-e000-000000000053', 25),
  ('00000000-0000-4000-8000-000000000019', '00000000-0000-4000-a000-000000000026', '00000000-0000-4000-e000-000000000054', 14),
  ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-a000-000000000024', '00000000-0000-4000-e000-000000000055', 19),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-a000-000000000025', '00000000-0000-4000-e000-000000000055', 8),
  ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-a000-000000000021', '00000000-0000-4000-e000-000000000056', 21),
  ('00000000-0000-4000-8000-000000000023', '00000000-0000-4000-a000-000000000023', '00000000-0000-4000-e000-000000000056', 10),
  ('00000000-0000-4000-8000-000000000024', '00000000-0000-4000-a000-000000000022', '00000000-0000-4000-e000-000000000057', 12),
  ('00000000-0000-4000-8000-000000000025', '00000000-0000-4000-a000-000000000026', '00000000-0000-4000-e000-000000000057', 26),
  ('00000000-0000-4000-8000-000000000026', '00000000-0000-4000-a000-000000000021', '00000000-0000-4000-e000-000000000058', 30),
  ('00000000-0000-4000-8000-000000000027', '00000000-0000-4000-a000-000000000024', '00000000-0000-4000-e000-000000000058', 28),
  -- The dev user's visits, not reviewed yet ("Write a review" is enabled for these)
  ('00000000-0000-4000-8000-000000000098', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-e000-000000000021', 6),
  ('00000000-0000-4000-8000-000000000099', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-e000-000000000053', 4)
) as v(id, consumer, listing, days_ago)
join public.listings l on l.id = v.listing::uuid
join public.profiles p on p.id = v.consumer::uuid;

insert into public.reviews (booking_id, author_id, rating, body, photos, created_at)
select v.booking::uuid, b.consumer_id, v.rating, v.body, v.photos::text[], now() - make_interval(days => v.days_ago)
from (values
  ('00000000-0000-4000-8000-000000000011', 5, 'The hot stones were heavenly. Best massage I have had in Islamabad, and the room smelled of jasmine.', '{storage://seed-media/reviews/spa-room.jpg,storage://seed-media/reviews/spa-stones.jpg}', 18),
  ('00000000-0000-4000-8000-000000000012', 4, 'My skin was glowing for days. Booking was easy, but parking outside is tight.', '{storage://seed-media/reviews/spa-facial.jpg}', 14),
  ('00000000-0000-4000-8000-000000000013', 5, 'The hammam ritual is worth every rupee. Ask for Mehwish.', '{}', 9),
  ('00000000-0000-4000-8000-000000000014', 4, 'Great blow-dry that lasted the whole wedding weekend.', '{}', 20),
  ('00000000-0000-4000-8000-000000000015', 3, 'Lovely trial look, though it ran 40 minutes over.', '{storage://seed-media/reviews/spa-facial.jpg}', 11),
  ('00000000-0000-4000-8000-000000000016', 5, 'Clean fade, quick service, fair price. My new regular.', '{}', 7),
  ('00000000-0000-4000-8000-000000000017', 4, 'My son loved it and sat still for once.', '{}', 15),
  ('00000000-0000-4000-8000-000000000018', 5, 'Our guide took us up Trail 5 at sunrise and knew every bird by name.', '{storage://seed-media/listings/kids-adventure.jpg}', 23),
  ('00000000-0000-4000-8000-000000000019', 4, 'Gear was in good shape. The headlamp saved us on the way down.', '{}', 12),
  ('00000000-0000-4000-8000-000000000020', 5, 'Private walk through Delhi Gate with stories I had never heard. Highly recommend.', '{storage://seed-media/listings/old-town-walk.jpg}', 17),
  ('00000000-0000-4000-8000-000000000021', 2, 'Good guide but we started late and missed the mosque before closing.', '{}', 6),
  ('00000000-0000-4000-8000-000000000022', 5, 'Ayesha cooked a feast for our family reunion. The haleem was unreal.', '{storage://seed-media/listings/family-cooking.jpg}', 19),
  ('00000000-0000-4000-8000-000000000023', 4, 'Warm hosts and generous portions. Dessert could have been sweeter.', '{}', 8),
  ('00000000-0000-4000-8000-000000000024', 5, 'Sunset in the creek with chai on board. Magical.', '{storage://seed-media/listings/food-tasting.jpg}', 10),
  ('00000000-0000-4000-8000-000000000025', 3, 'Boat was fine, but the crew arrived 30 minutes late.', '{}', 24),
  ('00000000-0000-4000-8000-000000000026', 5, 'Our driver knew every viewpoint. Passu cones at golden hour!', '{storage://seed-media/listings/plane-window.jpg}', 28),
  ('00000000-0000-4000-8000-000000000027', 4, 'Comfortable jeep and a careful driver on the KKH.', '{}', 26)
) as v(booking, rating, body, photos, days_ago)
join public.bookings b on b.id = v.booking::uuid;

-- ---------------------------------------------------------------------------
-- Booking Flow: upcoming slots for every experience, bookable staff with
-- schedules for every service, request-to-book listings, pets and private
-- groups, a sold-out and an almost-full slot, and coupons in every city.
-- ---------------------------------------------------------------------------

-- Every service gets a bookable staff member with a weekly schedule.
update public.staff_members s set is_bookable = true
where s.business_id in (select business_id from public.listings where type = 'service')
  and not exists (select 1 from public.staff_members o where o.business_id = s.business_id and o.is_bookable);

insert into public.listing_staff (business_id, listing_id, staff_id)
select l.business_id, l.id, (select s.id from public.staff_members s where s.business_id = l.business_id and s.is_bookable order by s.display_name limit 1)
from public.listings l
where l.type = 'service'
  and not exists (
    select 1 from public.listing_staff ls join public.staff_members s on s.id = ls.staff_id
    where ls.listing_id = l.id and s.is_bookable
  );

-- Schedules (ISO weekday, 1 = Monday) for bookable staff who have none yet.
insert into public.staff_schedules (business_id, staff_id, location_id, weekday, start_time, end_time)
select s.business_id, s.id, l.id, d.weekday, d.start_time, d.end_time
from public.staff_members s
join public.business_locations l on l.business_id = s.business_id and l.is_primary
cross join (values
  (1, '09:00'::time, '19:00'::time), (2, '09:00', '19:00'), (3, '09:00', '19:00'),
  (4, '09:00', '19:00'), (5, '09:00', '12:30'), (5, '14:30', '19:00'), (6, '10:00', '18:00')
) as d(weekday, start_time, end_time)
where s.is_bookable and not exists (select 1 from public.staff_schedules x where x.staff_id = s.id);

-- Daily sessions for the next three weeks for experiences without upcoming slots,
-- at a time of day that suits each one (food in the evening, the rest earlier).
insert into public.slots (business_id, listing_id, staff_id, starts_at, ends_at, capacity)
select l.business_id, l.id,
       (select ls.staff_id from public.listing_staff ls where ls.listing_id = l.id limit 1),
       pg_temp.pk(pg_temp.today() + d, t.start_at),
       pg_temp.pk(pg_temp.today() + d, t.start_at) + make_interval(mins => l.duration_minutes),
       l.max_guests
from public.listings l
cross join generate_series(1, 21) d
cross join lateral (
  select case when c.slug = 'food-drink' then '18:00'::time
              when l.duration_minutes >= 360 then '07:00'::time
              else ('09:00'::time + make_interval(hours => abs(hashtext(l.slug)) % 6)) end as start_at
  from public.categories c where c.id = l.category_id
) t
where l.status = 'published' and l.booking_mode = 'slot'
  and not exists (select 1 from public.slots s where s.listing_id = l.id and s.starts_at > now());

-- Some listings need the owner to accept (request to book).
update public.listings set instant_book = false
where slug in ('sandspit-mangrove-kayaking', 'lahori-home-cooking-class', 'keratin-treatment', 'bridal-trial-makeup',
               'private-dinner-at-home', 'skardu-fly-in-day-trip', 'fort-road-food-street-dinner');

-- Pets welcome on outdoor family trips; private sessions on a few experiences.
update public.listings set pets_allowed = true
where slug in ('margalla-sunrise-hike', 'daman-e-koh-family-evening', 'jallo-park-family-day', 'clifton-beach-family-day');
update public.listings set private_price_amount = v.price
from (values
  ('margalla-sunrise-hike', 2000000), ('rawal-lake-kayaking', 3000000), ('lahori-home-cooking-class', 4500000),
  ('churna-island-snorkeling', 8000000), ('fort-road-food-street-dinner', 4000000), ('lok-virsa-heritage-museum', 2000000)
) as v(slug, price)
where listings.slug = v.slug;

-- Tomorrow's Saidpur walk is sold out; the day after has one seat left.
insert into public.bookings (
  id, business_id, consumer_id, listing_id, slot_id, location_id, starts_at, ends_at, guest_count, status,
  contact_name, contact_phone, subtotal_amount, discount_amount, total_amount, source
)
select v.id::uuid, l.business_id, v.consumer::uuid, l.id, s.id, l.location_id, s.starts_at, s.ends_at,
       s.capacity - v.leave, 'confirmed', 'Seed guest', '+923000000099',
       l.price_amount * (s.capacity - v.leave), 0, l.price_amount * (s.capacity - v.leave), 'app'
from (values
  ('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-a000-000000000023', 1, 0),
  ('00000000-0000-4000-8000-000000000032', '00000000-0000-4000-a000-000000000024', 2, 1)
) as v(id, consumer, day, leave)
join public.listings l on l.slug = 'saidpur-faisal-golden-hour'
join lateral (
  select * from public.slots s where s.listing_id = l.id and s.starts_at::date >= pg_temp.today() + v.day
  order by s.starts_at limit 1
) s on true;

-- Coupons: one public deal per city, a big-spend deal, and two that fail.
insert into public.coupons (business_id, code, title, description, discount_type, discount_value, max_discount_amount, min_subtotal_amount, per_user_limit, starts_at, ends_at, is_public)
select b.id, v.code, v.title, v.description, v.dtype::public.discount_type, v.value, v.max_discount, v.min_spend, 1, v.starts::timestamptz, v.ends::timestamptz, v.public
from (values
  ('margalla-trails', 'ISB15', 'Islamabad 15% off', '15% off any Margalla Trails booking, up to Rs 1,500.', 'percent', 15, 150000, 0, now() - interval '1 day', now() + interval '60 days', true),
  ('androon-walks', 'LAHORE300', 'Rs 300 off in Lahore', 'Rs 300 off any Androon Walks booking over Rs 2,000.', 'fixed', 30000, null, 200000, now() - interval '1 day', now() + interval '60 days', true),
  (null, 'BIGSPEND', '20% off big plans', '20% off bookings over Rs 20,000, up to Rs 5,000.', 'percent', 20, 500000, 2000000, now() - interval '1 day', now() + interval '60 days', true),
  (null, 'SUMMER24', 'Summer 2024', 'Last summer''s deal.', 'percent', 25, null, 0, now() - interval '200 days', now() - interval '100 days', false)
) as v(slug, code, title, description, dtype, value, max_discount, min_spend, starts, ends, public)
left join public.businesses b on b.slug = v.slug;
