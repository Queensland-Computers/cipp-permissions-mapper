#!/usr/bin/env node
// Step 5: Structural cross-check of frontend permission gates against the
// backend permission map produced by extract-backend-permissions.js.
//
// Usage: node crosscheck.js <cippRepoRoot> <outDir>
//   <cippRepoRoot> = the CIPP frontend repo (must contain src/layouts/config.js, src/pages)
//   <outDir>       = dir containing backend-permission-map.json; results written here
//
// Methods (each hand-validated against CIPP/CIPP-API source during development):
//   Pattern 1: nav `path` -> Next.js page file resolution (headers verified via leaf children)
//   Pattern 2: structural endpoint roles (apiUrl prop = read; url: in action objects = write)
//   Pattern 3: shared-endpoint exclusion, two votes:
//              (a) frequency - endpoint in >= PLUMBING_FILE_THRESHOLD distinct files
//              (b) ambiguity - endpoint appears on nav pages whose gates name >= 2 distinct
//                  Category.Object pairs (one endpoint has one role, so it can't be evidence
//                  for either page; recorded as ambiguous-shared, not silently dropped)
//   Pattern 4: gate-variable pairing in shared components: `const x = checkPermissions([...])`
//              and `const x = permissions.includes('...')`, paired to action objects whose
//              condition references x
//   Pattern 5: file-level explicit gates - `cardButtonPermissions = [...]` and
//              `requiredPermissions={[...]}`; when a file declares exactly ONE distinct
//              permission set this way, it is paired with the file's action endpoints
//              (abstains when a file has competing sets)
//   Pattern 6: pages with no direct endpoints fall back to (a) sibling tabOptions.js tab
//              children, (b) one-hop relative imports - skipping imported files that carry
//              their own gates (checkPermissions/requiredPermissions/cardButtonPermissions),
//              since those are self-gated and covered by Patterns 4/5. Provenance recorded
//              in `via`.
//
// Verdict semantics are taken from the backend's actual enforcement, not assumed:
//   Test-CIPPAccess.ps1  `if ($Perm -match $APIRole)` - PowerShell -match is a
//   CASE-INSENSITIVE regex with the granted permission as input and the function's .ROLE as
//   pattern; unescaped dots match any char, and 'X.Y.ReadWrite' matches pattern 'X.Y.Read'
//   (prefix), so ReadWrite implies Read and casing differences do NOT break enforcement.
//   Base roles use -like include/exclude in the same file.
//   Consequence: Category/Object/Level comparisons here are case-insensitive, and casing
//   drift (e.g. Exchange.Spamfilter) is a catalog-fragmentation issue, not an enforcement
//   break - it is reported by extract-backend-permissions.js as naming-drift, not here as a
//   mismatch. If Test-CIPPAccess.ps1 changes upstream, re-verify these semantics.
//
// Baseline: backend CIPP.Core.Read = universally-held floor permission, never a mismatch.
//
// Output: crosscheck.json {denylist, ambiguousShared, nav, componentPairs, filePairs}
'use strict';
const fs = require('fs');
const path = require('path');
const { parseNavTree } = require('./lib/parse-nav');

const FRONTEND = path.resolve(process.argv[2] || '../CIPP');
const OUT = path.resolve(process.argv[3] || 'output');
const PAGES = path.join(FRONTEND, 'src', 'pages');
const SRC = path.join(FRONTEND, 'src');
const CONFIG_JS = path.join(FRONTEND, 'src', 'layouts', 'config.js');

for (const [what, p] of [['frontend src/pages', PAGES], ['frontend nav config', CONFIG_JS], ['backend map', path.join(OUT, 'backend-permission-map.json')]]) {
  if (!fs.existsSync(p)) {
    console.error(`FATAL: ${what} not found at ${p}`);
    process.exit(1);
  }
}

const backendMap = JSON.parse(fs.readFileSync(path.join(OUT, 'backend-permission-map.json'), 'utf8')).functions;
const endpointToRole = {};
for (const [fn, info] of Object.entries(backendMap)) {
  // Azure Functions routes are case-insensitive, so lookups are lowercased.
  endpointToRole[fn.replace(/^Invoke-/i, '').toLowerCase()] = {
    fnName: fn, role: info.Role, category: info.Category, object: info.Object, level: info.Level, file: info.File,
  };
}

// ---------- generic helpers ----------
function walk(dir, exts, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next') continue;
      walk(full, exts, out);
    } else if (exts.some((x) => e.name.endsWith(x))) out.push(full);
  }
  return out;
}

