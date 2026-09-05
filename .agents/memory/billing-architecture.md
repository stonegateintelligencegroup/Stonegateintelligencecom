---
name: Billing System Architecture
description: Schema, API routes, frontend pages, and quirks for the Billable Hours system
---

# Billing System Architecture

## Schema location
`lib/db/src/schema/billing.ts` — exported via `lib/db/src/schema/index.ts`

Tables: `billing_clients`, `billing_engagements`, `time_entries`, `invoices`,
`invoice_line_items`, `billing_settings`, `billing_audit_log`

## drizzle-kit push workaround
`drizzle-kit push` fails headlessly (no TTY) when new tables exist that could
conflict with existing ones — it tries to prompt for rename/create decisions.
**Workaround:** run raw SQL via `node -e "const {Pool} = require('pg')…"` to
create tables directly when `drizzle-kit push` can't run in CI/non-TTY.

**Why:** The deployment shell environment is non-interactive; drizzle-kit 0.31.x
requires a real TTY for its tablesResolver interactive prompt.

**How to apply:** Any future migration that adds new tables should use the raw
SQL approach if drizzle-kit push fails with the TTY error.

## API routes
`artifacts/api-server/src/routes/billing.ts` — mounted at `/portal/billing`
in `artifacts/api-server/src/routes/index.ts`.
All routes are behind `requireAdmin` middleware.

Key endpoints:
- `GET/POST/PATCH/DELETE /portal/billing/clients`
- `GET/POST/PATCH/DELETE /portal/billing/engagements`
- `GET/POST/PATCH/DELETE /portal/billing/time-entries`
- `POST /portal/billing/time-entries/bulk-status`
- `POST /portal/billing/time-entries/:id/duplicate`
- `GET /portal/billing/time-entries/summary`
- `GET /portal/billing/reports/by-client|by-case|by-investigator|billing-summary`
- `GET/POST/PATCH /portal/billing/invoices`
- `GET/PATCH /portal/billing/settings`
- `GET /portal/billing/audit-log`

## Billing increment rounding
Default: 6-minute (0.1 hr) increments. Stored in `billing_settings` table
under key `billing_increment_minutes`. Always round UP via `Math.ceil`.

## Invoice numbering
Format: `SIG-YYYY-NNNN` (e.g. SIG-2026-0001). Sequence resets each calendar year.
Query `invoices` WHERE `invoice_number LIKE 'SIG-YYYY-%'` ORDER BY DESC LIMIT 1
to find the last number, then increment.

## Frontend pages
All billing pages live under `artifacts/stonegate-site/src/pages/portal/admin/billing/`:
- `BillingLayout.tsx` — shared sub-nav (Dashboard / Clients / Engagements / Time Entries)
- `BillingDashboard.tsx` — summary cards + filters + quick links
- `BillingClients.tsx` — CRUD for billing clients
- `BillingEngagements.tsx` — CRUD for engagements + budget/retainer progress bar
- `BillingTimeEntries.tsx` — sortable/filterable table + bulk status + CSV export
- `TimeEntryModal.tsx` — shared create/edit modal with live hour+amount preview

Routes are registered in `App.tsx` at `/portal/admin/billing/*`, all admin-gated.
"Billable Hours" nav link added to AdminDashboard header.

## Rate auto-fill priority
Time entry rate: engagement.hourlyRate → client.defaultRate → manual override.

## Billing clients ↔ Portal users auto-link
- `POST /portal/admin/clients` auto-creates a matching billing client (linkedPortalUserId set) so Monica can log hours immediately after adding a portal client.
- `BillingClients.tsx` shows an "unlinked portal clients" banner for any portal user with no billing record — click to pre-fill the create form.
- DELETE billing client cascades: statement items → statements → invoices → time_entries → engagements → client (FK order). Route now does this explicitly before deleting.

## Statement email endpoint
`POST /portal/billing/statements/:id/send-email` — builds a professional HTML email from statement data and sends via Resend to:
1. Client's `billingEmail` (falls back to `email`, then portal user's email if linked)
2. Always also sends to monica.morgado@stonegateintelligence.com
Returns `{ ok: true, sentTo: [...] }`.

## Statement form save fix
- `billingPeriod` now defaults to current month/year on create so the Save button is never disabled by default.
- Items loop filters out blank-description rows before POSTing to prevent 400 errors.
- Save errors surface in a visible red banner instead of failing silently.
