#!/usr/bin/env node
// Step 6: Merge the frontend skeleton + backend map + cross-check into the
// full permission matrix, inject descriptions, and compute backend-only permissions.
//
// Usage: node merge-matrix.js <outDir> <descriptionsJson>
//   <outDir> must already contain:
//     permission-matrix-skeleton.json     (from build-permission-matrix.js)
//     backend-category-object-groups.json (from extract-backend-permissions.js)
//     crosscheck.json                     (from crosscheck.js)
//   <descriptionsJson> = path to the maintained Category.Object -> prose map
//     (data/descriptions.json). Rows without an entry get an empty Description;
//     completeness is enforced downstream by diff-descriptions.js / verify-output.js.
//
// Outputs (into <outDir>):
//   permission-matrix-merged.json   skeleton rows + Description + BackendFunctions + CrossCheck
//   backend-only-permissions.json   Category.Object pairs with no frontend matrix row
'use strict';
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(process.argv[2] || 'output');
const DESC_PATH = path.resolve(process.argv[3] || 'data/descriptions.json');

function load(p) {
  if (!fs.existsSync(p)) {
    console.error(`FATAL: required input ${p} not found`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const skeleton = load(path.join(OUT, 'permission-matrix-skeleton.json'));
const groups = load(path.join(OUT, 'backend-category-object-groups.json'));
const crosscheck = load(path.join(OUT, 'crosscheck.json'));
const descriptions = fs.existsSync(DESC_PATH) ? JSON.parse(fs.readFileSync(DESC_PATH, 'utf8')) : {};

// ---- per-Category.Object cross-check view (mismatches keyed by the FRONTEND permission that gates the UI) ----
const byCO = {};
const co = (perm) => {
  const p = perm.split('.');
  return p.length === 3 ? `${p[0]}.${p[1]}` : null;
};
const ensure = (k) => (byCO[k] = byCO[k] || { ConsistentPages: [], BaselineOnlyPages: [], Mismatches: [] });

for (const r of crosscheck.nav) {
  const keys = [...new Set((r.permissions || []).map(co).filter(Boolean))];
  for (const k of keys) {
    const e = ensure(k);
    if (r.status === 'CONSISTENT') e.ConsistentPages.push(r.path);
    else if (r.status === 'BASELINE_ONLY') e.BaselineOnlyPages.push(r.path);
    else if (r.status === 'MISMATCH' || r.status === 'LEVEL_MISMATCH') {
      for (const c of (r.checks || []).filter((c) => c.verdict === 'MISMATCH' || c.verdict === 'LEVEL_MISMATCH')) {
        e.Mismatches.push({
          Page: r.path,
          PageFile: `${r.pageFile}:${c.pageLine}`,
          NavPermission: (r.permissions || []).join('|'),
          Endpoint: c.endpoint,
          Kind: c.kind,
          BackendFunction: c.backendFunction.replace(/^Invoke-/, ''),
          BackendRole: c.backendRole,
          BackendFile: c.backendFile,
        });
      }
    }
  }
}
const gatePairs = [
  ...crosscheck.componentPairs.map((p) => ({ ...p, source: '(shared component)' })),
  ...(crosscheck.filePairs || []).filter((p) => p.endpoint).map((p) => ({ ...p, source: '(file-level gate)' })),
];
for (const p of gatePairs) {
  if (p.status !== 'MISMATCH' && p.status !== 'LEVEL_MISMATCH') continue;
  for (const k of [...new Set((p.permissions || []).map(co).filter(Boolean))]) {
    ensure(k).Mismatches.push({
      Page: p.source,
      PageFile: `${p.file}:${p.actionLine}`,
      NavPermission: (p.permissions || []).join('|'),
      Endpoint: p.endpoint,
      Kind: 'action',
      BackendFunction: p.backendFunction.replace(/^Invoke-/, ''),
      BackendRole: p.backendRole,
      BackendFile: p.backendFile,
    });
  }
}
// Dedupe to one finding per (frontend file, endpoint, required role): the nav check and
// a file-level gate can both surface the same finding, and one page can define several
// buttons calling the same endpoint. Nav entries are pushed first, so first-wins keeps
// the row with the real page path over '(file-level gate)'; the surviving PageFile's
// line is the evidence entry point.
for (const k of Object.keys(byCO)) {
  const seen = new Set();
  byCO[k].Mismatches = byCO[k].Mismatches.filter((m) => {
    const id = `${m.PageFile.replace(/:\d+$/, '')}|${m.Endpoint}|${m.BackendRole}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

// ---- merge into matrix ----
const merged = skeleton.map((row) => {
  const key = `${row.Category}.${row.Object}`;
  const g = groups[key];
  const BackendFunctions = g
    ? {
        Read: (g.Read || []).map((f) => f.replace(/^Invoke-/, '')).sort(),
        ReadWrite: (g.ReadWrite || []).map((f) => f.replace(/^Invoke-/, '')).sort(),
        Other: g.Other || {},
      }
    : { Read: [], ReadWrite: [], Other: {}, _note: 'NOT FOUND IN BACKEND MAP - verify Category.Object naming' };
  const e = byCO[key];
  const CrossCheck = e
    ? {
        Status: e.Mismatches.length ? 'MISMATCHES_FOUND' : e.ConsistentPages.length ? 'CONSISTENT' : 'BASELINE_OR_UNCHECKED',
        ConsistentPages: [...e.ConsistentPages].sort(),
        BaselineOnlyPages: [...e.BaselineOnlyPages].sort(),
        Mismatches: e.Mismatches,
      }
    : { Status: 'NO_NAV_OR_COMPONENT_GATE_CHECKED', ConsistentPages: [], BaselineOnlyPages: [], Mismatches: [] };
  return { ...row, Description: descriptions[key] || '', BackendFunctions, CrossCheck };
});

fs.writeFileSync(path.join(OUT, 'permission-matrix-merged.json'), JSON.stringify(merged, null, 2));

// ---- backend-only permissions ----
const skeletonSet = new Set(skeleton.map((p) => `${p.Category}.${p.Object}`));
const backendOnly = Object.keys(groups)
  .filter((k) => !skeletonSet.has(k))
  .sort()
  .map((k) => ({ CategoryObject: k, ...groups[k] }));
fs.writeFileSync(path.join(OUT, 'backend-only-permissions.json'), JSON.stringify(backendOnly, null, 2));

console.log('Matrix rows:', merged.length);
console.log('Rows with mismatches:', merged.filter((r) => r.CrossCheck.Status === 'MISMATCHES_FOUND').length);
console.log('Rows missing a description:', merged.filter((r) => !r.Description).length);
console.log('Rows with no backend function match:', merged.filter((r) => r.BackendFunctions._note).map((r) => `${r.Category}.${r.Object}`));
console.log('Rows the cross-check could not check:', merged.filter((r) => r.CrossCheck.Status === 'NO_NAV_OR_COMPONENT_GATE_CHECKED').map((r) => `${r.Category}.${r.Object}`));
console.log('Backend-only Category.Object pairs:', backendOnly.length, backendOnly.map((b) => b.CategoryObject).join(', '));
