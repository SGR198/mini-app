# mini-app

Telegram Mini App monorepo for Loft Auto internal interfaces.

## Production runtime

Staff Cost is the first native Mini App v2 page.

```text
Telegram Mini App
  -> Cloudflare Worker database-miniapp
  -> Workers Static Assets
  -> POST /api/miniapp
  -> Supabase Edge miniapp-api
  -> direct PostgreSQL transaction
  -> miniapp.staff_cost_*
  -> staff_cost / related domain facts
```

The frontend no longer reads `dashboard.payload_staff_cost`.
Business calculations remain in Supabase domain schemas.

## Staff Cost source

```text
src/frontend/
├─ apps/owner/
├─ pages/staff-cost/
│  ├─ page.js
│  ├─ api.js
│  ├─ views/
│  └─ components/
├─ shared/
└─ styles/
```

The production `public/` directory is generated from `src/frontend/` by:

```text
npm run build:frontend
```

Cloudflare build/deploy runs the frontend build before Wrangler.

## Data loading

Staff Cost uses bounded view/use-case contracts. The native frontend does not load the full Staff Cost history snapshot.

```text
initial                -> metadata + current accrual page
accruals               -> selected reporting periods
employee               -> period/source summaries
employee source        -> source rows on demand
repair positions       -> terminal drilldown on demand
body repair accruals   -> selected reporting periods
body repair work orders-> cursor-paginated on demand
client payments        -> cursor-paginated by payment date
payments               -> cursor-paginated by payment date
statement              -> selected reporting periods
statement employee     -> on demand
statement month        -> terminal drilldown
summary                -> selected reporting periods
```

Primary tabs use an in-memory request cache and background prefetch. Deep drilldowns stay lazy. Growing registers use cursor/offset continuation through an invisible IntersectionObserver sentinel.

Payroll payloads are not stored in LocalStorage or sessionStorage.

## Access

Telegram `initData` is verified by Supabase Edge.

```text
initData
  -> verified Telegram subject
  -> miniapp.identity_subject
  -> access.identity
  -> trusted Mini App context
```

Cloudflare does not own authorization or business logic.

## Rendering

Frontend/renderer source belongs to this repository.

Future standalone rendering remains compatible with ADR-0028:

```text
source
  -> Cloudflare build
  -> private R2 renderer artifact
  -> standalone render
  -> optional delivery
```

R2 is not an authorization boundary.

Document rendering remains separate.
Legacy Dashboard rendering remains separate until its cleanup issue removes the old Staff Cost consumer.

## Legacy compatibility

During cutover the Worker still exposes `/api/staff-cost` and the old Supabase `staff-cost-miniapp` Edge Function remains deployed.

The native page uses only `/api/miniapp`.

The old route/runtime is removed only in the follow-up cleanup issue after production verification.

## DEV / production runtime

```text
feature/* -> PR -> dev
                |
                +-> Cloudflare Preview: dev
                    https://dev-database-miniapp.loftauto-data.workers.dev
                    -> Telegram DEV Mini App
                |
                +-> verified -> PR dev -> main
                                  |
                                  +-> production deploy
                                      https://database-miniapp.loftauto-data.workers.dev
                                      -> Telegram production Mini App
```

`dev` Preview is an integration runtime, not a second source tree or a second Worker.
Cloudflare Previews are enabled for this Worker; pushes to non-production branches create/update preview builds.
It uses the same `database-miniapp` Worker definition with Preview configuration.
Business/backend data continues to come from the canonical Supabase Mini App API.

## Repository workflow

```text
feature/*
  -> PR -> dev
  -> integration verification
  -> PR dev -> main
  -> Cloudflare production deploy
```

See `AGENTS.md`.

Canonical backend contract and ADR live in `SGR198/database`.
