# Frontend source

Canonical Mini App frontend source.

```text
apps/
  -> deployable Mini Apps and app-level routing

pages/
  -> reusable pages/features

shared/
  -> reusable API, Telegram and UI helpers

styles/
  -> source styles
```

Staff Cost is implemented as a native page under `pages/staff-cost/`.

Its runtime data comes from `/api/miniapp` and native `miniapp.staff_cost_*` backend contracts.

`public/` is generated build output. Do not treat generated assets as the canonical editing surface.