const API_RE = /\/api\/([A-Za-z0-9_]+)/g;
function endpointsIn(text) {
  const found = [];
  let m;
  API_RE.lastIndex = 0;
  while ((m = API_RE.exec(text)) !== null) found.push({ endpoint: m[1], index: m.index });
  return found;
}

const readFileCache = new Map();
function readSrc(f) {
  if (!readFileCache.has(f)) readFileCache.set(f, fs.readFileSync(f, 'utf8'));
  return readFileCache.get(f);
}

const SRC_FILES = walk(SRC, ['.js', '.jsx']);

// ---------- Pattern 3a: frequency denylist ----------
const PLUMBING_FILE_THRESHOLD = 4;
function buildDenylist() {
  const epFiles = {};
  for (const f of SRC_FILES) {
    const text = readSrc(f);
    const seen = new Set();
    for (const { endpoint } of endpointsIn(text)) seen.add(endpoint.toLowerCase());
    for (const ep of seen) {
      epFiles[ep] = epFiles[ep] || new Set();
      epFiles[ep].add(f);
    }
  }
  const denylist = new Set();
  const denylistDetail = {};
  for (const [ep, fset] of Object.entries(epFiles)) {
    if (fset.size >= PLUMBING_FILE_THRESHOLD) {
      denylist.add(ep);
      denylistDetail[ep] = fset.size;
    }
  }
  return { denylist, denylistDetail };
}

// ---------- resolve Next.js route -> page file ----------
function resolvePage(route) {
  if (!route || typeof route !== 'string') return null;
  const clean = route.replace(/^\//, '').replace(/\?.*$/, '');
  const cands = clean === ''
    ? [path.join(PAGES, 'index.js'), path.join(PAGES, 'index.jsx')]
    : [
        path.join(PAGES, clean, 'index.js'),
        path.join(PAGES, clean, 'index.jsx'),
        path.join(PAGES, clean + '.js'),
        path.join(PAGES, clean + '.jsx'),
      ];
  for (const c of cands) if (fs.existsSync(c)) return c;
  return null;
}

function resolveRelativeImport(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  const cands = [base, base + '.js', base + '.jsx', path.join(base, 'index.js'), path.join(base, 'index.jsx')];
  for (const c of cands) {
    if (fs.existsSync(c) && fs.statSync(c).isFile() && /\.jsx?$/.test(c)) return c;
  }
  return null;
}

// ---------- Pattern 2: structural endpoint extraction ----------
function enclosingObjectText(text, idx) {
  let depth = 0;
  let start = -1;
  for (let i = idx; i >= 0; i--) {
    const c = text[i];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth === 0) { start = i; break; }
      depth--;
    }
  }
  if (start < 0) return null;
  depth = 0;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { text: text.slice(start, i + 1), start, end: i + 1 };
    }
  }
  return null;
}

