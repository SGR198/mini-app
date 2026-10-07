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

- `dev` is the integration branch and base for issue/feature branches.
- `main` is the production source of truth.
- Do not merge issue/feature branches directly into `main`.
- Production changes enter `main` only through a release PR `dev -> main`.
- Cloudflare production deploy is triggered only by changes merged into `main`.
- Development verification happens before the release PR.
- `dev` is verified through the stable Cloudflare Worker Preview `dev-database-miniapp.loftauto-data.workers.dev`.
- Telegram DEV Mini App points to the stable `dev` Preview; Telegram production Mini App points to the production Worker URL.
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
