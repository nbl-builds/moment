# Moment database

Supabase Postgres 17. Source of truth is `supabase/migrations`; this document explains the design. Update it when the schema changes.

Generated types: `packages/shared/src/types/database.types.ts` (`pnpm db:types`).

## Launch context

- Market: Pakistan (Islamabad, Lahore, Karachi first).
- Defaults: currency `PKR`, timezone `Asia/Karachi`, phone numbers `+92`.
- Money is stored as integers in **minor units** (PKR has 2 decimals per ISO 4217, so PKR 4,500 = `450000`). Every amount has a `currency` column next to it.

## Principles

1. **One account, many roles.** Every signed-in user is a consumer. Business access comes from `business_members` (owner, manager or staff, per business). Platform access comes from `platform_admins`. A spa owner books tours with the same login.
2. **`business_id` everywhere.** Every table holding business data carries `business_id`, including child tables (slots, bookings, payments, reviews). RLS checks are a single indexed lookup. Composite foreign keys such as `(business_id, listing_id)` stop rows from pointing at another business's data.
3. **One listings table** for experiences and services (`type = experience | service`), sharing the booking engine and reviews.
4. **Two availability modes.** `slot` mode: materialised sessions with seat capacity (tours). `appointment` mode: times computed from staff schedules; an exclusion constraint makes staff double-booking impossible.
5. **Sensitive writes go through functions.** Consumers never insert bookings directly: `create_booking` locks the slot, checks capacity, prices server-side and applies coupons. Payment rows are written by backend code (service role), with an exception for businesses recording cash or manual payments.
6. **Provider-agnostic payments.** No payment provider is assumed (Stripe is not available in Pakistan). See [Payments](#payments).
7. **POS is just another client.** A POS signs in as a business user and gets the same RLS. `business_api_keys` support device integrations through an edge function later. `source` and `external_ref` columns support sync.
8. **Passcode and Face ID are on-device only** (secure store), never in the database.
9. **RLS on every table**, created in the same migration as the table. A test fails if any public table lacks RLS.

## Conventions for new migrations

- **Enable RLS and add policies in the same migration as the table.** `00_structure.test.sql` fails otherwise.
- **Index every foreign key** (the test checks this too).
- **User-facing relations reference `public.profiles(id)`**, not `auth.users(id)`, so the API can embed names and avatars (`reviews?select=*,profiles:author_id(display_name)`). Use `auth.users` only for internal columns (audit actors, `created_by`).
- **Guard triggers use `private.is_client_request()`** (true when the caller is `anon`/`authenticated` and not a super admin) and must be `security invoker`. Internal `security definer` functions run as the owner, so the stats and fields they maintain are not reverted by guards. Checking `auth.uid() is not null` instead is a bug: it is still set inside definer functions.
- **Functions referenced by a policy live in `private`**, are `security definer stable`, and set `search_path = ''`.
- **RPCs that use another table's row type** must be created after that table (plpgsql resolves declared types at creation).
- **Column-level privileges**: revoke the table-level grant first, then grant columns. `business_api_keys` hides `key_hash` this way, so select its columns explicitly (`select('id, name, key_prefix, ...')`, not `*`).
- **PostGIS columns** are typed `unknown` in the generated types. Write them as EWKT with `toGeoPoint(lat, lng)` from `@moment/shared`. Reads return WKB hex; the map work will add a view or RPC that returns lat/lng.

## Roles

| Role | Where it comes from | Can do |
|---|---|---|
| anon | not signed in | Browse published listings, active businesses, public hosts, published reviews, categories, quiz content |
| consumer | any signed-in user | Own profile, bookings (via RPCs), reviews of completed bookings, bucket list, quiz, groups, chat, memberships, wallet |
| staff | `business_members.role = 'staff'` | Read their business's data, manage bookings, chat as the business, reply to reviews |
| manager | `business_members.role = 'manager'` | Staff abilities plus listings, prices, options, media, staff profiles, schedules, availability, slots, coupons, membership plans |
| owner | `business_members.role = 'owner'` | Everything for the business: business settings, locations, payouts, team membership and roles, API keys |
| super admin | `platform_admins` row | Everything, through explicit policies (RLS is never disabled) |

Managers cannot change payouts, business settings or team membership. A business always keeps at least one active owner (enforced by trigger).

RLS helpers live in the `private` schema (not exposed through the API), are `security definer`, `stable`, and use an empty `search_path`:

- `private.is_super_admin()`
- `private.is_business_member(business_id)`
- `private.has_business_role(business_id, roles[])`
- `private.is_business_active(business_id)`
- `private.is_group_member(group_id)`, `private.is_group_admin(group_id)`
- `private.can_access_conversation(conversation_id)`

## Tables

### Identity
- `profiles`: public card (display name, avatar, bio, home city, personality badge). Readable by everyone, so review authors can be shown. Users edit only display fields; the badge is set by `submit_quiz`.
- `profile_private`: email, phone, first and last name, date of birth, locale, notification preferences, and `sign_up_completed_at` (set by "Finish signing up"; while it is null the app shows that screen after sign in, see `api.auth.needsSignUp()`). Owner only.
- `platform_admins`: super admins.
- A trigger on `auth.users` creates `profiles` and `profile_private` at sign-up.
- `email_sign_in_method(email)` (callable signed out) returns `password`, `code` or `new`, so the app can route "Login or sign up" with email to Enter Password, an email code, or sign up. It reveals whether an email has an account; that is an accepted product trade-off. Add rate limiting (e.g. an edge function or API gateway rule) before launch.

### Businesses and team
- `businesses`: name, slug, kind (`host | operator | venue`), status (`draft | pending_review | active | suspended`), currency, timezone, ratings. Anyone signed in can create one (as `draft`); the creator becomes owner. Only super admins change `status`.
- `business_private`: legal name, tax ID (NTN), contact, payout model override. Owner only.
- `business_locations`: address, city, PostGIS `geo` point, timezone. `business_location_points(business_id)` returns them as lat/lng (map pin, distance).
- `businesses.is_verified`: the verified badge on the business page; set by admins.
- `business_hours`: opening periods per weekday (0 = Sunday), wall-clock in the business's timezone (Asia/Karachi). Several periods a day are allowed (a prayer break); a period whose close is not after its open runs past midnight. No rows for a day = closed. `business_is_open(business_id, at)` answers "Open now"; `openingStatus()` in `@moment/shared` does the same on the device. Public read for active businesses; owners and managers edit.
- `business_photos`: the business page's hero gallery, in `sort_order`. Public read for active businesses; owners and managers edit.
- `business_members`: user, role (`owner | manager | staff`), status (`invited | active`).
- `staff_members`: people who deliver services or host experiences. `user_id` is optional (a stylist may never log in). `is_host` makes a public host profile; `is_bookable` makes them selectable for appointments.
- `staff_schedules`: weekly working hours per staff member.

**Hosts.** A host is a `staff_member` with `is_host = true`. "Top Hosts" ranks them by rating. A solo local host is a business of kind `host` with one staff member linked to the owner's login.

### Catalog
- `categories` (nestable, by kind), `tags` (drive recommendations).
- Curation tags `local-fun` and `must-try` fill the Home rails "Local fun" and "Must-trys" (tagged listings in the user's city).
- `listing_distances(lat, lng, listing_ids)` returns km to each listing (meeting point, else business location) for cards.
- `listings`: type, booking mode, title, description, category, location, meeting point, duration, guest limits, price and price unit (`per_person | per_booking`), instant book, cancellation policy, languages, inclusions, status, ratings, popularity, full-text `search_vector`, `external_ref`.
- `listing_options` (price tiers or variants), `listing_media`, `listing_tags`, `listing_staff`.

### Availability
- `availability_rules`: recurring sessions for slot-mode listings.
- `availability_exceptions`: closures or changed hours for a business, listing or staff member.
- `slots`: concrete sessions with capacity and `seats_booked` (kept in sync by trigger). Generated 90 days ahead by `private.generate_slots()`, nightly via pg_cron and whenever rules change.
- `get_available_times(listing, date, staff?)`: appointment-mode times from schedules minus exceptions and existing bookings.

### Bookings
- `bookings`: code, consumer, business, listing, slot or appointment time and staff, guests, status, payment status, contact snapshot, amounts, coupon, group, source (`app | web | portal | pos`), idempotency key, external ref, cancellation details.
- `booking_items` (option lines), `booking_events` (status history, written by trigger).
- RPCs: `create_booking`, `cancel_booking` (consumer), `update_booking_status` (business).
- `create_bookings(p_bookings jsonb, ...)`: a services cart (several appointment services, one visit) in one transaction, all or nothing; the coupon applies to the most expensive service; idempotent per key (`<key>:<index>`).
- `quote_booking(listing, guests, items, coupon, private)`: the Confirm screen's subtotal and coupon discount, priced exactly as `create_booking` will (shared `private.booking_subtotal` and `private.apply_coupon`). A bad coupon returns `coupon_error` ("This code has expired", "Spend at least ... to use this code", ...) instead of raising.
- `available_dates(listing, from, to)`: days with at least one free appointment time ("Select Date").
- Private groups: `listings.private_price_amount` (null = not offered) books a whole session for one price; `bookings.is_private` makes the slot count as full. `listings.pets_allowed` drives the Pets stepper on Add Guest.
- Tax and the service fee are added on the device from `BOOKING_CHARGES` in `@moment/shared` (placeholder rates); `bookings.total_amount` is the server's subtotal minus discount. Cancellation rules per policy are in `CANCELLATION_POLICIES`.
- A phone confirmed after sign up (`auth.users.phone`) is copied to `profile_private.phone` by trigger.
- Status flow: `pending -> confirmed -> completed | no_show`, or `cancelled_by_consumer | cancelled_by_business`.

### Payments
No provider is built in yet. Every money movement stores:
- `provider`: free text slug (`jazzcash`, `easypaisa`, `safepay`, `payfast`, `bank_transfer`, `cash`, `manual`, ...).
- `provider_transaction_ref`: the provider's transaction ID.
- `provider_account_ref`: which merchant account received the money.

The payout model stays open. `payout_model` is `direct` (customer pays the business's own merchant account; Moment invoices or deducts its fee) or `platform_collect` (Moment collects and pays businesses out). The platform default lives in `platform_settings` (`payments.default_payout_model`); `business_private.payout_model` overrides it per business. Each payment records `collected_by` so both models can run side by side.

Tables:
- `payments`: booking or membership, payer, amount, `platform_fee_amount`, provider refs, `collected_by`, status, method, paid time, metadata.
- `refunds`: per payment, with provider refund ref.
- `payout_accounts`: a business's bank or wallet accounts for receiving money (masked display + provider reference). Owner only.
- `payouts` and `payout_items`: Moment-to-business transfers under `platform_collect`.
- `payment_customers`: a user's customer reference at a provider.
- `wallet_transactions` and the `wallet_balances` view: in-app credit ledger.

A trigger keeps `bookings.payment_status` in sync with succeeded payments and refunds.

### Reviews
- `reviews`: one per booking, only for your own completed booking. Business, listing and staff are filled from the booking by trigger. Status (`published | hidden | flagged`) is changed by super admins only.
- `reply_to_review` RPC for business replies.
- `reviewable_bookings(business_id)`: the signed-in user's completed, not-yet-reviewed bookings at a business. Empty means "You can review after your visit".
- Review photos go to the `review-photos` bucket and their public URLs into `reviews.photos`.
- Rating averages and counts on listings, businesses and staff are kept up to date by trigger.

### Consumer features
- `bucket_lists`: a user's named lists (name 1-60 characters, `share_token` for "Share a link", owner-only RLS). Existing saves were moved into a list named "My bucket list" per user.
- `bucket_list_items`: a listing or a business in one list, plus a note. Unique per list, so the same listing can be in several lists; a composite FK (`bucket_list_id`, `user_id`) keeps items in their owner's lists. Deleting a list deletes its items. `api.bucketList.savedIds()` maps each saved listing to the lists holding it (filled hearts, ticks in the list picker).
- `place_recommendations`: "Recommend a place", triaged by the Moment team.

### Quiz and badges
- `quiz_questions` with a `kind` (`quiz_question_kind`: `photo_list`, `emoji_list`, `glass`, `seat`, `slider`) and a kind-specific `config` jsonb. Config refers to answers by `sort_order`:
  - `glass`: `{"top": 1, "bottom": 2}` (which half of the glass picks which answer)
  - `seat`: `{"rows": 3, "columns": [1, 2, 2, 1]}` (seat column -> answer: window, aisle, aisle, window)
  - `slider`: `{"min": 0, "max": 50, "default": 20, "unit": "C", "buckets": [{"answer": 1, "max": 14}, ...]}` (a value up to `max` picks that answer)
- `quiz_answers` with `trait_weights` (e.g. `{"adventure": 2}`) and an optional `image_url` (photo or emoji, storage ref). Every interaction, including the glass, seat and thermometer, resolves to one answer row per question.
- `badges` (personality or achievement, with a `primary_trait`; `icon` holds the result illustration as a storage ref when there is one), `badge_tags` (weights driving recommendations).
- `quiz_results`, `user_badges`.
- `submit_quiz(answer_ids)` scores on the server and sets the profile badge. Retaking replaces the earlier result: the user's previous `quiz_results` rows and quiz-awarded personality badge are removed first.
- Seed: Figma's six questions (Adventure Quiz 20:2103 ... 20:2453) with photos in `seed-media/quiz`; badges Nature Lover, Adventure Lover, Culture Lover, Food Lover, Wellness Lover, Party Lover (codes unchanged). `supabase/tests/database/07_quiz.test.sql` checks every badge can be earned.
- `recommended_listings(limit)` powers "Just For You".

### Groups
- `groups`: owner, destination, dates, visibility (`private | public`), open to match, max members, interests.
- `group_members`: role (`owner | admin | member`), status (`invited | requested | active | left`).
- Creating a group adds the owner and creates the group chat.
- `find_matching_groups(city, start, end)` powers Group Match.

### Chat
- `conversations` (`direct | business | group`), `conversation_participants`, `messages`.
- Business conversations are a shared inbox: every active member of the business can read and reply (as the business).
- Group conversations are open to active group members.
- Realtime: an insert trigger broadcasts each message to the private channel `conversation:<id>`; policies on `realtime.messages` authorise subscribers.
- RPCs: `start_direct_conversation`, `start_business_conversation`.

### Memberships and coupons
- `membership_plans`: `business_id` is null for Moment platform plans. Price, interval, benefits, provider plan ref.
- `memberships`: user, plan, status, period end, sessions remaining, provider subscription ref.
- `coupons`: `business_id` null for platform coupons. Percent or fixed, caps, minimum spend, redemption limits, dates, listing scope, `is_public` for the Offers screen.
- `coupon_redemptions`: written by `create_booking`. Consumers can only list public coupons.

### Profile, support, platform, POS
- `notifications`, `push_tokens`.
- `support_tickets`, `support_messages`.
- `legal_documents` (versioned), `legal_acceptances`.
- `platform_settings`: key/value, with `is_public` for settings clients may read.
- `audit_log`: written by triggers on businesses, business_private, members, payout accounts, listings and options.
- `business_api_keys`: hashed keys created by `create_business_api_key` (plaintext returned once).

### Storage buckets
- `avatars` (public read, users write their own folder `<user_id>/...`)
- `business-media` (public read, owners and managers write `<business_id>/...`)
- `chat-attachments` (private, conversation participants, `<conversation_id>/...`)
- `review-photos` (public read, users write their own folder `<user_id>/...`)
- `seed-media` (local dev only, public): images exported from Figma in `supabase/seed-media`, uploaded on `supabase db reset`. Media columns may hold `storage://<bucket>/<path>` references; the API client resolves them to public URLs for the app's own Supabase host.

## Indexes

Every foreign key is indexed. Notable extras:
- RLS: `business_members (user_id, business_id) where status = 'active'`.
- Discovery: GiST on location `geo` and listing `meeting_point`; GIN on `listings.search_vector`; trigram on `listings.title`; `listings (status, category_id, popularity_score desc)`.
- Booking: `slots (listing_id, starts_at) where status = 'open'`; `bookings (consumer_id, starts_at desc)`; `bookings (business_id, starts_at)`; GiST exclusion on `(staff_id, during)` for appointments.
- Feeds: `messages (conversation_id, created_at desc)`; published reviews by listing; unread notifications.
- Uniques: booking code, `(provider, provider_transaction_ref)`, coupon code per business (case-insensitive), one review per booking, idempotency key per consumer.

## Local development

```bash
pnpm db:reset    # re-run migrations + seed
pnpm db:test     # pgTAP tests in supabase/tests
pnpm db:lint     # plpgsql_check over public and private
pnpm db:types    # regenerate packages/shared/src/types/database.types.ts
```

### Tests (`supabase/tests/database`)
- `00_structure`: RLS on every table, a policy on every table, pinned `search_path` on definer functions, every FK indexed, money columns are integers.
- `01_tenant_isolation`: anon, consumer, staff, manager, owner and super admin each get exactly their permissions; businesses never see each other's data.
- `02_bookings`: capacity and overbooking, idempotent retries, appointment double-booking (RPC and exclusion constraint), coupons, cancellation and status rules.
- `03_social_and_payments`: reviews only for completed bookings, business replies, chat and realtime access, groups and joining rules, cash payments vs provider payments.
- `04`-`08`: sign up, email sign-in, Home dashboard, Adventure Quiz, bucket lists.
- `10_booking_flow`: quotes and coupon reasons, sold-out and private slots, services cart (coupon once, idempotent, all or nothing), calendar days, phone sync.
- `09_business_page`: opening hours and `business_is_open` (split days, past midnight), gallery and hours RLS, seed coverage, review-photo uploads, `reviewable_bookings`, location points.

### Seed data (local only)
Every account uses password `password123`. Emails end in `@moment.test`.

| Account | Role |
|---|---|
| admin@moment.test | Super admin |
| dev@moment.test | The dev auth bypass user (+92 300 1234567, code 123456), already signed up, with unreviewed visits to Saffron Spa and Margalla Trails |

Booking test data: daily sessions for three weeks on every experience; tomorrow's "Saidpur Village & Faisal Mosque Golden Hour Walk" is sold out and the day after has one seat left; request-to-book listings include the Lahori cooking class and the Skardu day trip; pets on the Margalla hike and family outings; private sessions on six experiences. Coupons: `ISB15` (Margalla Trails), `LAHORE300` (Androon Walks, min Rs 2,000), `KARACHI500`, `SAFFRON20`, `WELCOME10`, `BIGSPEND` (min Rs 20,000), and the expired `SUMMER24`.
| owner.margalla@ | Owner, Margalla Trails Co. (Islamabad) |
| owner.saffron@ | Owner, Saffron Spa & Wellness (Islamabad) |
| manager.saffron@ | Manager, Saffron Spa |
| staff.saffron@ | Staff (therapist), Saffron Spa |
| owner.androon@ | Owner, Androon Walks (Lahore) |
| staff.androon@ | Staff (guide), Androon Walks |
| ayesha@ | Solo host, Ayesha's Lahori Kitchen (Lahore) |
| owner.glow@ | Owner, Gulberg Glow Salon (Lahore) |
| owner.coastal@ | Owner, Karachi Coastal Co. (Karachi) |
| owner.barber@ | Owner, The Clifton Barber (Karachi) |
| owner.hunza@ | Owner, Hunza Heights Tours (pending review) |
| hamza@, fatima@, bilal@, zainab@, usman@, sana@ | Consumers |

Businesses are fictional. Seed slots are generated relative to `now()`, so the data never goes stale.
