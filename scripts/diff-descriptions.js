#!/usr/bin/env node
// Step 7: Deterministic description gap analysis. Compares the freshly merged matrix
// against the maintained descriptions and the previously published matrix, and emits
// the exact work list for the (AI-assisted) description-writing step. The model never
// decides WHAT needs describing - only writes the prose for the entries listed here.
//
// Usage: node diff-descriptions.js <outDir> <dataDir>
//   <outDir>  contains the fresh permission-matrix-merged.json
//   <dataDir> contains descriptions.json and (optionally) the previously published
//             permission-matrix-merged.json used for stale-evidence detection
//
// Output (into <outDir>): descriptions-todo.json
//   {
//     new:     [{key, evidence}]   rows with no description - write one
//     removed: [key]               descriptions whose row disappeared - delete (or check rename)
//     stale:   [{key, changes}]    evidence changed since last publish - re-review the prose
//   }
//
// Exit codes: 0 = nothing to do; 1 = blocking items (new/removed); 4 = stale-only
'use strict';
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(process.argv[2] || 'output');
const DATA = path.resolve(process.argv[3] || 'data');

const merged = JSON.parse(fs.readFileSync(path.join(OUT, 'permission-matrix-merged.json'), 'utf8'));
const descPath = path.join(DATA, 'descriptions.json');
const descriptions = fs.existsSync(descPath) ? JSON.parse(fs.readFileSync(descPath, 'utf8')) : {};
const prevPath = path.join(DATA, 'permission-matrix-merged.json');
const prev = fs.existsSync(prevPath) ? JSON.parse(fs.readFileSync(prevPath, 'utf8')) : null;
const prevByKey = prev ? new Map(prev.map((r) => [`${r.Category}.${r.Object}`, r])) : null;

const rowKeys = new Set(merged.map((r) => `${r.Category}.${r.Object}`));

const evidence = (row) => ({
  NavSections: row.NavSections,
  ReadUsageRefs: row.ReadUsageRefs,
  ReadWriteUsageRefs: row.ReadWriteUsageRefs,
  BackendFunctions: { Read: row.BackendFunctions.Read, ReadWrite: row.BackendFunctions.ReadWrite },
  CrossCheckStatus: row.CrossCheck.Status,
  Mismatches: row.CrossCheck.Mismatches,
});

const fns = (r) => JSON.stringify({ r: r.BackendFunctions?.Read, w: r.BackendFunctions?.ReadWrite });

// Descriptions carry pairing advice derived from mismatches, so cross-check changes are
// stale evidence too. Compare line-number-independently (source lines shift constantly).
const cc = (r) => {
  const c = r.CrossCheck || {};
  const mms = (c.Mismatches || []).map((m) => `${m.Endpoint}->${m.BackendRole}`).sort();
  return JSON.stringify({ status: c.Status, mms: [...new Set(mms)] });
};

const todo = { new: [], removed: [], stale: [] };

for (const row of merged) {
  const key = `${row.Category}.${row.Object}`;
  if (!(descriptions[key] || '').trim()) {
    todo.new.push({ key, evidence: evidence(row) });
    continue;
  }
  if (!prevByKey) continue; // first run - no baseline to detect staleness against
  const p = prevByKey.get(key);
  if (!p) continue; // row is new to the published matrix but already has a description
  const changes = [];
  if (p.NavSections !== row.NavSections) {
    changes.push({ what: 'NavSections', before: p.NavSections, after: row.NavSections });
  }
  if (fns(p) !== fns(row)) {
    changes.push({
      what: 'BackendFunctions',
      before: { Read: p.BackendFunctions?.Read, ReadWrite: p.BackendFunctions?.ReadWrite },
      after: { Read: row.BackendFunctions.Read, ReadWrite: row.BackendFunctions.ReadWrite },
    });
  }
  if (cc(p) !== cc(row)) {
    changes.push({ what: 'CrossCheck', before: JSON.parse(cc(p)), after: JSON.parse(cc(row)) });
  }
  if (changes.length) todo.stale.push({ key, currentDescription: descriptions[key], changes });
}

for (const key of Object.keys(descriptions)) {
  if (!rowKeys.has(key)) todo.removed.push(key);
}

fs.writeFileSync(path.join(OUT, 'descriptions-todo.json'), JSON.stringify(todo, null, 2));

console.log(`Description gap analysis: ${todo.new.length} new, ${todo.removed.length} removed, ${todo.stale.length} stale`);
if (todo.new.length) console.log('  new:', todo.new.map((t) => t.key).join(', '));
if (todo.removed.length) console.log('  removed (delete from descriptions.json, or check for a rename):', todo.removed.join(', '));
if (todo.stale.length) console.log('  stale (re-review prose against changed evidence):', todo.stale.map((t) => t.key).join(', '));

if (todo.new.length || todo.removed.length) process.exit(1);
if (todo.stale.length) process.exit(4);
