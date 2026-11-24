# Moment Roadmap

Keep this file current: tick items as they land and update **Next up** so any session can pick up where the last one stopped.

## Next up
- Decide maps provider (Mapbox vs Google Maps) before Explore work
- Phase 1 remaining: Supabase Auth providers for production (a Pakistan SMS provider for phone OTP, email, Apple, Google, Facebook). Locally, phone OTP works with the test numbers in `supabase/config.toml` (`+92 308 4282001` / `051518`, `+92 300 1234567` / `123456`)
- Sign-in providers at the end: a Pakistan SMS provider (production phone OTP), Apple, Google and Facebook (buttons show "Coming soon" today), and production SMTP for auth emails (templates in `supabase/templates`)
- Before launch: rate-limit `email_sign_in_method` (it reveals whether an email has an account), and set `moment://**` as a redirect URL on the hosted project
- Guest mode ("Skip for now") is not remembered: a relaunch shows onboarding again. Decide whether guests should land on Home next time
- Dev auth bypass for testing screens: `EXPO_PUBLIC_AUTH_BYPASS=1` in `apps/mobile/.env.local` (dev builds only; see `.env.example`). Remove it, or keep it dev-only, when the production SMS provider is wired
- Face ID needs a development build to test: Expo Go has no Face ID usage description, so `authenticateAsync` fails with `missing_usage_description` there (the app shows an alert and continues). `app.json` already has the usage text for real builds
- Passcode entry screens are not in the "Sign Up / Screens with phone" section; build them when the passcode screens are found in Figma (the "Passcode & Face ID" screen only offers Face ID today)
- Next screens behind Home's placeholder routes: Experience / Business details (`/listing/[id]`), host profile (`/host/[id]`), Search and filters (`/search`, `/category/[slug]`), "See all" lists (`/see-all/[section]`), Bucket List, Adventure Quiz, Recommend a place, and the Bookings / Explore / Groups / Profile tabs
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
- [x] Home dashboard: pinned search, promo carousel, Adventure Quiz card, Popular activities, Top Hosts, Just for you, More to explore, Recently viewed, Local fun, Must-trys, "Are we missing something?"; real data, PKR prices, km distances, bucket-list hearts, pull to refresh, skeletons
- [x] Floating tab bar (Home, Bookings, Explore, Groups, Profile) that shrinks on scroll; other tabs are placeholders
- [ ] Search and filters
- [ ] Business detail, Experience detail, Host profile
- [ ] Bucket List, Recommend a place

## Phase 3: Booking and payments
- [ ] Booking flow: reservation, day, slot, guests, notes
- [ ] Stripe payments (test mode), coupons
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
- [ ] Adventure Quiz + personality badge driving recommendations
- [ ] Groups: group travel, group match
- [ ] Profile: membership, offers, notifications, support, legal

## Phase 7: Consumer web and gamification
- [ ] Consumer web login and lightweight browsing/booking
- [ ] Gamification: personality badges, group progress

## Later: POS integration
- [ ] Convexa POS as another API client (auth, scoped keys per business)
