#!/usr/bin/env node
// Step 4: Deterministic extraction of Category.Object.Level permission declarations
// from PowerShell comment-based help blocks in the CIPP-API backend.
//
// Usage: node extract-backend-permissions.js <cippApiRepoRoot> <outDir>
//
// Outputs (into <outDir>):
//   backend-permission-map.json           FunctionName -> {Category, Object, Level, Role, Description, File}
//   backend-permission-gaps.json          {noDeclaration, publicRole, malformedRole, nonEntrypoint}
//   backend-category-object-groups.json   Category.Object -> {Read:[fn], ReadWrite:[fn], Other:{lvl:[fn]}}
//   naming-drift-candidates.json          Category.Object keys that collide case-insensitively
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2] || '../CIPP-API');
const OUT = path.resolve(process.argv[3] || 'output');
const ENTRY_ROOT = path.join(ROOT, 'Modules', 'CIPPHTTP', 'Public', 'Entrypoints');

if (!fs.existsSync(ENTRY_ROOT)) {
  console.error(`FATAL: ${ENTRY_ROOT} not found - is <cippApiRepoRoot> the CIPP-API repo?`);
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && /^Invoke-.*\.ps1$/i.test(entry.name)) out.push(full);
  }
  return out;
}

function extractHelpBlock(text) {
  const m = text.match(/<#([\s\S]*?)#>/);
  return m ? m[1] : null;
}

function parseHelpFields(block) {
  const fields = {};
  const tagRe = /^[ \t]*\.(\w+)[ \t]*$/gm;
  const matches = [];
  let m;
  while ((m = tagRe.exec(block)) !== null) {
    matches.push({ tag: m[1].toUpperCase(), start: m.index, contentStart: tagRe.lastIndex });
  }
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];
    const raw = block.slice(cur.contentStart, next ? next.start : block.length);
    fields[cur.tag] = raw.split('\n').map((l) => l.trim()).filter(Boolean).join(' ');
  }
  return fields;
}

function functionNameFromFile(text, fallback) {
  // NOTE: /im - PowerShell 'Function' keyword appears capitalized in some files.
  const m = text.match(/^\s*function\s+([A-Za-z0-9_-]+)/im);
  return m ? m[1] : fallback;
}

const files = walk(ENTRY_ROOT, []);
const backendMap = {};
const noDeclaration = [];
const nonEntrypoint = [];
const publicRole = [];
const malformedRole = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(ROOT, file).replace(/\\/g, '/');
  const fnName = functionNameFromFile(text, path.basename(file, '.ps1'));

  const block = extractHelpBlock(text);
  if (!block) {
    noDeclaration.push({ Function: fnName, File: relPath, Reason: 'No comment-based help block found' });
    continue;
  }
  const fields = parseHelpFields(block);
  const functionality = fields['FUNCTIONALITY'] || '';
  const role = fields['ROLE'] || '';
  const description = fields['DESCRIPTION'] || fields['SYNOPSIS'] || '';

  if (!/Entrypoint/i.test(functionality)) {
    nonEntrypoint.push({ Function: fnName, File: relPath, Functionality: functionality || null });
    continue;
  }
  if (!role) {
    noDeclaration.push({ Function: fnName, File: relPath, Reason: 'Entrypoint with no .ROLE tag' });
    continue;
  }
  if (role === 'Public') {
    publicRole.push({ Function: fnName, File: relPath });
    continue;
  }
  const parts = role.split('.');
  if (parts.length !== 3) {
    malformedRole.push({ Function: fnName, File: relPath, Role: role });
    continue;
  }
  const [Category, Object_, Level] = parts;
  backendMap[fnName] = { Category, Object: Object_, Level, Role: role, Description: description || null, File: relPath, Functionality: functionality };
}

// Category.Object grouping
const groups = {};
for (const [name, info] of Object.entries(backendMap)) {
  const key = `${info.Category}.${info.Object}`;
  groups[key] = groups[key] || { Read: [], ReadWrite: [], Other: {} };
  if (info.Level === 'Read') groups[key].Read.push(name);
  else if (info.Level === 'ReadWrite') groups[key].ReadWrite.push(name);
  else {
    groups[key].Other[info.Level] = groups[key].Other[info.Level] || [];
    groups[key].Other[info.Level].push(name);
  }
}

// Case-insensitive Category.Object collision detection (naming-drift candidates,
// e.g. Exchange.SpamFilter vs Exchange.Spamfilter).
const byLower = {};
for (const key of Object.keys(groups)) {
  const lk = key.toLowerCase();
  byLower[lk] = byLower[lk] || [];
  byLower[lk].push(key);
}
const driftCandidates = Object.values(byLower)
  .filter((v) => v.length > 1)
  .map((variants) => ({
    variants,
    functions: Object.fromEntries(variants.map((v) => [v, [...groups[v].Read, ...groups[v].ReadWrite]])),
  }));

fs.writeFileSync(path.join(OUT, 'backend-permission-map.json'), JSON.stringify({
  generatedFrom: 'Modules/CIPPHTTP/Public/Entrypoints/**/Invoke-*.ps1 comment-based help (.ROLE / .FUNCTIONALITY / .DESCRIPTION)',
  totalFilesScanned: files.length,
  totalWithPermission: Object.keys(backendMap).length,
  functions: backendMap,
}, null, 2));
fs.writeFileSync(path.join(OUT, 'backend-permission-gaps.json'), JSON.stringify({ noDeclaration, publicRole, malformedRole, nonEntrypoint }, null, 2));
fs.writeFileSync(path.join(OUT, 'backend-category-object-groups.json'), JSON.stringify(groups, null, 2));
fs.writeFileSync(path.join(OUT, 'naming-drift-candidates.json'), JSON.stringify(driftCandidates, null, 2));

const accounted = Object.keys(backendMap).length + noDeclaration.length + publicRole.length + malformedRole.length + nonEntrypoint.length;
console.log('Files scanned:', files.length);
console.log('Functions with permission:', Object.keys(backendMap).length);
console.log('No declaration (GAPS - report these):', noDeclaration.length);
console.log('Public role (unauthenticated by design):', publicRole.length);
console.log('Malformed .ROLE (GAPS - report these):', malformedRole.length);
console.log('Non-entrypoint (skipped):', nonEntrypoint.length);
console.log('Distinct Category.Object pairs:', Object.keys(groups).length);
console.log('Case-collision drift candidates:', driftCandidates.length);
if (accounted !== files.length) {
  console.error(`TRIPWIRE: bucket sum ${accounted} != files scanned ${files.length} - investigate before trusting output`);
  process.exit(2);
}
if (Object.keys(backendMap).length < 400) {
  console.error(`TRIPWIRE: only ${Object.keys(backendMap).length} functions extracted (expect 500+) - declaration style changed upstream?`);
  process.exit(2);
}
