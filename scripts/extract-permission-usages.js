#!/usr/bin/env node
// Step 2: Scan the CIPP frontend for every literal permission-string occurrence
// (Category.Object.Level or wildcard) with file + line + context, capturing
// finer-grained (button/action level) gating beyond what the nav map shows.
//
// Usage: node extract-permission-usages.js <cippRepoRoot> <outDir>
//
// Output (into <outDir>):
//   permission-usage-index.json   permission -> [{file, line, context}]
'use strict';
const fs = require('fs');
const path = require('path');

const CIPP = path.resolve(process.argv[2] || '../CIPP');
const OUT = path.resolve(process.argv[3] || 'output');
const SRC_DIR = path.join(CIPP, 'src');

if (!fs.existsSync(SRC_DIR)) {
  console.error(`FATAL: ${SRC_DIR} not found - is <cippRepoRoot> the CIPP frontend repo?`);
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

const PERM_RE = /\b([A-Z][A-Za-z0-9]*)\.(\*|[A-Z][A-Za-z0-9]*)\.(Read|ReadWrite|None|\*)(?![A-Za-z0-9])/g;

const fileList = [];
function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walkDir(full);
    } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
      fileList.push(full);
    }
  }
}
walkDir(SRC_DIR);

const byPermission = {}; // permission -> [{file, line, context}]
let occurrences = 0;

for (const file of fileList) {
  const rel = path.relative(CIPP, file).replace(/\\/g, '/');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((lineText, idx) => {
    let m;
    PERM_RE.lastIndex = 0;
    while ((m = PERM_RE.exec(lineText)) !== null) {
      occurrences++;
      (byPermission[m[0]] ??= []).push({ file: rel, line: idx + 1, context: lineText.trim().slice(0, 200) });
    }
  });
}

fs.writeFileSync(path.join(OUT, 'permission-usage-index.json'), JSON.stringify(byPermission, null, 2), 'utf8');

console.log(`Scanned ${fileList.length} files. Found ${occurrences} permission-string occurrences across ${Object.keys(byPermission).length} distinct permission strings.`);
