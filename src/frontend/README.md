# Frontend v2 source

This tree contains the new Mini App frontend source.

It is intentionally not wired to the current production renderer yet.
The legacy `public/index.html` remains production until the Staff Cost cutover issue.

```text
apps/
  -> deployable Mini Apps and app-level route composition

pages/
  -> reusable routable screens/features

shared/
  -> reusable API and Telegram client helpers
```

Page internals may use:

```text
page
  -> views
  -> components
```

If a sub-screen becomes a real URL/deep-link, model it as a route/page rather than hiding routing inside a view.
