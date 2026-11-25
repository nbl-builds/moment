# Moment Roadmap

Keep this file current: tick items as they land and update **Next up** so any session can pick up where the last one stopped.

## Next up
- Maps: Explore uses react-native-maps with the default provider (Apple Maps on iOS, muted style; Google on Android). Decide Mapbox vs Google before launch; Figma's grey map style needs the Google provider (`customMapStyle`) or Mapbox
- Phase 1 remaining: Supabase Auth providers for production (a Pakistan SMS provider for phone OTP, email, Apple, Google, Facebook). Locally, phone OTP works with the test numbers in `supabase/config.toml` (`+92 308 4282001` / `051518`, `+92 300 1234567` / `123456`)
- Sign-in providers at the end: a Pakistan SMS provider (production phone OTP), Apple, Google and Facebook (buttons show "Coming soon" today), and production SMTP for auth emails (templates in `supabase/templates`)
- Before launch: rate-limit `email_sign_in_method` (it reveals whether an email has an account), and set `moment://**` as a redirect URL on the hosted project
- Dev auth bypass for testing screens: `EXPO_PUBLIC_AUTH_BYPASS=1` in `apps/mobile/.env.local` (dev builds only; see `.env.example`). Remove it, or keep it dev-only, when the production SMS provider is wired
- Face ID needs a development build to test: Expo Go has no Face ID usage description, so `authenticateAsync` fails with `missing_usage_description` there (the app shows an alert and continues). `app.json` already has the usage text for real builds
- Passcode entry screens are not in the "Sign Up / Screens with phone" section; build them when the passcode screens are found in Figma (the "Passcode & Face ID" screen only offers Face ID today)
- Next: section 9, Group Screens, or section 10, Profile Screens. Test on a real device: Explore map gestures and pin taps (AXe can't drive MapKit in the simulator), voice notes and the chat keyboard
- Next screens behind Home's placeholder routes: Experience details (`/listing/[id]`, has a "Check availability" button into Select dates for now), host profile (`/host/[id]`), Recommend a place, and the Bookings / Explore / Groups / Profile tabs
- Promo banners are static in `apps/mobile/src/features/home/promos.ts`; move them to `platform_settings` when the team needs to change them without a release
- "Recently viewed" is stored on the device (AsyncStorage); move it to the server if it should follow the user
- Seed photos are the Figma images in `supabase/seed-media` (local only). Real listings need media upload in the business portal
- Icons: Figma's "Huge Icons" page is not the npm Hugeicons library, so icons are exported from Figma per screen into `apps/mobile/assets/icons` and registered in `components/ui/icons.ts`
- Figma fields with no column yet (add a migration when the screens are built): profile pronouns and emergency contact, group "Who can see likes?", recommendation type (experience vs business; stored in the note for now)
- Search by distance and date (`near`, `maxDistanceKm`, `date`, `sort: 'distance'`) needs a search RPC; `catalog.searchListings` throws `unsupported` for these until then. Build it with the Explore map (card distances already use `listing_distances`)
- Set the same password rule (8+ characters, letters and digits) on the hosted Supabase project under Auth settings; `config.toml` only covers local
- Check the date helpers on Hermes devices (they use `Intl.DateTimeFormat` with `timeZone`, verified on Node only)
- Choose payment providers for Pakistan (JazzCash, Easypaisa, Safepay, PayFast...) and the payout model (`direct` vs `platform_collect`); the schema supports both
- Business-side booking RPC for walk-ins and POS (`create_booking` is consumer-only today)
- Membership benefits in pricing (`create_booking` ignores member discounts and included sessions for now)

## UI-first phase (consumer mobile)
One branch per section (`feat/<section>`), merged into `staging`. Frames: `docs/FIGMA.md`.
- [x] 1. Search Filter
- [x] 2. Business Look: business page (`/business/[slug]`), Experience details (`/experience/[id]` with gallery, itinerary, meeting map, reviews, Book me), Host Profile (`/host/[id]`, About / Listings, Report host). Every experience card opens Experience details; Top Hosts and "Hosted by" open Host Profile; services open their business
- [x] 3. Booking Flow: Select dates (Dates / Guests / Private group), Confirm Reservation, the date / time / guests / notes / payment / coupon / success sheets; real bookings through `create_booking` / `create_bookings`, payment mocked
- [x] 4. Booking Status Screens: Bookings tab (one row per business, unread badges, cart and ••• in the header), All Bookings with the period/year filter, Cart (saved on the device, swipe to remove), Reservation details by status (pending, confirmed, completed, cancelled) with cancel, reschedule, book again and review, and Chat with a business (Realtime messages, typing, read state, photos, voice notes)
- [ ] 5. Bucket List + Recommend a place (Bucket List done: named lists, save sheets, list screens; Recommend a place next)
- [x] 6. Customer Dashboard (Adventure Quiz) + personality badge (badge on Profile comes with section 10)
- [x] 7. Customer Dashboard (Section Screens): "See all" lists (with Search typing screen and Filters updates)
- [x] 8. Explore Screens (`/map`, from the tab bar's Explore button): map with clustered pins, selected-pin card, Search this area, locate, Hosts / Businesses switch, search and filters, category chips, and the draggable results list
- [ ] 9. Group Screens
- [ ] 10. Profile Screens (General, Support, Legal)

## To wire after UI
Mocks behind the real API signatures (`apps/mobile/src/features/<name>/mock.ts`). Swap each for the `api.*` call when the backend lands.
- **Search: date availability** (`features/search/mock.ts` `availableListingIds`): every listing counts as available. Needs an availability search RPC (slots + staff schedules)
- **Search: host mode** (`features/search/mock.ts` `searchHosts`): Filters > Host shows hosts; loads the top 100 hosts and filters on the device by name, category, city, language and rating (area, distance, price and dates ignored). Needs a `search_hosts` RPC
- **Search: distance and date paging**: with a distance or date filter, Search Results filters one page of 50 on the device (real `listing_distances`). Move both into the search RPC so they page on the server

- **Bucket List: Groups** ("Add to Groups" on the heart sheet, "Invite others" on the share sheet): show a "Coming with Groups" toast. Wire when Groups (section 9) is built; inviting converts the list to a group
- **Bucket List: shared links**: "Share a link" sends `moment://bucket-list/<share_token>`; opening it (read-only view by token, RLS or an RPC) is not built yet

- **Payments** (`features/booking/mock.ts` `payForBookings`): Confirm & Pay books for real, then the mock returns a pending `TEST-...` payment after 600ms and nothing is charged; bookings stay `payment_status = 'unpaid'`. Wire to the chosen Pakistan provider (card, JazzCash, Easypaisa in `PAYMENT_METHODS`); the server marks bookings paid by webhook
- **Membership apply** (`features/booking/mock.ts` `applyForMembership`): "Apply Membership" goes through Confirm & Pay and shows "Your membership request is sent", but nothing is stored. Needs a membership checkout endpoint (memberships are created by backend code after payment)
- **Tax and service fee** (`BOOKING_CHARGES` in `packages/shared/src/constants.ts`: 16% tax on the amount after the coupon, Rs 150 fee per checkout): placeholder rates shown on Price Details only; the booking's `total_amount` excludes them. Confirm the rates with finance and add them server side with payments
- **Refunds**: the refund note and Cancellation card come from `CANCELLATION_POLICIES` on the device; cancelling with a refund needs server-side rules when payments land
- **Reschedule** (`features/bookings/mock.ts` `rescheduleBooking`): Reschedule Reservation reuses Select Date / Select Time, but there is no reschedule RPC; the new time shows for this app session only. Needs `reschedule_booking(booking, starts_at, staff)` with the same availability and cancellation-window checks as `create_booking`. Only appointment (service) bookings offer it; slot bookings would need a session picker
- **Voice notes in Chat** (`features/bookings/mock.ts` `uploadVoiceNote`): recorded with expo-audio and played on the device only; nothing is uploaded or sent. Allow audio in the `chat-attachments` bucket and send it as an attachment. Recording could not be tested in the iOS Simulator (expo-audio's permission calls never resolve in Expo Go there); test on a device
- **Business "Online" in Chat**: shown while the business is open (`business_hours`); replace with Realtime presence of business staff once the business portal has a chat inbox
- **Payment method on Reservation details**: reads `payments`; bookings paid through the payments mock have none, so it says "Not paid yet (test payment)"
- **Report host** (`features/host/mock.ts` `reportHost`): the reason sheet works, nothing is stored. Needs a `reports` table (reporter, host, reason, note) and a super admin queue
- **Experience share links**: `moment://experience/<id>` is shared but opening it isn't wired yet (same as business and bucket list links)
- **Host intro video**: Figma's play icon on the host avatar (48:4175) has no video behind it yet, so it isn't shown
- **Contact Moment Support** (`/support`): placeholder until support chat (Chat section)
- **Service animals** link on Add Guest shows an explanation alert; no separate service-animal field (pets count goes in the booking notes via `guestDetailsNote`)

- **Business links**: share uses `moment://business/<slug>`; opening it is not wired yet (same as bucket list links)
- **Business logo "play" badge** (25:2265): no business videos/stories yet, so the play overlay isn't shown

### Needs design
- **Badge illustrations**: only Nature Lover has one in Figma (20:3543). Adventure Lover, Culture Lover, Food Lover, Wellness Lover and Party Lover show a neutral placeholder on the quiz result. Export each into `seed-media/badges` and set `badges.icon` when drawn
- **Quiz plane seats** (20:2367): the plane is 2 + 2, so the seat question has window and aisle answers only (no middle seat)

---

## Phase 0: Foundation ✅
- [x] pnpm monorepo (`apps/mobile`, `apps/web`, `packages/shared`, `supabase/`)
- [x] Expo app with Expo Router, Manrope loaded, placeholder screen
- [x] Next.js App Router app, Manrope via `next/font`, tokens as CSS variables
- [x] Design tokens in `@moment/shared` (colors, typography, spacing, radii, button sizes)
- [x] Supabase CLI config, empty migrations / functions / seed
- [x] `.env.example` files for both apps
- [ ] CI: typecheck + lint on push (mobile ESLint config is in place: `pnpm --filter mobile lint`)
- [x] Mobile UI primitives in `apps/mobile/src/components/ui`: Text, Button (large/small, primary/dark/light/soft/outline/ghost, icon, loading, disabled), IconButton, Input, Icon

## Phase 1: Data model, auth, roles
- [x] Core schema: 17 migrations covering every surface (see `docs/DATABASE.md`)
- [x] Roles: consumer, business owner / manager / staff, super admin
- [x] RLS on every table, business data scoped by `business_id`; explicit super admin policies
- [x] Booking engine: slot capacity, appointment availability, no double-booking, coupons, status RPCs
- [x] Provider-agnostic payments, refunds, payouts, wallet
- [x] pgTAP tests (117 assertions) for isolation, roles, bookings, social, payments
- [x] Generated TypeScript types in `@moment/shared` (`pnpm db:types`), typed clients in both apps
- [ ] Supabase Auth: phone OTP, email + password, Apple, Google, Facebook
- [x] Shared typed API client + zod schemas in `@moment/shared` (POS-ready: no client-specific logic in the API). See `packages/shared/README.md`
- [x] Shared helpers: PKR price formatting, +92 phone normalising and formatting, Asia/Karachi dates and times
- [x] Tests: 116 unit tests (vitest) and 23 integration tests running the API client against local Supabase (`pnpm test`, `pnpm test:integration`)
- [x] Seed data: Islamabad, Lahore, Karachi (PKR, Asia/Karachi, +92)

## Phase 2: Consumer app core (mobile)
- [x] Splash, onboarding carousel, "Login or sign up" sheet (UI only)
- [x] Phone sign up: login sheet -> verification code (resend cooldown, wrong-code state, Edit) -> Finish signing up (new users only) -> Face ID (on-device, SecureStore) -> location and notification sheets -> Home placeholder
- [x] Email sign in / sign up: Sign in with email -> Enter Password (returning) or code -> Create password -> Finish signing up (new); Forgot password (Message Sent sheet, resend cooldown) -> reset link -> Set new password; dev auth bypass covers all of it
- [x] Guest browsing: "Skip for now" opens Home without an account
- [ ] Apple / Google / Facebook sign-in (wired with the providers at the end)
- [ ] Passcode entry screens
- [x] Location and notification permissions (prompts only; push token registration comes with notifications)
- [x] Home dashboard: pinned search, promo carousel, Adventure Quiz card, Popular activities, Top Hosts, Services near you (service businesses: nearest first with location, else the home city by rating, quiz badge breaks ties; Figma 17:1027 renamed it from "Just for you"), More to explore, Recently viewed, Local fun, Must-trys, "Are we missing something?"; real data, PKR prices, km distances, bucket-list hearts, pull to refresh, skeletons
- [x] Floating tab bar (Home, Bookings, Explore, Groups, Profile) that shrinks on scroll; other tabs are placeholders
- [x] Search and filters (Figma "Search Filter": Filters, location / date / language sheets, Search Results with removable chips; Home search, filter icon and category chips lead here)
- [x] Search screen (`/search`): text field, recent searches on the device (clearable), popular categories, filter icon; prefix full-text search. Filters moved to `/filters`: Host mode shows hosts, price min–max range slider, "Choose a destination" with cities and areas (real `area` filter), Reset, active-filter count on filter icons
- [x] Home "See all" screens (`/see-all/[section]`): Popular activities, Top Hosts (2-column grid), Services near you (Beauty / Health & Wellness chips), Explore, Local fun, Must-trys, Recently viewed; category chips filter in place
- [ ] Business detail, Experience detail, Host profile
- [ ] Bucket List, Recommend a place

## Phase 3: Booking and payments
- [x] Booking flow: reservation, day, slot, guests, notes, coupons (quotes and coupon reasons from the server)
- [ ] Payments: provider for Pakistan (Stripe is unavailable); mocked in the app today
- [ ] Bookings list and status
- [ ] Wallet

## Phase 4: Business portal (web)
- [ ] Business onboarding and profile
- [ ] Listings and services management
- [ ] Staff and availability
- [ ] Bookings management
- [ ] Memberships and reviews

## Phase 5: Super admin (web)
- [ ] Businesses, consumers, listings management
- [ ] Platform settings
- [ ] Moderation (reviews, listings)

## Phase 6: Social and discovery
- [ ] Chat (Supabase Realtime)
- [ ] Explore map
- [x] Business page (`/business/[slug]`): hero carousel with a panel that slides over it (snaps collapsed/expanded, tabs pin), header with verified badge, address to Maps, km distance, bookings, Open now from opening hours; tabs Popular, Services (category chips, + to a per-business cart with total in PKR and Continue), Membership (plans -> Membership Details, payment methods from `PAYMENT_METHODS`), Reviews (star filters with counts, photo strip and full-screen viewer, Write a review with photo uploads; only after a completed visit), About (description, map); share sheet; heart saves the business to a bucket list
- [x] Bucket List: several named lists (`bucket_lists`), heart -> save sheet -> list picker (ticks, toggle) -> name a new list -> first-save sheet or "Saved to ..." toast with View; all lists and one list screens with share link, rename and delete; optimistic hearts and lists
- [x] Adventure Quiz + personality badge driving recommendations: Figma's six questions (photo lists, glass, emoji, plane seat, thermometer) as `quiz_questions.kind` + `config`, guests sign in at the end and Home resumes the submit, retaking replaces the result, Services near you refetches (the badge breaks ties)
- [ ] Personality badge on Profile
- [ ] Groups: group travel, group match
- [ ] Profile: membership, offers, notifications, support, legal

## Phase 7: Consumer web and gamification
- [ ] Consumer web login and lightweight browsing/booking
- [ ] Gamification: personality badges, group progress

## Later: POS integration
- [ ] Convexa POS as another API client (auth, scoped keys per business)
