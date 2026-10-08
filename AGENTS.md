# Repository Workflow

Canonical branch flow for this repository:

```text
issue/feature branch
  -> PR -> dev
  -> integration verification
  -> PR dev -> main
  -> production release/deploy
```

Rules:

- `dev` is the integration branch and the base for every issue/feature branch.
- Normal development flow is mandatory: create an issue/feature branch from `dev`, open a PR back to `dev`, merge it into `dev`, then verify the integrated result in the stable DEV runtime.
- `main` is the production source of truth.
- Do not merge issue/feature branches directly into `main`.
- The stable Cloudflare Worker Preview `dev-database-miniapp.loftauto-data.workers.dev` is the canonical DEV runtime and is opened through the Easy Prokat Telegram DEV bot.
- Merging a PR into `dev` automatically triggers the configured Cloudflare Preview build/deploy and updates the stable DEV Preview; this is expected and is not a production release.
- There is no automatic promotion or merge from `dev` to `main`. Production is a separate, explicit release step. Never open/merge `dev -> main`, promote a Preview, or otherwise trigger a production deploy merely because DEV verification succeeded.
- A production release requires an explicit user instruction in the current task, such as “deploy to production” or “merge dev into main”. Without that explicit instruction, stop at the verified `dev` state.
- After explicit production approval, production changes enter `main` only through a release PR `dev -> main`. Merging that release PR into `main` automatically triggers the configured Cloudflare production build/deploy (`npm run build` -> `npm run deploy`).
- Telegram production Mini App points to the production Worker URL.
- Non-production branches must use Worker Previews and must never deploy/promote production.
- Use Cloudflare Workers Static Assets for the Mini App frontend.
- Keep business data and canonical domain logic in Supabase.
- Do not move API/runtime logic from Supabase to Cloudflare unless a separate issue explicitly requires it.

## Cross-repository boundary

`SGR198/mini-app` owns frontend source, Cloudflare Worker source and renderer build source.

`SGR198/database` owns PostgreSQL, migrations, Supabase Edge Functions, access/delivery integration and database-facing application contracts.

Canonical cross-repository contract:
`SGR198/database/applications/mini-app/`.

Canonical architecture decision:
`SGR198/database/docs/adr/applications/mini-app/_scope/0028-mini-app-ownership-backend-and-rendering-boundary.md`.

Do not copy PostgreSQL/Edge implementation into this repository.
Do not copy frontend source into `SGR198/database`.
