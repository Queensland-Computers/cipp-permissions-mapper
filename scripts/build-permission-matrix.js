#!/usr/bin/env node
// Step 3: Consolidate nav-permission-map.json + permission-usage-index.json into one
// Category.Object -> {nav sections, action-level usage refs} skeleton table.
// Descriptions are intentionally left blank here - they are maintained separately in
// data/descriptions.json and injected by merge-matrix.js.
//
// Usage: node build-permission-matrix.js <outDir>
//
// Note: category-wildcard nav gates (e.g. "Identity.*") are section headers, not
// object-specific grants, and are deliberately skipped when attributing nav sections.
'use strict';
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(process.argv[2] || 'output');

function load(name) {
  const p = path.join(OUT, name);
  if (!fs.existsSync(p)) {
    console.error(`FATAL: required input ${p} not found - run the earlier extraction steps first`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const navRows = load('nav-permission-map.json');
const usageIndex = load('permission-usage-index.json');

const catObj = {};

function ensure(cat, obj) {
  const key = `${cat}.${obj}`;
  if (!catObj[key]) {
    catObj[key] = {
      category: cat,
      object: obj,
      navSections: new Set(),
      usages: { Read: [], ReadWrite: [], None: [] },
    };
  }
  return catObj[key];
}

// From nav map: permissions field can be "Identity.User.*", "Identity.*" (category-only, skip), etc.
for (const row of navRows) {
  if (!row.permissions) continue;
  const perms = row.permissions.split(';').map((p) => p.trim()).filter(Boolean);
  for (const p of perms) {
    const parts = p.split('.');
    if (parts.length < 2) continue;
    const [cat, obj] = parts; // ignore level for nav-section attribution
    if (obj === '*') continue; // category-level header, not object-specific
    const entry = ensure(cat, obj);
    entry.navSections.add(row.trail);
  }
}

// From usage index: exact Category.Object.Level triples used in button/action gating.
for (const perm of Object.keys(usageIndex)) {
  const parts = perm.split('.');
  if (parts.length !== 3) continue;
  const [cat, obj, level] = parts;
  if (obj === '*') continue;
  const entry = ensure(cat, obj);
  if (entry.usages[level]) {
    entry.usages[level].push(...usageIndex[perm].map((u) => `${u.file}:${u.line}`));
  }
}

const keys = Object.keys(catObj).sort();
const table = keys.map((k) => {
  const e = catObj[k];
  return {
    Category: e.category,
    Object: e.object,
    NavSections: Array.from(e.navSections).join(' | '),
    ReadUsageRefs: e.usages.Read.join('; '),
    ReadWriteUsageRefs: e.usages.ReadWrite.join('; '),
    NoneUsageRefs: e.usages.None.join('; '),
    Description: '', // injected from data/descriptions.json by merge-matrix.js
  };
});

fs.writeFileSync(path.join(OUT, 'permission-matrix-skeleton.json'), JSON.stringify(table, null, 2), 'utf8');

const categories = [...new Set(table.map((r) => r.Category))].sort();
console.log(`Built skeleton with ${table.length} Category.Object rows across ${categories.length} categories:`);
console.log(categories.join(', '));
