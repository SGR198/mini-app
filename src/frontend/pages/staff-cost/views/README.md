# Staff Cost views

Target large UI states for the Staff Cost migration.

Examples:
- accruals;
- payments;
- statement;
- balance.

This directory does not own business calculations.

## Canonical accrual detail screen pattern (Issue #95)

The existing **Кузовные начисления** and **Слесарные начисления** screens are the visual reference for every new accrual source screen (including both service advisors).

- Each detail view has its own back control, heading and data freshness badge (`bodyRepairHeader`).
- The content area contains source-specific totals and employee/period detail; source data comes from the Staff Cost API.
- The **bottom** section tabs (Начисления / Выплаты / Ведомость / Общий баланс) and period filters remain in their established fixed positions. Do not show the legacy Staff Cost top header/tabs on detail screens.
- Reuse existing employee/summary/filter markup and CSS. Do not invent another screen shell.
- Register every new source view in `accrualScreenCodes` in `accrual-screens.js`. `isAccrualDetailScreen(state.view)` drives the shared `accrual-list` body layout in `renderFilter()`. Never maintain a second manually enumerated source-view list there.
- `scripts/check-staff-cost-parity.mjs` guards this contract. Run the frontend build and parity check before merging.
- Do not change backend API, four card designs, or bottom navigation to add a detail screen.
