#!/usr/bin/env node
// Step 1: Parse the CIPP frontend's nav config into a flattened permission-to-nav map.
//
// Usage: node extract-nav-permissions.js <cippRepoRoot> <outDir>
//
// Output (into <outDir>):
//   nav-permission-map.json   [{trail, title, path, type, scope, permissions}]
//
// Uses the shared structural parser (lib/parse-nav.js) - no code from the scanned
// repo is executed.
'use strict';
const fs = require('fs');
const path = require('path');
const { parseNavTree } = require('./lib/parse-nav');

const CIPP = path.resolve(process.argv[2] || '../CIPP');
const OUT = path.resolve(process.argv[3] || 'output');
const CONFIG_JS = path.join(CIPP, 'src', 'layouts', 'config.js');

if (!fs.existsSync(CONFIG_JS)) {
  console.error(`FATAL: ${CONFIG_JS} not found - is <cippRepoRoot> the CIPP frontend repo?`);
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

let items;
try {
  items = parseNavTree(fs.readFileSync(CONFIG_JS, 'utf8'));
} catch (e) {
  console.error('Failed to parse nav config:', e.message);
  process.exit(1);
}

const str = (v) => (typeof v === 'string' ? v : '');
const rows = [];

function walk(entries, trail) {
  for (const item of entries) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const newTrail = [...trail, str(item.title)].filter(Boolean);
    if (item.path || item.permissions) {
      rows.push({
        trail: newTrail.join(' > '),
        title: str(item.title),
        path: str(item.path),
        type: str(item.type),
        scope: str(item.scope),
        permissions: (Array.isArray(item.permissions) ? item.permissions : []).join('; '),
      });
    }
    if (Array.isArray(item.items)) walk(item.items, newTrail);
  }
}
walk(items, []);

fs.writeFileSync(path.join(OUT, 'nav-permission-map.json'), JSON.stringify(rows, null, 2), 'utf8');

console.log(`Extracted ${rows.length} nav rows.`);
// TRIPWIRE: a dramatic drop means the parser broke (nav export renamed, config moved).
if (rows.length < 100) {
  console.error(`TRIPWIRE: only ${rows.length} nav rows extracted (expect 150+) - nav config shape changed upstream?`);
  process.exit(2);
}
