#!/usr/bin/env node
// Step 8b: Render the merged matrix into the CIPP Permissions Catalog - the standalone
// HTML reference page that is the primary deliverable of this repo. Fully self-contained
// (inline CSS + JS, no external requests), light/dark theme aware, with client-side
// filtering.
//
// Usage: node render-catalog-html.js <outDir> <htmlOutPath>
//   <outDir> contains permission-matrix-merged.json, backend-only-permissions.json,
//            and provenance.json
'use strict';
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(process.argv[2] || 'output');
const HTML_OUT = path.resolve(process.argv[3] || 'cipp-permissions-catalog.html');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
// repository.url is npm-canonical ("git+https://...git") — normalize to a browser URL.
const REPO_URL = pkg.repository?.url.replace(/^git\+/, '').replace(/\.git$/, '') || null;

const table = JSON.parse(fs.readFileSync(path.join(OUT, 'permission-matrix-merged.json'), 'utf8'));
const backendOnly = JSON.parse(fs.readFileSync(path.join(OUT, 'backend-only-permissions.json'), 'utf8'));
const provPath = path.join(OUT, 'provenance.json');
const prov = fs.existsSync(provPath) ? JSON.parse(fs.readFileSync(provPath, 'utf8')) : null;

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const byCategory = {};
for (const row of table) (byCategory[row.Category] ||= []).push(row);
const categories = Object.keys(byCategory).sort();

const allMismatches = [];
for (const row of table)
  for (const mm of row.CrossCheck?.Mismatches || [])
    allMismatches.push({ perm: `${row.Category}.${row.Object}`, ...mm });
allMismatches.sort((a, b) => a.perm.localeCompare(b.perm));

const STATUS = {
  CONSISTENT: { label: 'Consistent', cls: 'ok' },
  MISMATCHES_FOUND: { label: 'Mismatches', cls: 'warn' },
  BASELINE_OR_UNCHECKED: { label: 'Unchecked', cls: 'muted' },
  NO_NAV_OR_COMPONENT_GATE_CHECKED: { label: 'No gate to check', cls: 'muted' },
};

const counts = { ok: 0, warn: 0, muted: 0 };
for (const row of table) counts[STATUS[row.CrossCheck?.Status]?.cls || 'muted']++;

const chip = (status) => {
  const s = STATUS[status] || { label: status || 'n/a', cls: 'muted' };
  return `<span class="chip ${s.cls}">${esc(s.label)}</span>`;
};

const fnList = (label, fns) =>
  fns?.length
    ? `<details class="fns"><summary>${esc(label)} <span class="count">${fns.length}</span></summary><div class="fnwrap">${fns
        .map((f) => `<code>${esc(f)}</code>`)
        .join(' ')}</div></details>`
    : '';

const mismatchRows = (mms, withPerm) =>
  mms
    .map(
      (mm) => `<tr>${withPerm ? `<td><code>${esc(mm.perm)}</code></td>` : ''}<td>${esc(mm.Page)}<div class="src">${esc(
        mm.PageFile || ''
      )}</div></td><td><code>${esc(mm.Endpoint)}</code></td><td><code class="req">${esc(mm.BackendRole)}</code></td></tr>`
    )
    .join('');

let sections = '';
for (const cat of categories) {
  const catMm = byCategory[cat].reduce((n, r) => n + (r.CrossCheck?.Mismatches?.length || 0), 0);
  sections += `<section class="category" id="cat-${esc(cat)}"><h2>${esc(cat)}${
    catMm ? ` <span class="chip warn">${catMm} mismatch${catMm > 1 ? 'es' : ''}</span>` : ''
  }</h2>`;
  for (const row of byCategory[cat]) {
    const bf = row.BackendFunctions || {};
    const mms = row.CrossCheck?.Mismatches || [];
    const permId = `perm-${esc(row.Category)}-${esc(row.Object)}`;
    sections += `<article class="perm" id="${permId}">
      <header><h3><code>${esc(row.Category)}.${esc(row.Object)}</code><a class="permalink" href="#${permId}" title="Permalink to ${esc(
        row.Category
      )}.${esc(row.Object)}">&para;</a></h3>${chip(row.CrossCheck?.Status)}</header>
      <p class="desc">${esc(row.Description)}</p>
      <p class="nav-sections"><span class="lbl">Unlocks</span> ${
        row.NavSections
          ? row.NavSections.split('|').map((s) => `<span class="crumb">${esc(s.trim())}</span>`).join(' ')
          : '<em>no frontend UI surface</em>'
      }</p>
      ${fnList('Backend functions at Read', bf.Read)}
      ${fnList('Backend functions at ReadWrite', bf.ReadWrite)}
      ${
        mms.length
          ? `<div class="mmbox"><p class="lbl">UI visible under this permission, but action requires a different one:</p><div class="tblwrap"><table><thead><tr><th>Page / source</th><th>Endpoint</th><th>Backend requires</th></tr></thead><tbody>${mismatchRows(
              mms,
              false
            )}</tbody></table></div></div>`
          : ''
      }
    </article>`;
  }
  sections += `</section>`;
}

