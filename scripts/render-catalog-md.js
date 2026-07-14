#!/usr/bin/env node
// Step 8a: Render the merged matrix into the human-readable Markdown catalog and a
// CSV companion for spreadsheet-based role design.
//
// Usage: node render-catalog-md.js <outDir> <dataDir>
//   <outDir>  contains permission-matrix-merged.json, backend-only-permissions.json,
//             and provenance.json
//   <dataDir> where permissions-catalog.md and permissions-catalog.csv are written
'use strict';
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(process.argv[2] || 'output');
const DATA = path.resolve(process.argv[3] || 'data');

const table = JSON.parse(fs.readFileSync(path.join(OUT, 'permission-matrix-merged.json'), 'utf8'));
const backendOnly = JSON.parse(fs.readFileSync(path.join(OUT, 'backend-only-permissions.json'), 'utf8'));
const provPath = path.join(OUT, 'provenance.json');
const prov = fs.existsSync(provPath) ? JSON.parse(fs.readFileSync(provPath, 'utf8')) : null;

fs.mkdirSync(DATA, { recursive: true });

const byCategory = {};
for (const row of table) {
  (byCategory[row.Category] ||= []).push(row);
}

const allMismatches = [];
for (const row of table) {
  for (const mm of row.CrossCheck?.Mismatches || []) {
    allMismatches.push({ perm: `${row.Category}.${row.Object}`, ...mm });
  }
}
allMismatches.sort((a, b) => a.perm.localeCompare(b.perm));

const statusLabel = {
  CONSISTENT: 'Consistent - frontend gating matches backend enforcement',
  MISMATCHES_FOUND: 'MISMATCHES FOUND - see table below',
  BASELINE_OR_UNCHECKED: 'Not cross-checked (baseline permission or no checkable surface)',
  NO_NAV_OR_COMPONENT_GATE_CHECKED: 'Not cross-checked (no nav/component gate to verify)',
};

let md = '# CIPP Permissions Catalog\n\n';
if (prov) {
  md += `> Generated ${prov.generatedAt} from CIPP ${prov.cipp.version || '?'} (\`${prov.cipp.commit}\`) + CIPP-API ${prov.cippApi.version || '?'} (\`${prov.cippApi.commit}\`).\n\n`;
}
md += 'Each entry is a `Category.Object` permission pair, assignable as `.Read` (view) or `.ReadWrite` (view + act) when building custom roles. ';
md += 'Backend function lists come from the CIPP-API repo\'s per-function permission declarations; the cross-check compares frontend UI gating against actual backend enforcement.\n\n';
md += '**Enforcement semantics** (from `Test-CIPPAccess.ps1`): matching is case-insensitive and `ReadWrite` implies `Read`. ';
md += 'Nav permissions describe **visibility, not capability** - a role needs the union of the backend roles its pages\' endpoints declare.\n\n';

// Summary
const counts = {};
for (const row of table) {
  const s = row.CrossCheck?.Status || 'UNKNOWN';
  counts[s] = (counts[s] || 0) + 1;
}
md += '## Summary\n\n';
md += `- ${table.length} permission pairs across ${Object.keys(byCategory).length} categories\n`;
for (const [s, n] of Object.entries(counts)) md += `- ${n} × ${statusLabel[s] || s}\n`;
md += `- ${allMismatches.length} total frontend/backend mismatches (aggregated table at the bottom)\n`;
md += `- ${backendOnly.length} backend-only permissions with no frontend UI surface (listed at the bottom)\n\n`;

for (const cat of Object.keys(byCategory).sort()) {
  md += `## ${cat}\n\n`;
  for (const row of byCategory[cat]) {
    const bf = row.BackendFunctions || {};
    const status = row.CrossCheck?.Status;
    md += `### ${row.Category}.${row.Object}\n\n`;
    md += `${row.Description}\n\n`;
    md += `- **Nav sections:** ${row.NavSections || '_none - no frontend UI surface_'}\n`;
    md += `- **Cross-check:** ${statusLabel[status] || status || 'n/a'}\n`;
    if (bf.Read?.length) md += `- **Backend functions unlocked at Read:** ${bf.Read.join(', ')}\n`;
    if (bf.ReadWrite?.length) md += `- **Backend functions unlocked at ReadWrite:** ${bf.ReadWrite.join(', ')}\n`;
    if (!bf.Read?.length && !bf.ReadWrite?.length) md += `- **Backend functions:** _none mapped_\n`;

    const mms = row.CrossCheck?.Mismatches || [];
    if (mms.length) {
      md += `\n**Mismatches (${mms.length}):** UI element gated by \`${row.Category}.${row.Object}.*\` but backend requires a different permission:\n\n`;
      md += '| Page | Endpoint | Kind | Backend requires |\n|---|---|---|---|\n';
      for (const mm of mms) {
        md += `| ${mm.Page} (\`${mm.PageFile}\`) | ${mm.Endpoint} | ${mm.Kind} | \`${mm.BackendRole}\` |\n`;
      }
    }
    md += '\n';
  }
}

// Aggregated mismatch table - the role-design action list
md += '## All Mismatches (role-design checklist)\n\n';
md += 'Each row is a place where granting the frontend permission shows a UI element whose action needs a DIFFERENT backend permission. ';
md += 'For tiered roles: either grant both permissions, or expect the element to fail/403 for that tier.\n\n';
md += '| Frontend permission | Page | Source | Endpoint | Backend requires |\n|---|---|---|---|---|\n';
for (const mm of allMismatches) {
  md += `| \`${mm.NavPermission || mm.perm}\` | ${mm.Page} | \`${mm.PageFile}\` | ${mm.Endpoint} | \`${mm.BackendRole}\` |\n`;
}
md += '\n';

// Backend-only permissions
md += '## Backend-only permissions\n\n';
md += 'These `Category.Object` pairs are declared by CIPP-API functions but have no frontend UI surface - ';
md += 'relevant for API-client roles, or as pairing requirements when a UI feature calls one of these functions.\n\n';
for (const b of backendOnly) {
  md += `### ${b.CategoryObject}\n\n`;
  if (b.Read?.length) md += `- **Read:** ${b.Read.map((f) => f.replace(/^Invoke-/, '')).join(', ')}\n`;
  if (b.ReadWrite?.length) md += `- **ReadWrite:** ${b.ReadWrite.map((f) => f.replace(/^Invoke-/, '')).join(', ')}\n`;
  for (const [lvl, fns] of Object.entries(b.Other || {})) {
    md += `- **${lvl}:** ${fns.map((f) => f.replace(/^Invoke-/, '')).join(', ')}\n`;
  }
  md += '\n';
}

fs.writeFileSync(path.join(DATA, 'permissions-catalog.md'), md, 'utf8');

// CSV companion
const header = 'Category,Object,Description,NavSections,BackendReadFunctions,BackendReadWriteFunctions,CrossCheckStatus,MismatchCount\n';
const rows = table
  .map((r) =>
    [
      r.Category,
      r.Object,
      r.Description,
      r.NavSections,
      (r.BackendFunctions?.Read || []).join('; '),
      (r.BackendFunctions?.ReadWrite || []).join('; '),
      r.CrossCheck?.Status || '',
      (r.CrossCheck?.Mismatches || []).length,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  )
  .join('\n');
fs.writeFileSync(path.join(DATA, 'permissions-catalog.csv'), header + rows, 'utf8');

console.log(`Rendered ${table.length} rows, ${allMismatches.length} mismatches, ${backendOnly.length} backend-only pairs -> permissions-catalog.md + permissions-catalog.csv`);
