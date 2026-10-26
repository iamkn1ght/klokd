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
const { PAGES } = await import(pathToFileURL(path.join(src, 'pages.ts')).href);

let shell = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!shell.includes('<div id="root"></div>')) throw new Error('dist/index.html has no empty #root to fill');
// Large link-preview card (public/og.png, 1200×630) instead of the small icon.
shell = shell
  .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${ORIGIN}/og.png$2`)
  .replace(/<meta name="twitter:card" content="summary" \/>/, '<meta name="twitter:card" content="summary_large_image" />\n    <meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />');

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

const navPages = PAGES.filter(p => p.nav);
const nav = `<nav><a href="/">Klokd</a>${navPages.map(p => `<a href="${p.path}">${esc(p.nav)}</a>`).join('')}</nav>`;
const footer = `<footer><p><small>© ${new Date().getFullYear()} Klokd · Nairobi, Kenya</small></p><nav>${navPages.map(p => `<a href="${p.path}">${esc(p.nav)}</a>`).join('')}<a href="/terms">Terms</a><a href="/privacy">Privacy</a></nav></footer>`;
const steps = list => `<ol>${list.map(s => `<li><strong>${esc(s.t)}.</strong> ${esc(s.d)}</li>`).join('')}</ol>`;

// ─── Landing ────────────────────────────────────────────
const { HERO, AREAS, PROOF, HOW, WORKER_FLOW, EMPLOYER_FLOW, WORKER_STEPS, EMPLOYER_STEPS, BUILT_IN, CLOSING } = landing;
const landingBody = `${nav}
<p><strong>${esc(HERO.kicker)}</strong></p>
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

// ─── Marketing + guide pages (static, no app bundle) ────
// Real pages for search: one per audience, pricing, and guides, each with its
// own title, description, canonical and structured data. Pure HTML + one
// inline stylesheet (the CSP allows inline styles, no inline script runs).
const ORG = { '@type': 'Organization', name: 'Klokd', url: `${ORIGIN}/`, logo: `${ORIGIN}/icon.png` };
const LOGO = `<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="8" fill="#00E5A0"/><path d="M9 7h3.4v5.6L17.2 7h4.1l-5.6 6.4L21.6 21h-4.2l-4.1-5.6-.9 1V21H9z" fill="#0A0A0F"/></svg>`;
const SITE_CSS = `
:root{--ink:#0A0A0F;--ink2:#12121A;--line:rgba(255,255,255,.09);--text:#F2F2F5;--mute:#A6A6B4;--soft:#7E7E8C;--el:#00E5A0;--volt:#BCFF4E}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;overflow-x:hidden;background:var(--ink);color:var(--text);font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
a{color:var(--el);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
header{position:sticky;top:0;z-index:5;background:rgba(10,10,15,.86);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.bar{display:flex;align-items:center;gap:20px;height:64px}
.brand{display:flex;flex-shrink:0;align-items:center;gap:10px;color:var(--text);font-weight:900;letter-spacing:-.4px;font-size:19px}.brand:hover{text-decoration:none}
.links{display:flex;gap:4px;margin-left:auto;min-width:0;overflow-x:auto;scrollbar-width:none}.links::-webkit-scrollbar{display:none}
.links a{color:var(--mute);font-size:14px;font-weight:600;padding:8px 10px;border-radius:8px;white-space:nowrap}.links a:hover,.links a[aria-current]{color:var(--text);background:rgba(255,255,255,.06);text-decoration:none}
.btn{display:inline-block;background:var(--el);color:var(--ink);font-weight:800;font-size:15px;padding:12px 20px;border-radius:12px;white-space:nowrap}.btn:hover{text-decoration:none;filter:brightness(1.08)}
.btn.sm{font-size:13px;padding:8px 14px;border-radius:10px}
.hero{padding:72px 0 40px}
.eyebrow{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.9px;text-transform:uppercase;color:var(--el);border:1px solid rgba(0,229,160,.3);background:rgba(0,229,160,.06);padding:5px 11px;border-radius:999px;margin-bottom:18px}
h1{overflow-wrap:break-word;font-size:clamp(32px,6vw,54px);line-height:1.05;letter-spacing:-1.6px;margin:0 0 18px;max-width:820px;font-weight:900}
.lead{font-size:19px;color:var(--mute);max-width:680px;margin:0 0 28px}
.note{color:var(--soft);font-size:14px;margin-top:12px}
main section{padding:28px 0;border-top:1px solid var(--line)}
h2{font-size:26px;letter-spacing:-.6px;margin:0 0 14px;font-weight:850}
p{margin:0 0 12px;max-width:720px}main p,main li,td{color:var(--mute)}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:14px;list-style:none;padding:0;margin:0;counter-reset:s}
.steps li{counter-increment:s;background:var(--ink2);border:1px solid var(--line);border-radius:16px;padding:18px}
.steps li::before{content:counter(s);display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;border:1px solid rgba(0,229,160,.4);color:var(--el);font-weight:800;font-size:13px;margin-bottom:10px}
.steps strong{display:block;color:var(--text);margin-bottom:4px}
.checks{list-style:none;padding:0;margin:0;display:grid;gap:10px;max-width:760px}
.checks li{padding-left:28px;position:relative}.checks li::before{content:"";position:absolute;left:0;top:7px;width:14px;height:8px;border-left:2px solid var(--el);border-bottom:2px solid var(--el);transform:rotate(-45deg)}
.bullets{max-width:720px;padding-left:20px}
table{width:100%;max-width:820px;border-collapse:collapse;font-size:15px}th,td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--text);font-size:13px;letter-spacing:.3px}td:first-child{color:var(--text);font-weight:600}
.tablewrap{overflow-x:auto}
details{border:1px solid var(--line);border-radius:14px;padding:14px 18px;margin-bottom:10px;background:var(--ink2);max-width:820px}
summary{cursor:pointer;font-weight:700;color:var(--text)}details p{margin:10px 0 0}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:14px}
.card{display:block;background:var(--ink2);border:1px solid var(--line);border-radius:16px;padding:20px;color:var(--text)}.card:hover{border-color:rgba(0,229,160,.4);text-decoration:none}
.card b{display:block;font-size:17px;margin-bottom:6px}.card span{color:var(--mute);font-size:15px}
.sources{font-size:14px}.sources li{margin-bottom:4px}
.band{margin:40px 0 56px;padding:32px;border-radius:20px;border:1px solid rgba(0,229,160,.25);background:linear-gradient(135deg,rgba(0,229,160,.08),rgba(188,255,78,.04));display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:space-between}
.band h2{margin:0}
footer{border-top:1px solid var(--line);padding:28px 0 40px;color:var(--soft);font-size:14px}
.foot{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center;justify-content:space-between}.foot nav{display:flex;flex-wrap:wrap;gap:14px}.foot a{color:var(--mute)}
@media (max-width:640px){.bar{gap:12px}.hero{padding:44px 0 28px}.lead{font-size:17px}.btn.sm{display:none}.band{padding:24px}}
`;

