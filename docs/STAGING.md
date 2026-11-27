# Staging

Staging is the hosted Supabase project **"moment"** (ref `iltnkqxgdnhsnkvvhpxp`,
region ap-southeast-1), the Android app **"Moment (Staging)"**
(`com.moment.app.staging`, scheme `moment-staging://`) and the web app (business
portal) at **https://moment-web-staging.work-nabeelahmed.workers.dev**. Nothing is live yet. A
separate production project comes later; never point staging tools at it, and
never run these commands against it.

| | Local | Staging | Production (later) |
|---|---|---|---|
| Supabase | `supabase start` (127.0.0.1:54321) | `iltnkqxgdnhsnkvvhpxp` | new project, own `[remotes.production]` |
| `EXPO_PUBLIC_APP_ENV` | `development` (`.env.local`) | `staging` (EAS env `preview`) | `production` (EAS env `production`) |
| App | Expo Go | Moment (Staging), `com.moment.app.staging` | Moment, `com.moment.app` |
| Dev auth bypass | allowed (`EXPO_PUBLIC_AUTH_BYPASS=1`) | never | never |
| Web | `pnpm web` (localhost:3000) | Worker `moment-web-staging` | not set up; `main` is never deployed |

## Sign in on staging

No SMS provider yet, so only these test numbers work (fixed codes, no SMS is sent):

| Phone | Code | Account |
|---|---|---|
| +92 300 1234567 | 123456 | Ali Raza, the dev user (bookings, groups, wallet, membership) |
| +92 308 4282001 | 051518 | new account (goes through "Finish signing up" the first time) |

Email + password: every seeded account uses `password123`, e.g. `dev@moment.test`
(the same dev user). Seed accounts are fictional (`*@moment.test`).

Email codes (email sign-up, "Continue with email" for new users) don't work yet:
the free plan with Supabase's built-in email can't use our code templates, so
its emails contain a link instead of a 6-digit code. Fix: add a custom SMTP
provider (Resend, Postmark, ...) in Supabase > Authentication > SMTP, then push
the templates (remove the `[remotes.staging.auth.email.template.*]` overrides in
`supabase/config.toml` and run `config push`).

## How the backend was set up (2026-11-25)

1. **Checked first.** The project had migrations 001-017 and no data (0 users,
   businesses, listings, bookings, storage objects), so nothing could be overwritten.
   ```bash
   npx supabase migration list --linked
   npx supabase db query --linked "select (select count(*) from auth.users), (select count(*) from public.businesses)"
   ```
2. **Migrations and seed** (the CLI connects with a temporary login role, no database password needed):
   ```bash
   npx supabase db push --linked --dry-run --include-seed   # review
   npx supabase db push --linked --include-seed
   ```
   The seed only runs once per file content; `db push` without `--include-seed`
   is what you use for new migrations later. Never `db reset --linked`.
3. **Figma media into Storage** (creates the public `seed-media` bucket, 38 files):
   ```bash
   npx supabase seed buckets --linked
   ```
4. **Privileges.** Unlike local, this hosted project gives the API roles no
   table, sequence or function privileges by default, so every request failed
   with "permission denied". Migration `20261127000031_explicit_api_grants.sql`
   grants exactly what local has (generated from the local database) and sets
   matching default privileges. After pushing, staging and local privileges were
   compared and are identical (see DATABASE.md, "Privileges").
5. **Auth settings** come from `supabase/config.toml` with the staging overrides
   in `[remotes.staging]` (site URL `moment-staging://`, redirect URLs
   `moment-staging://**` and `moment://**`, email resend limit 60 s, hosted
   default email templates). Local-only values (localhost, `exp://`) are never pushed.
   ```bash
   npx supabase config push --project-ref iltnkqxgdnhsnkvvhpxp   # shows a diff, asks per service
   ```
   Answer **y** for auth and **n** for storage (it would turn on vector buckets).
   What it sets: phone sign-up on, the two test numbers above, a placeholder SMS
   provider (needed for phone sign-in; it never sends), email sign-up without
   confirmation, 6-digit email codes, passwords 8+ with letters and digits.

