/**
 * Prerender the public pages after `expo export` (run in the Dockerfile).
 *
 *   node scripts/prerender.mjs dist
 *
 * The app is a hash-routed SPA, so crawlers (and phones before the bundle
 * loads) see an empty <div id="root">, and #/terms or #/privacy can't be
 * indexed at all. This writes, from the same copy the app uses
 * (src/content/*.ts):
 *   dist/index.html            landing content + Organization/WebSite JSON-LD
 *   dist/terms/index.html      Terms of Service at a real URL
 *   dist/privacy/index.html    Privacy Policy at a real URL
 *   dist/sitemap.xml, dist/robots.txt
 * React replaces #root's contents when the app mounts, so people with JS get
 * the live app as before. Needs Node ≥ 22.18 (type stripping for the .ts copy).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ORIGIN = 'https://klokd.co.ke';
const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(process.argv[2] || path.join(here, '..', 'dist'));
const src = path.join(here, '..', 'src', 'content');

const landing = await import(pathToFileURL(path.join(src, 'landing.ts')).href);
const { LEGAL } = await import(pathToFileURL(path.join(src, 'legal.ts')).href);

const shell = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!shell.includes('<div id="root"></div>')) throw new Error('dist/index.html has no empty #root to fill');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const br = s => esc(s).replace(/\n/g, '<br />');

// Readable before the bundle loads; the app's own styles take over on mount.
const STYLE = `<style id="prerender">
.pr{max-width:760px;margin:0 auto;padding:48px 20px 64px;color:#E8E8EE;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;overflow-y:auto;height:100%;box-sizing:border-box}
.pr h1{font-size:40px;line-height:1.1;margin:0 0 16px;letter-spacing:-1px}.pr h1 em{color:#00E5A0;font-style:normal}
.pr h2{font-size:22px;margin:40px 0 8px}.pr h3{font-size:16px;margin:20px 0 4px}.pr p,.pr li{color:#B4B4C0}
.pr a{color:#00E5A0}.pr nav a{margin-right:16px}.pr small{color:#8A8A99}
</style>`;

function page({ urlPath, title, description, body, jsonLd }) {
  const url = `${ORIGIN}${urlPath}`;
  let html = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace('</head>', `${STYLE}\n${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n` : ''}</head>`)
    .replace('<div id="root"></div>', `<div id="root"><main class="pr">${body}</main></div>`);
  return html;
}

const nav = `<nav><a href="/">Klokd</a><a href="/#/signin?persona=worker">For workers</a><a href="/#/signin?persona=employer">For employers</a></nav>`;
const footer = `<footer><p><small>© ${new Date().getFullYear()} Klokd · Nairobi, Kenya</small></p><nav><a href="/terms">Terms</a><a href="/privacy">Privacy</a></nav></footer>`;
const steps = list => `<ol>${list.map(s => `<li><strong>${esc(s.t)}.</strong> ${esc(s.d)}</li>`).join('')}</ol>`;

// ─── Landing ────────────────────────────────────────────
const { HERO, AREAS, PROOF, HOW, WORKER_FLOW, EMPLOYER_FLOW, WORKER_STEPS, EMPLOYER_STEPS, BUILT_IN, CLOSING } = landing;
const landingBody = `${nav}
<h1>${esc(HERO.h1Lead)} <em>${esc(HERO.h1Accent)}</em></h1>
<p>${esc(HERO.sub)}</p>
<p><a href="/#/signin">Get early access →</a></p>
<ul>${PROOF.map(p => `<li><strong>${esc(p.title)}.</strong> ${esc(p.body)}</li>`).join('')}</ul>
<p>Now onboarding venues in ${AREAS.map(esc).join(', ')}.</p>
<h2>${esc(HOW.h2Lead)} ${esc(HOW.h2Accent)} ${esc(HOW.h2Tail)}</h2>
<p>${esc(HOW.sub)}</p>
<h3>For workers: ${br(WORKER_FLOW.title)}</h3>${steps(WORKER_STEPS)}
<h3>For employers: ${br(EMPLOYER_FLOW.title)}</h3>${steps(EMPLOYER_STEPS)}
<h2>Built in</h2><ul>${BUILT_IN.map(b => `<li><strong>${esc(b.k)}:</strong> ${esc(b.l)}</li>`).join('')}</ul>
<h2>${esc(CLOSING.h)}</h2><p>${esc(CLOSING.p)}</p>
${footer}`;

const description = 'Klokd connects Nairobi businesses with verified shift workers. Post a shift, pick an ID-verified worker, and approve the hours in one place.';
fs.writeFileSync(
  path.join(dist, 'index.html'),
  page({
    urlPath: '/',
    title: 'Klokd — Verified shift workers in Nairobi',
    description,
    body: landingBody,
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'Organization', name: 'Klokd', url: `${ORIGIN}/`, logo: `${ORIGIN}/icon.png`, areaServed: 'Nairobi, Kenya' },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Klokd', url: `${ORIGIN}/` },
    ],
  })
);

// ─── Legal ──────────────────────────────────────────────
for (const doc of ['terms', 'privacy']) {
  const c = LEGAL[doc];
  const body = `${nav}
<h1>${esc(c.title)}</h1>
<p><small>Last updated ${esc(c.updated)}</small></p>
<p>${esc(c.intro)}</p>
${c.sections.map(s => `<h2>${esc(s.h)}</h2><p>${esc(s.p)}</p>`).join('\n')}
${footer}`;
  fs.mkdirSync(path.join(dist, doc), { recursive: true });
  fs.writeFileSync(
    path.join(dist, doc, 'index.html'),
    page({ urlPath: `/${doc}`, title: `${c.title} — Klokd`, description: c.intro.slice(0, 155), body })
  );
}

// ─── 404 page ───────────────────────────────────────────
// Served by Caddy with a real 404 status. No app bundle: the app would mount
// and show the landing page at a URL that doesn't exist.
fs.writeFileSync(
  path.join(dist, '404.html'),
  page({
    urlPath: '/',
    title: 'Page not found — Klokd',
    description: 'This page doesn’t exist.',
    body: `${nav}\n<h1>Page not found</h1>\n<p>There’s nothing at this address. <a href="/">Go to the Klokd home page</a>.</p>\n${footer}`,
  })
    .replace(/<script src="[^"]*" defer><\/script>/g, '')
    .replace(/<link rel="canonical"[^>]*>/, '<meta name="robots" content="noindex" />')
);

// ─── security.txt (RFC 9116) ────────────────────────────
// Where someone who finds a security hole reports it. Rebuilt on every deploy,
// so Expires (max one year) keeps moving.
const expires = new Date(Date.now() + 330 * 86_400_000).toISOString().replace(/\.\d+Z$/, '.000Z');
fs.mkdirSync(path.join(dist, '.well-known'), { recursive: true });
fs.writeFileSync(
  path.join(dist, '.well-known', 'security.txt'),
  `Contact: mailto:support@klokd.co.ke\nExpires: ${expires}\nPreferred-Languages: en\nCanonical: ${ORIGIN}/.well-known/security.txt\n`
);

// ─── Sitemap + robots ───────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const urls = ['/', '/terms', '/privacy'];
fs.writeFileSync(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(u => `  <url><loc>${ORIGIN}${u}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`
);
// The signed-in workspaces live behind #/ routes, which crawlers never request.
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);

console.log(`[prerender] ${urls.length} pages, sitemap.xml, robots.txt → ${dist}`);