function sectionHtml(s) {
  let out = `<h2>${esc(s.h)}</h2>`;
  for (const para of s.p ?? []) out += `<p>${esc(para)}</p>`;
  if (s.steps) out += `<ol class="steps">${s.steps.map(x => `<li><strong>${esc(x.t)}</strong>${esc(x.d)}</li>`).join('')}</ol>`;
  if (s.list) out += `<ul class="checks">${s.list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  if (s.table) {
    out += `<div class="tablewrap"><table><thead><tr>${s.table.head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${s.table.rows
      .map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table></div>`;
  }
  return `<section>${out}</section>`;
}

function structuredData(p) {
  const url = `${ORIGIN}${p.path}`;
  const crumbs = [{ name: 'Klokd', url: `${ORIGIN}/` }];
  if (p.kind === 'guide') crumbs.push({ name: 'Guides', url: `${ORIGIN}/guides` });
  crumbs.push({ name: p.h1, url });
  const out = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
    },
  ];
  if (p.kind === 'service') {
    out.push({ '@context': 'https://schema.org', '@type': 'Service', name: p.h1, description: p.description, url, provider: ORG, areaServed: { '@type': 'City', name: 'Nairobi' } });
  }
  if (p.kind === 'guide') {
    out.push({ '@context': 'https://schema.org', '@type': 'Article', headline: p.h1, description: p.description, url, author: ORG, publisher: ORG, dateModified: p.reviewed, datePublished: p.reviewed, inLanguage: 'en-KE' });
  }
  if (p.faq?.length) {
    out.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  }
  return out;
}

function staticPage(p) {
  const url = `${ORIGIN}${p.path}`;
  const guides = PAGES.filter(x => x.kind === 'guide');
  let body = p.sections.map(sectionHtml).join('\n');
  if (p.kind === 'index') {
    body += `<section><div class="cards">${guides.map(g => `<a class="card" href="${g.path}"><b>${esc(g.h1)}</b><span>${esc(g.description)}</span></a>`).join('')}</div></section>`;
  }
  if (p.faq?.length) body += `<section><h2>Questions</h2>${p.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>`;
  if (p.sources?.length || p.reviewed) {
    body += `<section class="sources">${p.reviewed ? `<p>Last reviewed ${new Date(p.reviewed).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. General information, not legal advice.</p>` : ''}${
      p.sources?.length ? `<h2>Sources</h2><ul class="bullets">${p.sources.map(s => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a></li>`).join('')}</ul>` : ''
    }</section>`;
  }
  if (p.kind === 'guide') {
    const others = guides.filter(g => g.path !== p.path);
    body += `<section><h2>More guides</h2><div class="cards">${others.map(g => `<a class="card" href="${g.path}"><b>${esc(g.h1)}</b><span>${esc(g.description)}</span></a>`).join('')}</div></section>`;
  }
  const navLinks = navPages
    .map(n => `<a href="${n.path}"${n.path === p.path || (p.kind === 'guide' && n.path === '/guides') ? ' aria-current="page"' : ''}>${esc(n.nav)}</a>`)
    .join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}" />
<meta name="theme-color" content="#0A0A0F" />
<link rel="canonical" href="${url}" />
<link rel="icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/icon.png" />
<meta property="og:type" content="${p.kind === 'guide' ? 'article' : 'website'}" />
<meta property="og:site_name" content="Klokd" />
<meta property="og:url" content="${url}" />
<meta property="og:title" content="${esc(p.title)}" />
<meta property="og:description" content="${esc(p.description)}" />
<meta property="og:image" content="${ORIGIN}/og.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<style>${SITE_CSS}</style>
<script type="application/ld+json">${JSON.stringify(structuredData(p))}</script>
</head>
<body>
<header><div class="wrap bar"><a class="brand" href="/">${LOGO}Klokd</a><nav class="links" aria-label="Main">${navLinks}</nav><a class="btn sm" href="/#/signin">Get early access</a></div></header>
<main class="wrap">
<div class="hero"><span class="eyebrow">${esc(p.eyebrow)}</span><h1>${esc(p.h1)}</h1><p class="lead">${esc(p.lead)}</p><a class="btn" href="${p.cta.href}">${esc(p.cta.text)} →</a>${p.cta.note ? `<p class="note">${esc(p.cta.note)}</p>` : ''}</div>
${body}
<div class="band"><h2>Verified shifts. Clear pay.</h2><a class="btn" href="/#/signin">Get early access →</a></div>
</main>
<footer><div class="wrap foot"><span>© ${new Date().getFullYear()} Klokd · Nairobi, Kenya</span><nav aria-label="Footer">${navPages.map(n => `<a href="${n.path}">${esc(n.nav)}</a>`).join('')}${guides.map(g => `<a href="${g.path}">${esc(g.h1.split(':')[0])}</a>`).join('')}<a href="/terms">Terms</a><a href="/privacy">Privacy</a></nav></div></footer>
</body>
</html>
`;
}

for (const p of PAGES) {
  const dir = path.join(dist, ...p.path.split('/').filter(Boolean));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), staticPage(p));
}

// ─── llms.txt — a plain summary AI assistants read ──────
fs.writeFileSync(
  path.join(dist, 'llms.txt'),
  `# Klokd

> Klokd is a hospitality shift-work marketplace in Nairobi, Kenya. Workers verify their National ID once and pick shifts near them with the pay shown up front; businesses post shifts, pick an ID-verified worker, start the shift with a PIN on arrival, and approve the hours. Every shift has a written contract and a payslip with statutory deductions (PAYE, NSSF, SHIF). Free for workers; businesses pay 4% on top of the shift pay. M-Pesa payouts switch on with Klokd payments.

## Pages
${PAGES.filter(p => p.kind !== 'guide').map(p => `- [${p.h1}](${ORIGIN}${p.path}): ${p.description}`).join('\n')}

## Guides
${PAGES.filter(p => p.kind === 'guide').map(p => `- [${p.h1}](${ORIGIN}${p.path}): ${p.description}`).join('\n')}

## Legal
- [Terms of Service](${ORIGIN}/terms)
- [Privacy Policy](${ORIGIN}/privacy)
`
);

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
const urls = ['/', ...PAGES.map(p => p.path), '/terms', '/privacy'];
fs.writeFileSync(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(u => `  <url><loc>${ORIGIN}${u}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`
);
// The signed-in workspaces live behind #/ routes, which crawlers never request.
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);

console.log(`[prerender] ${urls.length} pages, sitemap.xml, robots.txt → ${dist}`);
