---
name: Intake Form Architecture
description: Multi-step public client intake form — DB schema, API routes, frontend, admin view, and email notification.
---

# Intake Form Architecture

## Overview
A 6-step multi-step public intake form at `/intake`, backed by the existing Express + PostgreSQL + Drizzle stack.

## Key decisions

**DB table** — `intake_submissions` in `lib/db/src/schema/intake.ts`. `services` is stored as a JSON string in a TEXT column (not a native PG array) for simplicity with Drizzle. Schema exported via `lib/db/src/schema/index.ts`.

**Why:** Native PG array support with Drizzle requires extra configuration; JSON-in-text is simpler and fully adequate for a string array.

**API routes** — All intake routes live in `artifacts/api-server/src/routes/intake.ts`, registered in `index.ts` via `router.use(intakeRouter)`.
- Public: `POST /api/intake` — rate limit 3/hr per IP, honeypot check, server-side validation, DB insert, Resend admin notification
- Admin: `GET /api/portal/admin/inquiries`, `GET /api/portal/admin/inquiries/:id`, `PATCH /api/portal/admin/inquiries/:id` — all behind `requireAdmin` middleware from `middlewares/auth.ts`

**Email notification** — Sends basic info (submission ID, name, client type, phone, email, services, timeline) but deliberately omits engagement details (case summary) for security. Directs Monica to the admin portal to view the full submission.

**Why:** Keeping sensitive case details out of email reduces exposure if the mailbox is ever compromised.

**Frontend** — `artifacts/stonegate-site/src/pages/Intake.tsx` — single-component multi-step form. Uses local React state (no external form library). `editFrom` state enables jumping back to a step from the review screen and returning after saving.

**Admin view** — `artifacts/stonegate-site/src/pages/portal/admin/AdminInquiries.tsx` — list + detail in one component (no router change needed). Reached via `/portal/admin/inquiries` (PortalGuard adminOnly).

**Navigation** — "Client Intake" link added to Navbar between Services and Client Portal.

**Status values** — `new_inquiry`, `contacted`, `consultation_scheduled`, `proposal_sent`, `accepted`, `declined`, `closed`.

## How to apply
- When adding new fields to the intake form, update `lib/db/src/schema/intake.ts`, run a raw SQL migration (pg module at `node_modules/.pnpm/pg@8.22.0/node_modules/pg`), update the POST handler in `routes/intake.ts`, and update the frontend `FormData` interface in `Intake.tsx`.
- The `services` array must always be `JSON.stringify`-d before sending to the API and `JSON.parse`-d when reading from DB.
