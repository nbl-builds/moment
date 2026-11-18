# @moment/shared

Shared code for every Moment client (mobile, web, business portal, super admin, later the POS). Consumed as TypeScript source with no build step: Next.js transpiles it via `transpilePackages`, and Metro handles it natively.

| Import | What |
|---|---|
| `@moment/shared/api` | `createMomentApi(supabase)`: the typed API client |
| `@moment/shared/validation` | Zod schemas for every form in the Figma flows |
| `@moment/shared/format` | PKR prices, +92 phones, Asia/Karachi dates and times |
| `@moment/shared/types` | Generated database types and friendly aliases |
| `@moment/shared/tokens` | Design tokens |
| `@moment/shared` | All of the above |

## API client

Each app passes in its own Supabase client, which owns session storage (AsyncStorage on mobile, cookies on web). The API itself has no platform code, so the POS can use it unchanged.

```ts
// apps/mobile/src/lib/api.ts
export const api = createMomentApi(supabase);

// apps/web: createBrowserApi() in Client Components, await createServerApi() on the server
```

Namespaces: `auth`, `profile`, `catalog`, `bookings`, `bucketList`, `reviews`, `quiz`, `recommendPlace`, `groups`, `chat`, `support`, `account` (wallet, memberships, notifications, push tokens) and `business` (portal reads, booking status, review replies, API keys). Raw Supabase access stays available as `api.db`.

Every method returns typed rows or throws an `ApiError`:

```ts
try {
  await api.bookings.create(form);
} catch (e) {
  if (isApiError(e)) toast(e.userMessage); // "Only 2 seats left in this slot"
}
```

`code` is one of `unauthenticated | forbidden | not_found | invalid | conflict | rate_limited | network | unsupported | unknown`. `userMessage` shows RPC messages such as "This coupon is not valid" and replaces internal errors (RLS, constraint names) with generic copy.

## Validation

Each schema parses what a form holds and outputs what the API expects. Phones come out as E.164, emails lowercased, empty optional text as `undefined`, coupon codes uppercased. Limits mirror the database CHECK constraints (`src/constants.ts`). Use them with react-hook-form's `zodResolver`; `z.input<>` and `z.output<>` types are exported for each.

| Figma screen | Schema |
|---|---|
| Sign in / Up with phone | `phoneSignInSchema` |
| Sign Up / Sign in with email | `emailSignInSchema` |
| Sign In OTP | `verifyPhoneOtpSchema`, `verifyEmailOtpSchema` |
| Enter Password | `passwordSignInSchema` |
| Forgot / Reset Password | `forgotPasswordSchema`, `resetPasswordSchema` |
| Sign Up Finishing | `completeSignUpSchema`, `completeSignUpWithPasswordSchema` |
| Passcode & Face ID | `setupPasscodeSchema`, `passcodeSchema` |
| Personal Information | `personalInfoSchema`, `changeEmailSchema`, `changePhoneSchema` |
| Notifications settings | `notificationPrefsSchema` |
| Search Filter, Explore filters | `searchFiltersSchema` |
| Edit Guests | `createGuestsSchema({ minGuests, maxGuests })` |
| Edit Notes | `bookingNotesSchema` |
| Enter coupon | `applyCouponSchema` |
| Confirm & Pay | `createBookingSchema` + `toCreateBookingArgs` |
| Booking Details (cancel) | `cancelBookingSchema` |
| Bucket List | `bucketListItemSchema` |
| Recommend a service | `recommendPlaceSchema` |
| Write a review | `reviewSchema` (portal reply: `reviewReplySchema`) |
| Adventure Quiz | `quizSubmissionSchema` |
| Create new group, Group Rename, Group Settings | `createGroupSchema`, `renameGroupSchema`, `groupSettingsSchema` |
| Chat | `sendMessageSchema` |
| Give us feedback | `feedbackSchema`, `supportMessageSchema` |

Guests: Figma counts adults and children toward the listing maximum but not infants or pets ("not including infants"). The database stores a single `guest_count`, so `toCreateBookingArgs` sends adults + children and adds infants and service animals to the booking notes.

## Formatting

```ts
formatPrice(450000)                         // "Rs 4,500"   (amounts are minor units)
formatPrice(450000, { display: 'code' })    // "PKR 4,500"
formatListingPrice(450000, 'per_person')    // "Rs 4,500 per person"
parsePriceInput('Rs 4,500')                 // 450000
normalizePkPhone('0300 1234567')            // "+923001234567"
formatPkPhone('+923001234567', 'national')  // "0300 1234567"
maskPhone('+923084282001')                  // "+92*******001"
formatReservationTime(start, end)           // "3 PM to 4 PM Saturday, Jan 24, 2026"
toLocalDate(iso)                            // "2026-01-24" in Asia/Karachi, for get_available_times
localDateTimeToIso('2026-01-24', '15:00')   // "2026-01-24T10:00:00.000Z"
```

Date helpers take a `timeZone` argument (default `Asia/Karachi`); pass the business's `timezone`. Output is assembled from numeric parts, so it reads the same on Hermes, browsers and Node, whatever the device timezone.

## Tests

```bash
pnpm --filter @moment/shared test               # unit tests (formatters, schemas, error mapping)
pnpm --filter @moment/shared test:integration   # API client against local Supabase (pnpm db:start first)
pnpm --filter @moment/shared typecheck          # tsc + check that every select string matches the schema
```

The integration suite signs up a new consumer on each run and uses the seed accounts, so it can run repeatedly without a reset. It reads the URL and key from `supabase status`, or from `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.

supabase-js reports a select string with a bad column as a type rather than a compile error. `scripts/check-select-types.mjs` emits declarations and fails if one shows up, so typos in select strings fail `typecheck`.
