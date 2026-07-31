---
name: Client Portal Architecture
description: Session-based auth, DB tables, file storage, and key quirks for the Stonegate Intelligence client portal.
---

# Client Portal Architecture

## Auth approach
- **express-session + connect-pg-simple** (PostgreSQL session store, table `portal_sessions` auto-created)
- Sessions set `userId`, `userRole`, `userName`, `userEmail` on the session object
- Role guard middleware in `artifacts/api-server/src/middlewares/auth.ts`: `requireAuth` and `requireAdmin`
- Admin seeded on startup via `seedAdminAccount()` in `artifacts/api-server/src/lib/seedAdmin.ts` — reads `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` env vars, idempotent
- Invite-only: admin creates client via POST /api/portal/admin/clients → Resend sends invite email → client sets password at /portal/invite/:token → 72h expiry
- **No self-service password reset yet** (proposed as follow-up task #8)

## Database tables (all in `lib/db/src/schema/portal.ts`)
- `portal_users` — accounts, roles, password hashes, invite tokens
- `portal_cases` — one case per client (clientId FK), status, investigator, notes
- `portal_documents` — files with `direction` field: `client_upload` or `admin_share`
- `portal_messages` — threaded messages per case
- `portal_sessions` — auto-created by connect-pg-simple

## File storage
- Replit Object Storage (GCS-backed); storage route at `artifacts/api-server/src/routes/storage.ts`
- Auth check uses `req.session?.userId` (NOT Replit Auth's `req.isAuthenticated()`)
- Zod imports removed from storage route — template used `@workspace/api-zod` types that were wiped by codegen; replaced with inline manual validation

**Why:** The openapi codegen wipes and regenerates `lib/api-zod/src/generated/api.ts` on every run. Any types not defined in `lib/api-spec/openapi.yaml` will disappear after codegen. Storage types were pre-generated; do not re-add them to the spec or the codegen will create duplicates.

## Frontend auth
- `AuthProvider` + `useAuth()` in `artifacts/stonegate-site/src/lib/auth.tsx`
- `PortalGuard` component in `App.tsx` wraps protected routes — redirects unauthenticated users to /portal/login, non-admin users away from /portal/admin/*
- Portal.tsx is a redirect router: admin → /portal/admin, client → /portal/dashboard

## CORS
- `app.ts` uses `cors({ origin: true, credentials: true })` — required for cookie-based sessions across the proxy

## Key file paths
- Backend routes: `artifacts/api-server/src/routes/portal/admin.ts`, `.../client.ts`, `.../auth.ts`
- Frontend pages: `artifacts/stonegate-site/src/pages/portal/`
- Admin pages: `artifacts/stonegate-site/src/pages/portal/admin/`