## App environments

- `apps/mobile/app.config.ts` reads `EXPO_PUBLIC_APP_ENV` and sets name, package /
  bundle id, scheme and icon (staging icon has a "STAGING" label).
- Supabase URL and publishable key per environment are **EAS environment
  variables**, not files in git:
  ```bash
  cd apps/mobile
  pnpm dlx eas-cli env:list preview
  ```
  Staging uses EAS's built-in `preview` environment (custom environment names
  need a paid Expo plan). It holds `EXPO_PUBLIC_APP_ENV=staging`,
  `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (sensitive).
  `production` holds only `EXPO_PUBLIC_APP_ENV=production` until the production
  project exists.
- The dev auth bypass only works when `__DEV__` and `EXPO_PUBLIC_APP_ENV=development`.

### Run the app against staging locally (Simulator)

`.env.local` wins over shell variables, so move it aside while doing this:
```bash
cd apps/mobile && mv .env.local .env.local.off
EXPO_PUBLIC_APP_ENV=staging \
EXPO_PUBLIC_SUPABASE_URL=https://iltnkqxgdnhsnkvvhpxp.supabase.co \
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key from Supabase > Settings > API> \
npx expo start --clear
# afterwards: mv .env.local.off .env.local
```

## Builds (EAS, account na_beel, project @na_beel/moment)

`apps/mobile/eas.json`:
- `preview`: Android **APK**, internal distribution, EAS env `preview`, update channel `staging`.
- `production`: Android **AAB**, EAS env `production`, channel `production`. Don't build it yet.

```bash
cd apps/mobile
pnpm dlx eas-cli build -p android --profile preview     # new APK
```
Bump `version` in `app.json` for a new native release (0.1.0 → 0.1.1) and
`android.versionCode` (+1) for every APK you hand out. A new APK is needed when
native code or native config changes (new native module, permissions, icon,
Maps key, app name).

### Ship a JS fix without a new APK (expo-updates)

```bash
cd apps/mobile
pnpm dlx eas-cli update --channel staging --environment preview --message "Fix ..."
```
Installed staging apps download it on next launch and use it on the launch
after. Updates only reach APKs with the same `version` (runtime version policy
`appVersion`), so after bumping the version, build a new APK first.

## Google Maps on Android

`react-native-maps` on Android needs a Google Maps API key. Without one, the
app doesn't crash: Explore opens as a list with "Map coming soon", and the small
maps on Experience details and the business About tab show a tile that opens the
phone's Maps app. iOS uses Apple Maps and needs nothing.

To turn maps on:
1. Google Cloud console > create (or pick) a project, e.g. "Moment Staging".
2. APIs & Services > Library > enable **Maps SDK for Android**.
3. APIs & Services > Credentials > Create credentials > **API key**.
4. Restrict it: Application restrictions > Android apps > add package
   `com.moment.app.staging` with the SHA-1 of the app's signing key
   (`pnpm dlx eas-cli credentials -p android` > preview > Keystore shows "SHA1 Fingerprint");
   API restrictions > Maps SDK for Android.
5. Save it as an EAS secret (read at build time by `app.config.ts`):
   ```bash
   cd apps/mobile
   pnpm dlx eas-cli env:create --environment preview --name GOOGLE_MAPS_ANDROID_API_KEY --value <key> --visibility secret
   ```
6. Rebuild the APK (`eas build -p android --profile preview`). An OTA update can't add it.

Production later: a separate key restricted to `com.moment.app`, in the `production` environment.

## Web app on Cloudflare Workers

`apps/web` runs on Cloudflare Workers through the OpenNext adapter
(`@opennextjs/cloudflare`), Worker **`moment-web-staging`** on the account
"Work.nabeelahmed@gmail.com's Account" (subdomain `work-nabeelahmed.workers.dev`).
Other Workers on that account (e.g. `prodzyn`) have nothing to do with Moment:
never touch them.

```bash
pnpm web:deploy:staging        # from the repo root, on staging or a feature branch
```
`apps/web/scripts/deploy-staging.mjs`:
1. refuses to run on `main`;
2. moves local `.env*` files aside for the build (OpenNext compiles every
   `.env*` it finds into the Worker, which would ship local keys) and restores
   them afterwards. If a deploy is killed hard and a `*.deploy-hidden` file is
   left behind, rename it back;
3. builds with the public values from `apps/web/wrangler.jsonc` (`vars`);
4. fails if a Supabase secret key is in the bundle;
5. checks the compressed size (dry run) against the free-plan limit (3 MiB
   gzip) and only then deploys. Size on 2026-11-27: 1.93 MiB gzip with the
   business auth screens (1.3 MiB for the placeholder app).

Wrangler is logged in on the dev Mac (`pnpm --filter web exec wrangler whoami`).
`npx` is broken on that Mac: use `pnpm exec` / `pnpm dlx`.

**Config.** Public values live in `apps/web/wrangler.jsonc` `vars`
(`NEXT_PUBLIC_*` are also inlined into the browser bundle at build time):
`NEXT_PUBLIC_APP_ENV=staging`, site URL, contact email, Supabase URL and
publishable key, and `AUTO_APPROVE_BUSINESSES=1` (new businesses go live at once
so the portal can be tested; the code ignores it unless the app env is
development or staging). Secrets are set once per Worker and never committed:
```bash
cd apps/web
# The service ("secret") key for staging. Use --reveal: without it the CLI
# prints a masked key, which uploads fine but fails with "Invalid API key".
pnpm exec supabase projects api-keys --project-ref iltnkqxgdnhsnkvvhpxp --reveal
pnpm exec wrangler secret put SUPABASE_SECRET_KEY     # paste the sb_secret_... value
pnpm exec wrangler secret list
```

**Supabase Auth.** `https://moment-web-staging.work-nabeelahmed.workers.dev/**` is
in the staging redirect URLs (`[remotes.staging.auth]` in `supabase/config.toml`,
pushed with `config push`, answer **y** for auth and **n** for storage).

