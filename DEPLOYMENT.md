# Deployment

## GitHub Pages public site

The public Vite site is built from `artifacts/stonegate-site` and deployed by
`.github/workflows/deploy-pages.yml`. In the repository settings, set
**Pages > Source** to **GitHub Actions**.

GitHub Pages hosts the static public pages only. It cannot run the Express API,
Postgres database, sessions, portal authentication, or object storage. The
portal source remains in this repository but is intentionally not imported or
registered by the public frontend.

## Public API configuration

When the API is hosted separately, set the repository Actions variable
`VITE_API_BASE_URL` and pass it to the build step. The frontend uses this value
for public contact submissions. The API should set `PUBLIC_APP_URL` to the
deployed public site URL and provide its own database, session, email, and
Google Cloud Storage credentials.

Without a separately hosted API, the static marketing pages still work, but
contact form submissions require the API to be deployed before they can be
processed.

## Alternative

Cloudflare Pages is the better single-provider option if the API is migrated to
Cloudflare Workers and the database/storage services are moved to compatible
free-tier providers. The current Express/Postgres backend is not directly
deployable to GitHub Pages or Cloudflare Pages as-is.