let backendOnlySection = `<section id="backend-only"><h2>Backend-only permissions <span class="chip muted">${backendOnly.length}</span></h2>
<p class="desc">Declared by CIPP-API functions but with no frontend UI surface. Relevant for API-client roles, or as pairing requirements where a UI feature calls one of these functions under the hood.</p>`;
for (const b of backendOnly) {
  const other = Object.entries(b.Other || {});
  backendOnlySection += `<article class="perm" id="perm-${esc(b.CategoryObject).replace(/\./g, '-')}">
    <header><h3><code>${esc(b.CategoryObject)}</code></h3><span class="chip muted">API-only</span></header>
    ${fnList('Backend functions at Read', (b.Read || []).map((f) => f.replace(/^Invoke-/, '')))}
    ${fnList('Backend functions at ReadWrite', (b.ReadWrite || []).map((f) => f.replace(/^Invoke-/, '')))}
    ${other.map(([lvl, fns]) => fnList(`Backend functions at ${lvl}`, fns.map((f) => f.replace(/^Invoke-/, '')))).join('')}
  </article>`;
}
backendOnlySection += '</section>';

const provLine = prov
  ? `Generated ${esc(prov.generatedAt.slice(0, 10))} from CIPP ${esc(prov.cipp.version || '?')} (<code>${esc(
      prov.cipp.commit
    )}</code>${prov.cipp.dirty ? ', local changes' : ''}) + CIPP-API ${esc(prov.cippApi.version || '?')} (<code>${esc(
      prov.cippApi.commit
    )}</code>${prov.cippApi.dirty ? ', local changes' : ''})`
  : 'Provenance unavailable - regenerate via run-pipeline.js';

