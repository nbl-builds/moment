# Moment Roadmap

Keep this file current: tick items as they land and update **Next up** so any session can pick up where the last one stopped.

## Next up
- **Business portal (current phase, `apps/web`)**: sign up / login / recovery and the main area (Dashboard, Calendar, Inbox, Listings, Insights, Reviews) Listing Details (`/business/listings/[id]`) and the Create New Listing wizard (`/business/listings/new`, `/business/listings/[id]/edit?step=`) are done. Next: Profile and Account Settings (branch `feat/portal-profile-settings`). Demo login (local and staging): `portal@moment.test` / `password123` (owner; `manager.portal@` and `staff.portal@` for roles)
- Maps: Explore uses react-native-maps with the default provider (Apple Maps on iOS, muted style; Google on Android). Decide Mapbox vs Google before launch; Figma's grey map style needs the Google provider (`customMapStyle`) or Mapbox
- Phase 1 remaining: Supabase Auth providers for production (a Pakistan SMS provider for phone OTP, email, Apple, Google, Facebook). Locally, phone OTP works with the test numbers in `supabase/config.toml` (`+92 308 4282001` / `051518`, `+92 300 1234567` / `123456`)
- Sign-in providers at the end: a Pakistan SMS provider (production phone OTP), Apple, Google and Facebook (buttons show "Coming soon" today), and production SMTP for auth emails (templates in `supabase/templates`)
- Before launch: rate-limit `email_sign_in_method` (it reveals whether an email has an account), and set `moment://**` as a redirect URL on the hosted project
- Dev auth bypass for testing screens: `EXPO_PUBLIC_AUTH_BYPASS=1` in `apps/mobile/.env.local` (dev builds only; see `.env.example`). Remove it, or keep it dev-only, when the production SMS provider is wired
- Face ID needs a development build to test: Expo Go has no Face ID usage description, so `authenticateAsync` fails with `missing_usage_description` there (the app shows an alert and continues). `app.json` already has the usage text for real builds
- Passcode entry screens are not in the "Sign Up / Screens with phone" section; build them when the passcode screens are found in Figma (the "Passcode & Face ID" screen only offers Face ID today)
- Next: Recommend a place (section 5), then review the "Copy to review" list below and wire the mocks under "To wire after UI". Test on a real device: Explore map gestures and pin taps (AXe can't drive MapKit in the simulator), voice notes and the chat keyboard
- Next screens behind Home's placeholder routes: Experience details (`/listing/[id]`, has a "Check availability" button into Select dates for now), host profile (`/host/[id]`), Recommend a place, and the Bookings / Explore / Groups / Profile tabs
- Promo banners are static in `apps/mobile/src/features/home/promos.ts`; move them to `platform_settings` when the team needs to change them without a release
- "Recently viewed" is stored on the device (AsyncStorage); move it to the server if it should follow the user
- Seed photos are the Figma images in `supabase/seed-media` (local only). Real listings need media upload in the business portal
- Icons: Figma's "Huge Icons" page is not the npm Hugeicons library, so icons are exported from Figma per screen into `apps/mobile/assets/icons` and registered in `components/ui/icons.ts`
- Figma fields with no column yet (add a migration when the screens are built): recommendation type (experience vs business; stored in the note for now)
- Search by distance and date (`near`, `maxDistanceKm`, `date`, `sort: 'distance'`) needs a search RPC; `catalog.searchListings` throws `unsupported` for these until then. Build it with the Explore map (card distances already use `listing_distances`)
- Set the same password rule (8+ characters, letters and digits) on the hosted Supabase project under Auth settings; `config.toml` only covers local
- Check the date helpers on Hermes devices (they use `Intl.DateTimeFormat` with `timeZone`, verified on Node only)
- Choose payment providers for Pakistan (JazzCash, Easypaisa, Safepay, PayFast...) and the payout model (`direct` vs `platform_collect`); the schema supports both
- Business-side booking RPC for walk-ins and POS (`create_booking` is consumer-only today)
- Membership benefits in pricing (`create_booking` ignores member discounts and included sessions for now)

## Staging builds
Everything about the staging backend and app is in `docs/STAGING.md`.
- **Sign in on the staging APK:** +92 300 1234567 / code 123456 (dev user Ali Raza with data), +92 308 4282001 / 051518 (new account), or `dev@moment.test` / `password123`
- **Rebuild the APK:** `cd apps/mobile && pnpm dlx eas-cli build -p android --profile preview` (bump `android.versionCode`; bump `version` for a new native release)
- **Publish a JS update:** `cd apps/mobile && pnpm dlx eas-cli update --channel staging --environment preview --message "..."`
- **New migrations:** `npx supabase db push --linked` (never `db reset --linked`)
- **Portal demo:** `portal@moment.test` / `password123` on staging (see `docs/STAGING.md`)
- **Web (business portal):** `pnpm web:deploy:staging` -> https://moment-web-staging.work-nabeelahmed.workers.dev (Cloudflare Worker `moment-web-staging`; `main` is never deployed). Test phone sign-up with +92 308 4282001 / 051518
- **To do:** Google Maps key for Android (Explore shows the list with "Map coming soon" until then), custom SMTP so email codes work on staging, a real iOS icon (`assets/expo.icon` is still Expo's), production Supabase project + `[remotes.production]` + production EAS variables

## UI-first phase (consumer mobile)
One branch per section (`feat/<section>`), merged into `staging`. Frames: `docs/FIGMA.md`.
- [x] 1. Search Filter
- [x] 2. Business Look: business page (`/business/[slug]`), Experience details (`/experience/[id]` with gallery, itinerary, meeting map, reviews, Book me), Host Profile (`/host/[id]`, About / Listings, Report host). Every experience card opens Experience details; Top Hosts and "Hosted by" open Host Profile; services open their business
- [x] 3. Booking Flow: Select dates (Dates / Guests / Private group), Confirm Reservation, the date / time / guests / notes / payment / coupon / success sheets; real bookings through `create_booking` / `create_bookings`, payment mocked
- [x] 4. Booking Status Screens: Bookings tab (one row per business, unread badges, cart and ••• in the header), All Bookings with the period/year filter, Cart (saved on the device, swipe to remove), Reservation details by status (pending, confirmed, completed, cancelled) with cancel, reschedule, book again and review, and Chat with a business (Realtime messages, typing, read state, photos, voice notes)
- [ ] 5. Bucket List + Recommend a place (Bucket List done: named lists, save sheets, list screens; Recommend a place next)
- [x] 6. Customer Dashboard (Adventure Quiz) + personality badge (badge on Show profile and the Adventure Quiz badge screen)
- [x] 7. Customer Dashboard (Section Screens): "See all" lists (with Search typing screen and Filters updates)
- [x] 8. Explore Screens (`/map`, from the tab bar's Explore button): map with clustered pins, selected-pin card, Search this area, locate, Hosts / Businesses switch, search and filters, category chips, and the draggable results list
- [x] 9. Group Screens: Groups tab (empty, search, rows with sharing eye), Moment Groups intro (first time) with FAQ, New Group (cover upload, name, topic) and Congratulations, group page (Liked by group with "Liked by" faces respecting likes visibility, Group Match deck with match requests, Recommended Group), share sheet, Invite others (people search by name or phone), members sheet (remove), ••• menu (rename, settings, leave), Group Settings (sharing, private, who can see likes, delete). The heart's "Add to Groups" saves to group likes; a bucket list's "Invite others" turns it into a group
- [x] 10. Profile Screens: Profile tab (bell with unread count, profile card with the unverified alert, General / Support / Legal, Sign Out confirm, app version; guests get a sign-in card and protected rows open the login sheet), Notifications (real feed from booking, payment and refund triggers, marks read on open, taps open the booking), Show profile (photo upload, verified tick, identity verification, MAQ badge, Choose Location), Edit personal info (names, pronouns, email change, phone change through the OTP screen, emergency contact, Delete Account), Adventure Quiz badge (retake after 3 completed bookings), Wallet (balance, deposit, history, All Transactions by period), Payment method (Card / JazzCash / Easypaisa, default, remove), Membership, Offers (Apply saves a coupon that Confirm Reservation pre-applies), Invite friends + My Recent Invites, Privacy & Sharing (manage my data, sharing toggles), Get started, Receive help (FAQ + answer sheet), Contact Moment Support (support ticket chat), Give us feedback, Follow us, Rate us (store review prompt), Privacy policy and Terms in-app

## To wire after UI
- **Portal: map tiles** (`features/listing-wizard/map-picker.tsx`): OpenStreetMap's public tile server through Leaflet (fine for testing; its usage policy doesn't allow heavy production traffic). Switch to the chosen maps provider's tiles before launch
- **Listing review**: there's no super admin yet, so listings stay `pending_review` in production until one exists (AUTO_APPROVE_BUSINESSES publishes them on development / staging)
- **Wizard gaps**: itinerary, highlights ("N reasons to book") and "What to bring" aren't editable in the wizard yet (seeded listings keep theirs); guest requirements (age, activity, skill) are saved but the app doesn't show them yet
- **Portal: listing map tile** (`features/portal/listing-detail/overview-tab.tsx`): a drawn tile with the pin and an "Open in Maps" link (Google Maps search URL from `listing_point`). Swap for a static map image once the maps provider is chosen
- **App: paused listings**: `accepting_bookings = false` makes guest bookings fail in the database ("This experience isn't taking new bookings right now"); the app still shows the Book button. Read the flag in the experience screen and show "Not taking bookings" instead

Mocks behind the real API signatures (`apps/mobile/src/features/<name>/mock.ts`). Swap each for the `api.*` call when the backend lands.
- **Search: date availability** (`features/search/mock.ts` `availableListingIds`): every listing counts as available. Needs an availability search RPC (slots + staff schedules)
- **Search: host mode** (`features/search/mock.ts` `searchHosts`): Filters > Host shows hosts; loads the top 100 hosts and filters on the device by name, category, city, language and rating (area, distance, price and dates ignored). Needs a `search_hosts` RPC
- **Search: distance and date paging**: with a distance or date filter, Search Results filters one page of 50 on the device (real `listing_distances`). Move both into the search RPC so they page on the server

- **Group invite links**: "Share a link" sends `moment://group/<invite_token>` when sharing is on; opening it (join by token, an RPC) is not built yet
- **Group Match requests received**: requests are sent and withdrawn in the app, but there is no screen to accept or decline incoming ones yet (RLS already lets the receiving group's admins update the status). Needs an inbox (notifications feed) and what "accepted" unlocks (shared chat or plan)
- **Group invites**: invited people see the group in their list with Join / Decline, but get no push or in-app notification yet (notifications feed)
- **Bucket List: shared links**: "Share a link" sends `moment://bucket-list/<share_token>`; opening it (read-only view by token, RLS or an RPC) is not built yet

- **Portal: Withdraw** (`apps/web/src/features/portal/insights/mock.ts` `requestWithdrawal`): Insights > Wallet > Withdraw returns a `TEST-...` pending request and nothing is paid. Needs a payout provider, payout accounts and a `request_payout` RPC that creates a `payouts` row
- **Portal: voice notes** (`apps/web/src/features/portal/inbox/mock.ts` `uploadVoiceNote`): recorded in the browser, kept on the device, not sent (same as mobile). Allow audio in `chat-attachments` and send as an attachment
- **Portal: refunds on business cancellation**: the panel says the guest gets a full refund, but cancelling only changes the booking status; the refund is created when payments are wired
- **Portal: inbox list refresh**: threads are live (Realtime); the conversation list refreshes every 15 s and on focus. A per-business Realtime topic would make it instant
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
- **Identity verification** (`features/profile/mock.ts` `submitIdentityVerification`, `getVerificationStatus`): CNIC front/back and selfie are picked but not uploaded; the status turns "in review" for the app session. Needs a private `identity-documents` bucket, a review row, and the Moment team setting `profiles.identity_verified_at`
- **Delete / deactivate account, download my data** (`features/profile/mock.ts`): confirm sheets work and sign the user out; nothing is deleted, deactivated or exported. Needs an edge function (30-day grace delete, keep booking and payment records)
- **Wallet deposit** (`features/wallet/mock.ts` `depositToWallet`): nothing is charged; the deposit shows as "Pending" at the top of the history for the app session. Wire with the payment provider; the server adds the `wallet_transactions` credit on the webhook
- **Payment method tokenising** (`features/payment-methods/mock.ts` `tokenize`): returns a `mock` token; the real `saved_payment_methods` row stores only the token and display details. Replace with the provider SDK (card number and CVC must go straight to the provider)
- **Referrals** (`features/referrals/mock.ts` `getMyReferral`, `listMyInvites`): code from the first name, link `https://moment.pk/r/<code>`, five invites. Needs a `referrals` table, unique codes, the reward (`referrals.reward_amount` in `platform_settings`) paid as wallet credit after the friend's first completed booking, and the link opening the app
- **Privacy & Sharing toggles**: saved in `profile_private.privacy_prefs` but not enforced yet (public profile, likes visible to groups, bookings visible to hosts). Enforce in RLS / RPCs (e.g. `group_likes` read policy, host booking history)
- **Contact Moment Support**: real tickets (`support_tickets` / `support_messages`); the screen polls every 15 s. Add Realtime on `support_messages` and a super admin inbox to reply; replies should bump the ticket's `updated_at`
- **Follow us / store links / support email** (`platform_settings`: `app.social_links`, `app.store_urls`, `app.support`): placeholder URLs until the accounts and store listings exist
- **Notifications push**: the feed is real (triggers on bookings, payments, refunds), but no push is sent yet (Expo push via `push_tokens`)
- **Service animals** link on Add Guest shows an explanation alert; no separate service-animal field (pets count goes in the booking notes via `guestDetailsNote`)

- **Business links**: share uses `moment://business/<slug>`; opening it is not wired yet (same as bucket list links)
- **Business logo "play" badge** (25:2265): no business videos/stories yet, so the play overlay isn't shown

### Copy to review
- **Business portal auth**: "Tell us about yourself" and the 7 category descriptions are new copy (Figma repeats one placeholder); the type-page subtitle is Figma's ("Each experience is vetted..."). "Contact Us" mails `support@momentbooking.com` (`NEXT_PUBLIC_CONTACT_EMAIL`): confirm the real address. Forgot password says "a reset link (email) or a code (phone)" instead of Figma's "we'll email you a reset link"
Invented text (Figma had lorem ipsum, US data or nothing). Please check:
- **Legal documents** (`supabase/seed.sql`, `legal_documents`): Terms & Conditions and Privacy Policy bodies (ages, refunds, wallet, referrals, data retention 6 years / 30 days, privacy@ and support@moment.pk). Needs a lawyer before launch
- **FAQ** (`apps/mobile/src/features/support/faq.ts`): all 14 questions and answers. The phone sign-in answer mentions Apple, Google and Facebook, which still say "Coming soon"
- **Get started** (`app/get-started.tsx`): hero, Explore / Book / Enjoy paragraphs, "Start exploring"
- **Profile tab**: guest card "Sign in or create an account" / "Book experiences, save favourites and plan with friends."; Sign out sheet "Sign out of Moment?" / "You can sign back in any time with your phone number or email."
- **Show profile / Edit**: "Identity Verification" notes ("Show the community you are real.", "We’re checking your documents."), "Take the Adventure Quiz to get one.", "Add your home city for picks near you.", email and emergency contact sheets, Delete Account sheet ("We’ll delete your profile, lists and groups after 30 days...")
- **Verify Identity** (`app/me/verify.tsx`): intro, the three step notes, privacy note, "Thanks! We’ll check your documents within 24 hours."
- **Adventure Quiz badge**: unlocked retake text ("You’ve explored enough to see how your taste has changed..."), "N of 3 bookings done"
- **Notifications** (trigger text in `20261126000030_profile_account.sql`): "Booking requested / confirmed / cancelled", "How was it? Tell others about ... Leave a review.", "Payment received", "Refund added to your wallet / Refund on its way"; empty state
- **Wallet / Deposit, Payment method, Membership, Offers, Invite friends**: sheet labels, toasts, empty and error states, share message "Here’s Rs X off your first experience on Moment."
- **Support, Feedback, Privacy & Sharing, Follow us**: support header and hours, empty state, feedback area list, the Manage my data and Sharing rows and their confirm sheets
- **Config placeholders**: referral reward Rs 500, social URLs, store URLs, support email / phone / hours

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
Figma: https://www.figma.com/design/hvSITt4VVdCeFArVVFUgl1/Moment-Business-App (index in `docs/FIGMA.md`). Routes under `/business`; `/` redirects there until consumer web exists.
- [x] Cloudflare staging hosting: OpenNext on Workers, `pnpm web:deploy:staging` (size check, no env files in the bundle), staging URL in Supabase redirect URLs (`docs/STAGING.md`)
- [x] Web tokens from the Business App Figma in `@moment/shared` (`tokens/web.ts`: colours, type scale, layout, spacing, buttons) as CSS variables
- [x] Business sign up with phone (+92) and email: Welcome, Sign up, 6-box verification code (paste, auto-submit, wrong state, Send again with 60 s cooldown, Edit), Tell us about yourself (Host & Experiences -> `host`; Business -> `operator` / `venue` by category), What do you provide (7 category groups from the database), details form (Host / Business name, address, Pakistan + launch city, email locked in the email flow, password + confirm) -> `create_business` (owner, `pending_review`, primary location) -> dashboard placeholder with the "under review" banner
- [x] `AUTO_APPROVE_BUSINESSES=1` on development and staging activates new businesses (server action with the service key; never production)
- [x] Login with email or phone + password; Forgot password (email reset link via `/business/auth/callback`, or phone code) -> Set new password ("Save password") -> login with a toast
- [x] Routing guard in `src/proxy.ts`: signed out -> login; no active business membership -> onboarding; with one -> dashboard. Existing consumer accounts can log in and create a business (no password fields when they signed in with one)
- [x] Playwright E2E (`apps/web/e2e`, 1440 and 390): both sign-up flows, wrong code, login, email and phone reset; phone flow also passes on staging
- [x] Portal shell: top bar (Dashboard / Calendar / Inbox / Listings / Insights, active black pill), + (create listing), bell with unread dot, avatar menu (Profile, Account Settings, Get Help sheet, business switcher for several memberships, Logout), phone menu below 1024px, under-review banner. Roles from `business_members`: managers and staff never see revenue, wallet or withdraw; staff can't edit listings or reply to reviews
- [x] Dashboard: greeting by Pakistan time, Complete your profile (only when the logo, description, contact or photos are missing), Create new listing, Contact Support / What's New sheets, reservation tabs (Ongoing / Upcoming / Pending / Cancelled / Completed) with real counts and per-tab empty states
- [x] Reservation side panel (not in Figma): guest, listing, time in PKT, items, guests, notes, price breakdown, payment, history; Accept / Decline with reason, Mark completed / No-show, Cancel with refund note, Message guest. Status changes reach the app through the existing triggers (notification rows and the guest's Realtime topic)
- [x] Calendar: two months with prev / next, today, dots on busy days, the day's reservations; "Complete your listing" empty state when nothing is published
- [x] Inbox: shared business inbox (`business_inbox`) with search, Unread and time filters, unread counts per team member, live threads over Realtime (same conversations as the app), typing indicator, photos, voice notes (mock, as on mobile), quick replies (`src/config/quick-replies.ts`), View reservation / See Listing Details
- [x] Listings: My Listings / Drafts / Archive with the category-group menu, cards to the details route, edit to the wizard route
- [x] Insights: booking counts with View All, bookings, listing views, revenue and views charts (Chart.js, loaded in the browser only) with Weekly / Monthly / Yearly, wallet + Withdraw (owner, mock), rating and trend, bookings by category, newly added and most viewed
- [x] Reviews: average, count, 5-1 distribution, list with photos (lightbox), Reply / Edit reply (not in Figma)
- [x] Listing views tracked from the app (experience and business pages; `record_listing_view`, de-duplicated)
- [x] Portal demo seed (`supabase/seeds/portal_demo.sql`) and Playwright E2E for the portal at 1440 and 390
- [x] Listing Details (`/business/listings/[id]`, no full Figma; top of 629:7360 matched): breadcrumb, status pill, Preview (customer view in a phone frame, mobile order), Edit listing, ••• (Duplicate, Archive / Unarchive, Unpublish, Delete for drafts with confirm); gallery + lightbox; tabs Overview (sections hide when empty, Edit links to wizard steps, map tile + Open in Maps), Availability (next 14 sessions with booked / capacity, Block date, Add session; appointments: staff weekly hours + blocked dates), Reservations (sub-tabs with counts, side panel), Reviews (summary, list, Reply); sticky right column: Status with "Accepting bookings" (`listings.accepting_bookings`), Last 30 days (`listing_stats`, revenue owners + managers), Next reservations, Share. Drafts: "Finish your listing" checklist (`listingChecklist`) and Publish. Staff read-only; loading, not-found and archived states; E2E at 1440 and 390
- [x] Create New Listing wizard (Figma 614:2157 .. 616:4291): full-screen shell (logo, Contact Us, Back / Next, sidebar groups with current dot and done checks, progress bar with the group and Save & exit; step dropdown below 1024px). Steps: Type (Experience = sessions, Service = appointments; preselected from the business category), Basics (Pakistan cities, Use my current location, languages sheet), Category (group tiles + subcategory), Title (60 counter), Photos (drag & drop / Upload from device, resized to WebP in the browser, min 5, reorder, cover, delete, Upload Again), Details (100+ characters, duration), Location (street, city, province, postal code, Pakistan, OSM map pin), What I'll provide, Guest requirements, Group size (public / private), Staff (services), Availability (weekly schedule + date range + one-off dates; services: staff hours, opening hours, gap, interval), Booking settings (instant / request, cut-off, cancellation policy), Guest pricing (per person / per booking, private price, options, "You'll earn" after the commission), Discount (large group, early bird; priced by the server), Your information (host card), Review & submit (summary with Edit links, card and app previews, what's missing, Submit for review -> `pending_review`, auto-published on development / staging with AUTO_APPROVE_BUSINESSES=1). Autosave per step, resume at the furthest step, unsaved-changes confirm. Listings waiting for review sit with the drafts; owners can't publish a never-reviewed listing directly
- [x] Mobile: the listing's group / early-bird discount on Confirm and Reservation details (`quote_booking` with `p_starts_at`)
- [ ] Notifications, Business profile, Account settings (placeholder routes today; next branch)
- [ ] Google / Facebook sign-in (buttons show "coming soon")
- [ ] Business profile
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
- [x] Personality badge on Profile
- [x] Groups: group travel, group likes, group match requests, recommendations (accepting match requests and invite links still to wire)
- [x] Profile: membership, offers, notifications, support, legal (UI; several mocks listed under "To wire after UI")

## Phase 7: Consumer web and gamification
- [ ] Consumer web login and lightweight browsing/booking
- [ ] Gamification: personality badges, group progress

## Later: POS integration
- [ ] Convexa POS as another API client (auth, scoped keys per business)