**Preview the Worker locally:** `pnpm --filter web preview:cf` (builds, then
`wrangler dev`). Local `.env.local` applies there, so it talks to local Supabase.

**Limits.** Next.js Cache Components (`cacheComponents`) are off: OpenNext
doesn't support them on Workers yet (requests hang). Prerendered pages are read
from the Worker's static assets (`staticAssetsIncrementalCache` in
`open-next.config.ts`); without it `/business` 404'd on about one request in
five. No revalidation is used, so no R2 / KV is needed. The Next.js image
optimizer doesn't run on Workers: `src/lib/image-loader.ts` serves pre-sized
WebP files instead.

**Test the portal on staging.** Phone sign-up with the test number
+92 308 4282001 / code 051518 (email codes need custom SMTP, see above). After a
run that number has an account and a business, so a second sign-up lands on the
dashboard; log in with its phone and password instead, or delete the test
account in Supabase > Authentication (delete its business first: a business must
keep an owner). E2E against staging (phone flow only):
`cd apps/web && E2E_BASE_URL=https://moment-web-staging.work-nabeelahmed.workers.dev pnpm exec playwright test --project=desktop`

## Portal demo business on staging

Loaded once (2026-11-28) from `supabase/seeds/portal_demo.sql`, on its own and
in one transaction, because `db push --include-seed` would re-run the changed
`seed.sql` on top of the existing data:
```bash
{ echo "begin;"; cat supabase/seeds/portal_demo.sql; echo "commit;"; } > /tmp/portal_demo_tx.sql
pnpm exec supabase db query --linked -f /tmp/portal_demo_tx.sql
```
Log in at https://moment-web-staging.work-nabeelahmed.workers.dev/business/login
with `portal@moment.test` / `password123` (owner), `manager.portal@moment.test`
or `staff.portal@moment.test` (roles). Dates are relative to the day it was
loaded, so "today" on staging drifts; reload it on a fresh project if needed.
