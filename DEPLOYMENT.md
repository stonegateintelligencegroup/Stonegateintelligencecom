# Deployment

## GitHub Pages public site

The public Vite site is built from `artifacts/stonegate-site` and deployed by
`.github/workflows/deploy-pages.yml`. In the repository settings, set
**Pages > Source** to **GitHub Actions**. The repository includes a `CNAME`
file for `stonegateintelligence.com`, and the production build uses `/` as its
base path for the custom domain.

The temporary migration page is available at
`https://stonegateintelligence.com/under-construction`. It does not replace the
public homepage; it can be used as a temporary landing page during a future
cutover if desired.

This repository now contains only the public storefront. It is a static Vite
site and does not require Express, Node.js at runtime, PostgreSQL, Drizzle,
authentication, sessions, or an API server. The consultation form opens a
pre-filled email in the visitor's mail application so it works without a
backend.

## DNS configuration

At your DNS provider, point the apex domain to GitHub Pages using these
records:

- `A` records for `185.199.108.153`, `185.199.109.153`,
  `185.199.110.153`, and `185.199.111.153`
- An optional `CNAME` for `www` pointing to
  `stonegateintelligencegroup.github.io`

Then add `stonegateintelligence.com` under **Settings > Pages > Custom domain**
and enable HTTPS after DNS finishes propagating.
