import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(projectDirectory, 'dist', 'public');
const template = await readFile(path.join(outputDirectory, 'index.html'), 'utf8');
const routes = JSON.parse(
  await readFile(path.join(projectDirectory, 'src', 'seo-routes.json'), 'utf8'),
);

const escapeAttribute = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

function renderRoute(route) {
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeAttribute(route.description)}" />`)
    .replace(/<meta name="robots" content="[^"]*" \/>/, `<meta name="robots" content="${escapeAttribute(route.robots)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${route.canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeAttribute(route.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeAttribute(route.description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${route.canonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeAttribute(route.title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeAttribute(route.description)}" />`);

  return html;
}

for (const route of routes) {
  const html = renderRoute(route);
  if (route.path === '/') {
    await writeFile(path.join(outputDirectory, 'index.html'), html);
    continue;
  }

  const routeDirectory = path.join(outputDirectory, route.path.slice(1));
  await mkdir(routeDirectory, { recursive: true });
  await writeFile(path.join(routeDirectory, 'index.html'), html);
}

const notFoundHtml = template
  .replace(/<title>[^<]*<\/title>/, '<title>Page Not Found | Stonegate Intelligence Group</title>')
  .replace(/<meta name="description" content="[^"]*" \/>/, '<meta name="description" content="The requested page could not be found." />')
  .replace(/<meta name="robots" content="[^"]*" \/>/, '<meta name="robots" content="noindex, follow" />')
  .replace(/\s*<link rel="canonical" href="[^"]*" \/>/, '')
  .replace(/<meta property="og:title" content="[^"]*" \/>/, '<meta property="og:title" content="Page Not Found | Stonegate Intelligence Group" />')
  .replace(/<meta property="og:description" content="[^"]*" \/>/, '<meta property="og:description" content="The requested page could not be found." />')
  .replace(/\s*<meta property="og:url" content="[^"]*" \/>/, '')
  .replace(/<meta name="twitter:title" content="[^"]*" \/>/, '<meta name="twitter:title" content="Page Not Found | Stonegate Intelligence Group" />')
  .replace(/<meta name="twitter:description" content="[^"]*" \/>/, '<meta name="twitter:description" content="The requested page could not be found." />');

await writeFile(path.join(outputDirectory, '404.html'), notFoundHtml);
