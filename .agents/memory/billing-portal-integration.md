---
name: Billing ↔ Portal Integration
description: How billing clients/engagements link to portal users/cases, and how navigation context flows via URL params
---

## Two-layer client model
- `portal_users` → portal accounts (auth, cases, notes, messages)
- `billing_clients` → billing entities; link via `billing_clients.linked_portal_user_id`
- `portal_cases` → case management; link via `billing_engagements.linked_portal_case_id`

## How links are set by admin
- In **Billing Clients** form: "Link to Portal Client" dropdown fetches `/api/portal/admin/clients`
- In **Billing Engagements** form: "Link to Portal Case" dropdown fetches `/api/portal/admin/cases`
- Both are optional; absence just means the billing record is standalone

## Navigation context (URL params)
Context flows through billing pages via search params:
- `from` — "portal" | "client" | "case"
- `fromId` — ID of the entity navigated from
- `fromName` — display name for breadcrumb
- `fromClientId` / `fromClientName` — parent client when coming from a case
- `clientId` — pre-selects client filter on BillingDashboard / BillingTimeEntries

`BillingLayout.tsx` reads these params and renders breadcrumbs + a context-aware back button.

## Clickable links in BillingTimeEntries
- Client name → `/portal/admin/clients/:linkedPortalUserId` (only if `linkedPortalUserId` set on time entry)
- Engagement name → `/portal/admin/cases/:linkedPortalCaseId` (only if `linkedPortalCaseId` set)
- API GET /time-entries returns both fields via joins on billing_clients and billing_engagements

## Key API routes (admin-only via requireAdmin middleware)
- `GET /api/portal/admin/clients/:id` — single client + their cases
- `GET /api/portal/admin/clients/:id/billing` — billing summary + entries for a portal client
- `GET /api/portal/admin/cases/:id/billing` — billing summary + entries for a portal case
- All billing CRUD under `/api/portal/billing/*`

## Billing Statements system
- `billing_statements` table: `portal_user_id` is the ownership key for client access control
- `billing_statement_items` table: `time_entry_ids` (JSON array) stored but **never sent to client**
- Admin routes: all under `/api/portal/billing/statements/*` with `requireAdmin` middleware
- Client routes: `/api/portal/client/statements` and `/api/portal/client/statements/:id`
  - Server checks `portalUserId === req.session.userId` before returning any statement
  - Only statuses `published/paid/partially_paid/overdue` are visible to clients
  - Items returned WITHOUT `timeEntryIds`, `adminNotes`, or internal billing details
- Statement number format: `SIG-YYYY-NNNN` (auto-incremented per year)
- `recalcStatementCharges()` auto-updates `current_charges` and `amount_due` on item save/delete
- PDF generation uses browser `window.print()` + CSS `@media print` (no server-side PDF library)
- Statement statuses: draft → published → paid/partially_paid/overdue/void

**Why:** The two-layer model was intentional (separate billing concept from portal auth).
The link fields are nullable FKs to allow gradual adoption — billing works without linking.
