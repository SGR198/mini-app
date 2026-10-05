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
- Use Cloudflare Workers Static Assets for the Mini App frontend.
- Keep business data and canonical domain logic in Supabase.
- Do not move API/runtime logic from Supabase to Cloudflare unless a separate issue explicitly requires it.