function classifyEndpoints(text) {
  const results = [];
  for (const { endpoint, index } of endpointsIn(text)) {
    const before = text.slice(Math.max(0, index - 80), index);
    let kind = 'other';
    let objText = null;
    if (/apiUrl\s*[=:]\s*[{("'`]*$/.test(before)) kind = 'read';
    else if (/url\s*:\s*["'`]$/.test(before)) {
      const obj = enclosingObjectText(text, index);
      objText = obj ? obj.text : null;
      if (objText && /(label|confirmText|type)\s*:/.test(objText)) kind = 'action';
    } else if (/ApiGetCall(WithPagination)?\s*\(\s*\{[^}]*$/.test(text.slice(Math.max(0, index - 200), index))) {
      kind = 'read';
    }
    const line = text.slice(0, index).split('\n').length;
    results.push({ endpoint, kind, line, objText });
  }
  return results;
}

// ---------- Pattern 6: fallbacks for pages with no direct endpoints ----------
const SELF_GATED_RE = /checkPermissions\(|requiredPermissions|cardButtonPermissions/;

function tabChildEndpoints(pageFile) {
  const dir = path.dirname(pageFile);
  const tabFile = ['tabOptions.js', 'tabOptions.jsx'].map((n) => path.join(dir, n)).find((p) => fs.existsSync(p));
  if (!tabFile) return [];
  const tabText = readSrc(tabFile);
  const out = [];
  for (const m of tabText.matchAll(/path:\s*["'`]([^"'`]+)["'`]/g)) {
    const child = resolvePage(m[1]);
    if (!child || child === pageFile) continue;
    for (const e of classifyEndpoints(readSrc(child))) {
      if (e.kind === 'other') continue;
      out.push({ ...e, via: `tab:${m[1]}` });
    }
  }
  return out;
}

function importedEndpoints(pageFile) {
  const text = readSrc(pageFile);
  const out = [];
  for (const m of text.matchAll(/import\s+[^'"]+from\s+['"](\.[^'"]+)['"]/g)) {
    const target = resolveRelativeImport(pageFile, m[1]);
    if (!target) continue;
    const ttext = readSrc(target);
    // Self-gated components carry their own permission checks - Patterns 4/5 cover
    // them; attributing their endpoints to this page would create false mismatches.
    if (SELF_GATED_RE.test(ttext)) continue;
    for (const e of classifyEndpoints(ttext)) {
      if (e.kind === 'other') continue;
      out.push({ ...e, via: `import:${path.relative(FRONTEND, target).replace(/\\/g, '/')}` });
    }
  }
  return out;
}

// ---------- Patterns 4 & 5: gate declarations in a file ----------
function gateDeclarations(text) {
  const decls = [];
  for (const m of text.matchAll(/const\s+(\w+)\s*=\s*checkPermissions\(\s*\[([^\]]*)\]/g)) {
    const perms = [...m[2].matchAll(/["'`]([^"'`]+)["'`]/g)].map((x) => x[1]);
    decls.push({ varName: m[1], perms, line: text.slice(0, m.index).split('\n').length });
  }
  for (const m of text.matchAll(/const\s+(\w+)\s*=\s*permissions\.includes\(\s*["'`]([^"'`]+)["'`]\s*\)/g)) {
    decls.push({ varName: m[1], perms: [m[2]], line: text.slice(0, m.index).split('\n').length });
  }
  return decls;
}

function pairConditionVariables(text) {
  const decls = gateDeclarations(text);
  const pairs = [];
  for (const { endpoint, kind, line, objText } of classifyEndpoints(text)) {
    if (kind !== 'action' || !objText) continue;
    const condM = /condition\s*:\s*(\([^)]*\)|\w+)\s*=>\s*([^,\n]+)/.exec(objText);
    if (!condM) continue;
    const condBody = condM[2];
    for (const d of decls) {
      if (new RegExp('\\b' + d.varName + '\\b').test(condBody)) {
        pairs.push({ endpoint, line, varName: d.varName, perms: d.perms, declLine: d.line });
      }
    }
  }
  return { decls, pairs };
}

// Pattern 5: cardButtonPermissions = [...] / requiredPermissions={[...]}
function fileLevelGates(text) {
  const sets = [];
  for (const m of text.matchAll(/(cardButtonPermissions\s*=\s*|requiredPermissions\s*=\s*\{)\[([^\]]*)\]/g)) {
    const perms = [...m[2].matchAll(/["'`]([^"'`]+)["'`]/g)].map((x) => x[1]);
    if (perms.length) sets.push({ perms, line: text.slice(0, m.index).split('\n').length, form: m[1].includes('cardButton') ? 'cardButtonPermissions' : 'requiredPermissions' });
  }
  return sets;
}

// ---------- verdict helpers ----------
// Semantics from Test-CIPPAccess.ps1 ($Perm -match $APIRole, case-insensitive) and its
// base-role -like include/exclude. See header comment.
function comparePerm(frontPerm, backendInfo) {
  if (backendInfo.category === 'CIPP' && backendInfo.object === 'Core' && backendInfo.level === 'Read') return 'BASELINE';
  const parts = frontPerm.split('.');
  if (parts.length !== 3) return 'MALFORMED';
  const [cat, obj, lvl] = parts;
  if (backendInfo.category.toLowerCase() !== cat.toLowerCase() || backendInfo.object.toLowerCase() !== obj.toLowerCase()) return 'MISMATCH';
  if (lvl === '*') return 'CONSISTENT';
  if (lvl.toLowerCase() === backendInfo.level.toLowerCase()) return 'CONSISTENT';
  // 'X.Y.ReadWrite' -match 'X.Y.Read' → prefix match → ReadWrite grants Read
  if (lvl.toLowerCase() === 'readwrite' && backendInfo.level.toLowerCase() === 'read') return 'CONSISTENT';
  return 'LEVEL_MISMATCH';
}

function bestVerdict(frontPerms, backendInfo) {
  let best = 'MISMATCH';
  const rank = { BASELINE: 4, CONSISTENT: 3, LEVEL_MISMATCH: 2, MISMATCH: 1, MALFORMED: 0 };
  for (const p of frontPerms) {
    const v = comparePerm(p, backendInfo);
    if (rank[v] > rank[best]) best = v;
  }
  return best;
}

// ---------- main ----------
const { denylist, denylistDetail } = buildDenylist();
const navTree = parseNavTree(fs.readFileSync(CONFIG_JS, 'utf8'));

// collect nav leaves first (two passes: ambiguity vote needs all pages' endpoints)
const leaves = [];
function collectNav(entries, trail) {
  for (const e of entries) {
    if (!e || typeof e !== 'object') continue;
    if (e.path) leaves.push({ entry: e, trail: [...trail] });
    if (Array.isArray(e.items)) collectNav(e.items, [...trail, e.title]);
  }
}
collectNav(navTree, []);

// Pass A: gather per-leaf endpoints (direct, or tab/import fallback) for the ambiguity vote
const leafData = leaves.map(({ entry, trail }) => {
  const perms = Array.isArray(entry.permissions) ? entry.permissions : [];
  const page = resolvePage(entry.path);
  if (!page) return { entry, trail, perms, page: null, eps: [] };
  let eps = classifyEndpoints(readSrc(page)).filter((e) => e.kind !== 'other').map((e) => ({ ...e, via: 'direct' }));
  if (!eps.some((e) => !denylist.has(e.endpoint.toLowerCase()) && endpointToRole[e.endpoint.toLowerCase()])) {
    eps = eps.concat(tabChildEndpoints(page), importedEndpoints(page));
  }
  return { entry, trail, perms, page, eps };
});

// Category.Object of a gate permission, lowercased - or null for malformed strings and
// category-wildcards ("Identity.*"), which are section headers, not object-specific grants.
function gateCO(perm) {
  const [cat, obj] = perm.split('.');
  return cat && obj && obj !== '*' ? `${cat}.${obj}`.toLowerCase() : null;
}

// Pattern 3b: ambiguity vote - endpoint appearing under nav gates naming >= 2 distinct
// Category.Object pairs cannot be evidence for any one page.
const epGateCO = {};
for (const l of leafData) {
  const cos = new Set(l.perms.map(gateCO).filter(Boolean));
  for (const e of l.eps) {
    const k = e.endpoint.toLowerCase();
    epGateCO[k] = epGateCO[k] || new Set();
    for (const c of cos) epGateCO[k].add(c);
  }
}
// Home-check: shared-across-gates only means "borrowed plumbing" when the endpoint's
// backend Category.Object matches one of those gates (it lives on one page, is borrowed by
// others). If it matches NONE of them, it is a mismatch on every page it appears on - a
// real cross-cutting finding, not ambiguity.
const ambiguousShared = new Set(Object.entries(epGateCO)
  .filter(([k, s]) => {
    if (s.size < 2) return false;
    const be = endpointToRole[k];
    if (!be) return false; // unknown backend - handled by not-in-backend-map skip
    return s.has(`${be.category}.${be.object}`.toLowerCase());
  })
  .map(([k]) => k));
const ambiguousDetail = Object.fromEntries([...ambiguousShared].map((k) => [k, [...epGateCO[k]].sort()]));

// Pass B: verdicts
const navResults = [];
for (const { entry, trail, perms, page, eps } of leafData) {
  const base = { navTitle: [...trail, entry.title].join(' > '), configLine: entry.__line, path: entry.path, permissions: perms };
  if (!page) {
    navResults.push({ ...base, status: 'PAGE_NOT_FOUND' });
    continue;
  }
  const pageRel = path.relative(FRONTEND, page).replace(/\\/g, '/');
  if (!perms.length) {
    // Ungated page - nothing to compare (bestVerdict on an empty gate list reads as MISMATCH).
    navResults.push({ ...base, pageFile: pageRel, status: 'NO_GATE_DECLARED' });
    continue;
  }
  const informative = [];
  const skipped = [];
  for (const e of eps) {
    const k = e.endpoint.toLowerCase();
    if (denylist.has(k)) { skipped.push(`${e.endpoint}(plumbing-denylist)`); continue; }
    if (ambiguousShared.has(k)) { skipped.push(`${e.endpoint}(ambiguous-shared)`); continue; }
    const be = endpointToRole[k];
    if (!be) { skipped.push(`${e.endpoint}(not-in-backend-map)`); continue; }
    informative.push({ ...e, backend: be });
  }
  if (!informative.length) {
    navResults.push({ ...base, pageFile: pageRel, status: 'NO_INFORMATIVE_ENDPOINTS', skipped });
    continue;
  }
  const checks = informative.map((e) => ({
    endpoint: e.endpoint, kind: e.kind, via: e.via, pageLine: e.line,
    backendFunction: e.backend.fnName, backendRole: e.backend.role, backendFile: e.backend.file,
    verdict: bestVerdict(perms, e.backend),
  }));
  const worst = checks.some((c) => c.verdict === 'MISMATCH') ? 'MISMATCH'
    : checks.some((c) => c.verdict === 'LEVEL_MISMATCH') ? 'LEVEL_MISMATCH'
    : checks.every((c) => c.verdict === 'BASELINE') ? 'BASELINE_ONLY'
    : 'CONSISTENT';
  navResults.push({ ...base, pageFile: pageRel, status: worst, checks, skipped });
}

// Patterns 4 & 5 scan the same files - one pass, two result sets.
const componentResults = [];
const filePairResults = [];
for (const f of SRC_FILES) {
  const text = readSrc(f);
  const rel = path.relative(FRONTEND, f).replace(/\\/g, '/');

  // Pattern 4: condition-variable pairs
  if (text.includes('checkPermissions(') || text.includes('permissions.includes(')) {
    for (const p of pairConditionVariables(text).pairs) {
      const be = endpointToRole[p.endpoint.toLowerCase()];
      if (!be) {
        componentResults.push({ file: rel, ...p, status: 'ENDPOINT_NOT_IN_BACKEND_MAP' });
        continue;
      }
      componentResults.push({
        file: rel, endpoint: p.endpoint, actionLine: p.line,
        permissionVar: p.varName, permissions: p.perms, permDeclLine: p.declLine,
        backendFunction: be.fnName, backendRole: be.role, backendFile: be.file,
        status: bestVerdict(p.perms, be),
      });
    }
  }

  // Pattern 5: file-level explicit gates paired with the file's action endpoints
  const gates = fileLevelGates(text);
  if (!gates.length) continue;
  const distinct = [...new Set(gates.map((g) => JSON.stringify([...g.perms].sort())))];
  if (distinct.length > 1) {
    filePairResults.push({ file: rel, status: 'ABSTAINED_MULTIPLE_GATE_SETS', gateSets: distinct.map((d) => JSON.parse(d)) });
    continue;
  }
  const perms = gates[0].perms;
  for (const e of classifyEndpoints(text)) {
    if (e.kind !== 'action') continue;
    const k = e.endpoint.toLowerCase();
    if (denylist.has(k) || ambiguousShared.has(k)) continue;
    const be = endpointToRole[k];
    if (!be) continue;
    filePairResults.push({
      file: rel, endpoint: e.endpoint, actionLine: e.line,
      gateForm: gates[0].form, gateLine: gates[0].line, permissions: perms,
      backendFunction: be.fnName, backendRole: be.role, backendFile: be.file,
      status: bestVerdict(perms, be),
    });
  }
}

fs.writeFileSync(path.join(OUT, 'crosscheck.json'), JSON.stringify({
  denylist: denylistDetail,
  ambiguousShared: ambiguousDetail,
  nav: navResults,
  componentPairs: componentResults,
  filePairs: filePairResults,
}, null, 2));

const navSummary = navResults.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
const compSummary = componentResults.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
const fileSummary = filePairResults.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
console.log('Denylisted plumbing endpoints:', Object.keys(denylistDetail).length);
console.log('Ambiguous-shared endpoints:', ambiguousShared.size, [...ambiguousShared].sort().join(', '));
console.log('Nav leaf entries checked:', navResults.length, JSON.stringify(navSummary));
console.log('Component action pairs:', componentResults.length, JSON.stringify(compSummary));
console.log('File-level gate pairs:', filePairResults.length, JSON.stringify(fileSummary));

// ---------- self-test tripwires ----------
// If upstream conventions changed (nav export renamed, routing conventions, gating idioms),
// results degrade silently into plausible-looking garbage. Fail loudly instead.
const failures = [];
if (navResults.length < 100) failures.push(`only ${navResults.length} nav entries parsed (expect 150+)`);
if (navSummary.PAGE_NOT_FOUND > navResults.length * 0.05) failures.push(`${navSummary.PAGE_NOT_FOUND} nav paths unresolved (>5%) - routing conventions changed?`);
const decided = (navSummary.CONSISTENT || 0) + (navSummary.BASELINE_ONLY || 0) + (navSummary.MISMATCH || 0) + (navSummary.LEVEL_MISMATCH || 0);
if (decided > 0 && ((navSummary.CONSISTENT || 0) + (navSummary.BASELINE_ONLY || 0)) / decided < 0.5) failures.push('less than half of decided nav entries consistent - comparator or parser likely broken');
if (componentResults.length + filePairResults.length < 20) failures.push(`only ${componentResults.length + filePairResults.length} gate pairs found - gating idioms changed?`);
if (failures.length) {
  console.error('TRIPWIRE FAILURES - do not trust this output without investigating:');
  for (const f of failures) console.error(' - ' + f);
  process.exit(3);
}