const attribution = [
  `Generated by <strong>${esc(pkg.name)}</strong>`,
  'Created by Matthew Gray (Queensland Computers)',
  'Licensed under <a href="https://www.gnu.org/licenses/agpl-3.0.html">AGPL-3.0</a>',
  REPO_URL ? `<a href="${esc(REPO_URL)}">View Source on GitHub</a>` : null,
].filter(Boolean).join(' | ');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CIPP Permissions Catalog</title>
<style>
:root{
  --paper:#FAFAF8; --ink:#22262E; --ink-2:#5A6070; --line:#E3E2DC;
  --accent:#3D6A8A; --accent-bg:#EDF2F6;
  --ok:#2F7D4F; --ok-bg:#EAF3EC; --warn:#A8512A; --warn-bg:#F7EDE6;
  --muted:#6E7480; --muted-bg:#EEEFF0; --card:#FFFFFF;
  --mono:ui-monospace,'Cascadia Code','SF Mono',Menlo,Consolas,monospace;
}
@media (prefers-color-scheme: dark){:root{
  --paper:#16181D; --ink:#E4E4DF; --ink-2:#9BA0AC; --line:#2C2F37;
  --accent:#7FA8C4; --accent-bg:#1E2833;
  --ok:#6FBE8C; --ok-bg:#1C2B22; --warn:#D98B5F; --warn-bg:#31241C;
  --muted:#8C919C; --muted-bg:#23262C; --card:#1C1F25;
}}
:root[data-theme="dark"]{
  --paper:#16181D; --ink:#E4E4DF; --ink-2:#9BA0AC; --line:#2C2F37;
  --accent:#7FA8C4; --accent-bg:#1E2833;
  --ok:#6FBE8C; --ok-bg:#1C2B22; --warn:#D98B5F; --warn-bg:#31241C;
  --muted:#8C919C; --muted-bg:#23262C; --card:#1C1F25;
}
:root[data-theme="light"]{
  --paper:#FAFAF8; --ink:#22262E; --ink-2:#5A6070; --line:#E3E2DC;
  --accent:#3D6A8A; --accent-bg:#EDF2F6;
  --ok:#2F7D4F; --ok-bg:#EAF3EC; --warn:#A8512A; --warn-bg:#F7EDE6;
  --muted:#6E7480; --muted-bg:#EEEFF0; --card:#FFFFFF;
}
body{background:var(--paper);color:var(--ink);font:15px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif;margin:0}
.layout{display:flex;gap:2.5rem;max-width:1180px;margin:0 auto;padding:2rem 1.25rem}
nav.toc{flex:0 0 200px;position:sticky;top:1.5rem;align-self:flex-start;font-size:.85rem;max-height:calc(100vh - 3rem);overflow-y:auto}
nav.toc .toc-title{text-transform:uppercase;letter-spacing:.08em;font-size:.7rem;color:var(--ink-2);margin:0 0 .6rem}
nav.toc a{display:flex;justify-content:space-between;gap:.5rem;color:var(--ink);text-decoration:none;padding:.3rem .5rem;border-radius:4px;border-left:2px solid transparent}
nav.toc a:hover{background:var(--accent-bg)}
nav.toc a .n{color:var(--warn);font-variant-numeric:tabular-nums}
main{flex:1;min-width:0}
h1{font-size:1.7rem;margin:.2rem 0 .3rem;text-wrap:balance}
.subtitle{color:var(--ink-2);max-width:62ch;margin:0 0 1rem}
.howbox{background:var(--accent-bg);border:1px solid var(--line);border-radius:6px;padding:.8rem 1.1rem;margin:0 0 1.4rem;font-size:.9rem;max-width:75ch}
.howbox p{margin:.3rem 0}
.howbox .lbl{display:block;margin-bottom:.2rem}
.stats{display:flex;flex-wrap:wrap;gap:.75rem;margin:0 0 1.2rem}
.stat{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:.55rem .9rem}
.stat b{font-size:1.25rem;font-variant-numeric:tabular-nums;display:block}
.stat span{font-size:.75rem;color:var(--ink-2);text-transform:uppercase;letter-spacing:.05em}
.stat.ok b{color:var(--ok)} .stat.warn b{color:var(--warn)} .stat.muted b{color:var(--muted)}
.filterbar{position:sticky;top:0;background:var(--paper);padding:.6rem 0;z-index:2;margin:0 0 1rem;border-bottom:1px solid var(--line)}
.filterbar input{width:100%;max-width:32rem;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:.5rem .8rem;font:inherit}
.filterbar input:focus{outline:2px solid var(--accent);outline-offset:1px}
.filterbar .fcount{font-size:.8rem;color:var(--ink-2);margin-left:.8rem}
h2{font-size:1.2rem;border-bottom:1px solid var(--line);padding-bottom:.4rem;margin:2.4rem 0 1rem;display:flex;align-items:center;gap:.6rem}
.perm{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:1rem 1.2rem;margin:0 0 1rem}
.perm[hidden]{display:none}
section.category[hidden]{display:none}
.perm header{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
.perm h3{margin:0;font-size:1rem}
.perm h3 code{font-family:var(--mono);color:var(--accent)}
a.permalink{color:var(--ink-2);text-decoration:none;margin-left:.4rem;opacity:0;font-size:.9em}
.perm:hover a.permalink,.perm:target a.permalink,a.permalink:focus-visible{opacity:1}
.perm:target{outline:2px solid var(--accent);outline-offset:2px}
.desc{margin:.5rem 0;max-width:70ch}
.lbl{text-transform:uppercase;letter-spacing:.07em;font-size:.68rem;color:var(--ink-2);font-weight:600}
.nav-sections{margin:.4rem 0 .7rem}
.crumb{display:inline-block;background:var(--accent-bg);border-radius:3px;padding:.05rem .45rem;font-size:.8rem;margin:.12rem 0}
.chip{font-size:.72rem;font-weight:600;padding:.15rem .55rem;border-radius:99px;white-space:nowrap}
.chip.ok{color:var(--ok);background:var(--ok-bg)}
.chip.warn{color:var(--warn);background:var(--warn-bg)}
.chip.muted{color:var(--muted);background:var(--muted-bg)}
details.fns{margin:.35rem 0;font-size:.85rem}
details.fns summary{cursor:pointer;color:var(--ink-2)}
details.fns summary:hover{color:var(--accent)}
details.fns .count{font-variant-numeric:tabular-nums;background:var(--muted-bg);border-radius:99px;padding:0 .45rem;font-size:.72rem}
.fnwrap{padding:.5rem 0 .2rem;display:flex;flex-wrap:wrap;gap:.35rem}
code{font-family:var(--mono);font-size:.83em}
.fnwrap code,.tblwrap code{background:var(--muted-bg);border-radius:3px;padding:.05rem .35rem}
code.req{background:var(--warn-bg);color:var(--warn)}
.mmbox{border-top:1px dashed var(--line);margin-top:.7rem;padding-top:.6rem}
.tblwrap{overflow-x:auto;margin-top:.4rem}
table{border-collapse:collapse;width:100%;font-size:.84rem}
th{text-align:left;color:var(--ink-2);font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;padding:.3rem .6rem .3rem 0}
td{padding:.35rem .6rem .35rem 0;border-top:1px solid var(--line);vertical-align:top}
td .src{color:var(--ink-2);font-family:var(--mono);font-size:.72rem;word-break:break-all}
footer{margin:3rem 0 1rem;padding-top:1rem;border-top:1px solid var(--line);color:var(--ink-2);font-size:.8rem;max-width:75ch}
footer p{margin:.4rem 0}
footer a{color:var(--accent)}
a:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media (max-width:820px){.layout{flex-direction:column}nav.toc{position:static;flex:none;display:flex;flex-wrap:wrap;gap:.25rem;max-height:none}nav.toc .toc-title{width:100%}}
</style>
</head>
<body>
<div class="layout">
<nav class="toc"><p class="toc-title">Categories</p>
${categories
  .map((c) => {
    const n = byCategory[c].reduce((s, r) => s + (r.CrossCheck?.Mismatches?.length || 0), 0);
    return `<a href="#cat-${esc(c)}">${esc(c)}${n ? `<span class="n">${n}</span>` : ''}</a>`;
  })
  .join('\n')}
<a href="#all-mismatches">All mismatches<span class="n">${allMismatches.length}</span></a>
<a href="#backend-only">Backend-only</a>
</nav>
<main>
<h1>CIPP Permissions Catalog</h1>
<p class="subtitle">Every <code>Category.Object</code> permission pair in CIPP, the features it unlocks, the backend API functions it governs, and where frontend visibility disagrees with backend enforcement.</p>
<div class="howbox">
<span class="lbl">How CIPP enforces these</span>
<p>Assign each pair as <code>.Read</code> (view) or <code>.ReadWrite</code> (view&nbsp;+&nbsp;act) when building custom roles. Enforcement is case-insensitive and <code>ReadWrite</code> implies <code>Read</code>.</p>
<p><strong>Nav permissions describe visibility, not capability</strong> - a page being visible does not mean its buttons work. A role needs the union of the backend roles its pages&rsquo; endpoints declare; the mismatch tables below enumerate exactly where a second permission is required.</p>
</div>
<div class="stats">
<div class="stat"><b>${table.length}</b><span>Permissions</span></div>
<div class="stat ok"><b>${counts.ok}</b><span>Consistent</span></div>
<div class="stat warn"><b>${counts.warn}</b><span>With mismatches</span></div>
<div class="stat muted"><b>${counts.muted}</b><span>Unchecked</span></div>
<div class="stat warn"><b>${allMismatches.length}</b><span>Total mismatches</span></div>
<div class="stat muted"><b>${backendOnly.length}</b><span>Backend-only</span></div>
</div>
<div class="filterbar">
<input id="filter" type="search" placeholder="Filter permissions - name, feature, page, backend function…" aria-label="Filter permissions">
<span class="fcount" id="fcount"></span>
</div>
${sections}
<section id="all-mismatches"><h2>All mismatches - role-design checklist</h2>
<p class="desc">Each row is a UI element visible under one permission whose action calls a backend function requiring a different permission. For tiered roles: grant both, or expect a 403 for that tier.</p>
<div class="tblwrap"><table><thead><tr><th>Granting permission</th><th>Page / source</th><th>Endpoint</th><th>Backend requires</th></tr></thead><tbody>${mismatchRows(
  allMismatches,
  true
)}</tbody></table></div>
</section>
${backendOnlySection}
<footer><p>${provLine}. Frontend gating, backend declarations, and cross-check results are extracted deterministically from the two repos; only the per-permission descriptions are human/AI-authored prose. This is a community reference, not an official CIPP project.</p>
<p><a href="https://github.com/KelvinTegelaar/CIPP">CIPP</a> and <a href="https://github.com/KelvinTegelaar/CIPP-API">CIPP-API</a> are &copy; Kelvin Tegelaar and contributors, licensed under <a href="https://www.gnu.org/licenses/agpl-3.0.html">AGPL-3.0</a>.</p>
<p class="attribution">${attribution}</p></footer>
</main>
</div>
<script>
(function () {
  var input = document.getElementById('filter');
  var fcount = document.getElementById('fcount');
  var perms = Array.prototype.slice.call(document.querySelectorAll('section.category .perm'));
  var cats = Array.prototype.slice.call(document.querySelectorAll('section.category'));
  var total = perms.length;
  perms.forEach(function (p) { p.dataset.search = p.textContent.toLowerCase(); });
  function apply() {
    var q = input.value.trim().toLowerCase();
    var shown = 0;
    perms.forEach(function (p) {
      var hit = !q || p.dataset.search.indexOf(q) !== -1;
      p.hidden = !hit;
      if (hit) shown++;
    });
    cats.forEach(function (c) {
      var any = c.querySelector('.perm:not([hidden])');
      c.hidden = !!q && !any;
    });
    fcount.textContent = q ? 'showing ' + shown + ' of ' + total : '';
  }
  input.addEventListener('input', apply);
})();
</script>
</body>
</html>`;

fs.writeFileSync(HTML_OUT, html, 'utf8');
console.log(`Rendered ${table.length} permissions, ${allMismatches.length} mismatches, ${backendOnly.length} backend-only pairs -> ${HTML_OUT}`);
