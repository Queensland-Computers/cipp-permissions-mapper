#!/usr/bin/env node
// Step 9: Verify the published outputs are complete and internally consistent.
// Run automatically as the last pipeline step; safe to run standalone.
//
// Usage: node verify-output.js <repoRoot>
//
// Checks:
//   - data/permission-matrix-merged.json: parses, every row has a non-empty Description,
//     no correction-prefix artefacts, expected fields present
//   - data/descriptions.json keys exactly match matrix rows (no orphans, no gaps)
//   - data/provenance.json present with both repos' commit info
//   - cipp-permissions-catalog.html: standalone document (doctype/charset/viewport),
//     stat counts match numbers recomputed from the matrix, provenance footer and
//     attribution line embedded
//   - data/permissions-catalog.csv row count matches the matrix
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2] || '.');
const failures = [];
const infos = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

function loadJson(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { failures.push(`${rel} missing`); return null; }
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { failures.push(`${rel} does not parse: ${e.message}`); return null; }
}

const matrix = loadJson('data/permission-matrix-merged.json');
const descriptions = loadJson('data/descriptions.json');
const prov = loadJson('data/provenance.json');

if (matrix) {
  const noDesc = matrix.filter((r) => !r.Description || !r.Description.trim());
  check(noDesc.length === 0, `rows missing descriptions: ${noDesc.map((r) => `${r.Category}.${r.Object}`).join(', ')}`);

  const prefixed = matrix.filter((r) => /^(CORRECTED|NOTE from)/i.test(r.Description || '') || /CORRECTED by/i.test(r.Description || ''));
  check(prefixed.length === 0, `rows with correction-prefix artefacts in descriptions: ${prefixed.map((r) => `${r.Category}.${r.Object}`).join(', ')}`);

  for (const f of ['Category', 'Object', 'NavSections', 'Description', 'BackendFunctions', 'CrossCheck']) {
    check(matrix.every((r) => f in r), `matrix rows missing field ${f}`);
  }

  const anomalies = matrix.filter((r) => /ANOMALY/.test(r.Description || ''));
  if (anomalies.length) infos.push(`ANOMALY-flagged rows (expected, verify still intentional): ${anomalies.map((r) => `${r.Category}.${r.Object}`).join(', ')}`);

  if (descriptions) {
    const rowKeys = new Set(matrix.map((r) => `${r.Category}.${r.Object}`));
    const descKeys = new Set(Object.keys(descriptions));
    const orphans = [...descKeys].filter((k) => !rowKeys.has(k));
    const gaps = [...rowKeys].filter((k) => !descKeys.has(k));
    check(orphans.length === 0, `descriptions.json entries with no matrix row: ${orphans.join(', ')}`);
    check(gaps.length === 0, `matrix rows with no descriptions.json entry: ${gaps.join(', ')}`);
  }
}

if (prov) {
  check(prov.generatedAt, 'provenance.json missing generatedAt');
  check(prov.cipp?.commit, 'provenance.json missing cipp.commit');
  check(prov.cippApi?.commit, 'provenance.json missing cippApi.commit');
}

const htmlPath = path.join(ROOT, 'cipp-permissions-catalog.html');
if (!fs.existsSync(htmlPath)) {
  failures.push('cipp-permissions-catalog.html missing');
} else {
  const html = fs.readFileSync(htmlPath, 'utf8');
  check(/^<!doctype html>/i.test(html), 'HTML missing <!doctype html>');
  check(html.includes('<meta charset="utf-8">'), 'HTML missing charset meta');
  check(html.includes('name="viewport"'), 'HTML missing viewport meta');
  check(html.includes('<html lang='), 'HTML missing <html lang>');
  if (matrix) {
    const mmTotal = matrix.reduce((n, r) => n + (r.CrossCheck?.Mismatches?.length || 0), 0);
    check(html.includes(`<b>${matrix.length}</b><span>Permissions</span>`), `HTML permission count stat != ${matrix.length}`);
    check(html.includes(`<b>${mmTotal}</b><span>Total mismatches</span>`), `HTML mismatch count stat != ${mmTotal}`);
    for (const r of matrix) {
      check(html.includes(`id="perm-${r.Category}-${r.Object}"`), `HTML missing entry for ${r.Category}.${r.Object}`);
    }
  }
  if (prov) check(html.includes(prov.cipp.commit) && html.includes(prov.cippApi.commit), 'HTML provenance footer missing commit SHAs');
  check(html.includes('class="attribution"'), 'HTML missing attribution footer');
  check(!/CORRECTED by/i.test(html), 'HTML contains correction-prefix artefacts');
}

const csvPath = path.join(ROOT, 'data', 'permissions-catalog.csv');
if (!fs.existsSync(csvPath)) {
  failures.push('data/permissions-catalog.csv missing');
} else if (matrix) {
  // Count physical CSV records: quoted fields may contain newlines, so count rows by
  // parsing quote state rather than splitting on \n.
  const csv = fs.readFileSync(csvPath, 'utf8');
  let inQ = false, records = 0;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') inQ = !inQ;
    else if (c === '\n' && !inQ) records++;
  }
  if (!csv.endsWith('\n')) records++;
  check(records === matrix.length + 1, `CSV has ${records} records, expected ${matrix.length + 1} (header + rows)`);
}

check(fs.existsSync(path.join(ROOT, 'data', 'permissions-catalog.md')), 'data/permissions-catalog.md missing');

for (const i of infos) console.log('INFO:', i);
if (failures.length) {
  console.error('VERIFY FAILED:');
  for (const f of failures) console.error(' - ' + f);
  process.exit(1);
}
console.log('Verify OK: outputs complete and internally consistent.');
