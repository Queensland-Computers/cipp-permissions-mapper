#!/usr/bin/env node
// Orchestrator: runs the full deterministic pipeline end-to-end.
//
// Usage: node scripts/run-pipeline.js [--cipp <path>] [--cipp-api <path>] [--accept-stale]
//   --cipp         path to the CIPP frontend repo      (default: ../CIPP)
//   --cipp-api     path to the CIPP-API backend repo   (default: ../CIPP-API)
//   --accept-stale proceed when the only description work is stale-evidence review
//                  (use after reviewing output/descriptions-todo.json stale entries)
//
// Flow:
//   1. sanity-check both repo paths, capture provenance (commits, versions, dirty flags)
//   2. run extraction + cross-check + merge (steps 1-6, all deterministic)
//   3. description gap analysis (step 7) - STOPS here if data/descriptions.json needs
//      work; see output/descriptions-todo.json for the exact work list
//   4. publish: copy merged matrix + provenance into data/, render MD/CSV/HTML
//   5. verify the published outputs
//
// Exit codes: 0 success; 1 descriptions need writing/deleting; 4 stale descriptions
// need review; anything else = a step failed (tripwires print their own diagnosis).
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const SCRIPTS = __dirname;
const OUT = path.join(REPO, 'output');
const DATA = path.join(REPO, 'data');

// ---- args ----
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  const value = argv[i + 1];
  if (!value || value.startsWith('--')) {
    console.error(`FATAL: ${name} requires a path argument.`);
    process.exit(1);
  }
  return value;
};
// Explicit paths resolve against the caller's cwd; defaults are siblings of this repo.
const cippArg = flag('--cipp');
const cippApiArg = flag('--cipp-api');
const CIPP = cippArg ? path.resolve(cippArg) : path.join(REPO, '..', 'CIPP');
const CIPP_API = cippApiArg ? path.resolve(cippApiArg) : path.join(REPO, '..', 'CIPP-API');
const ACCEPT_STALE = argv.includes('--accept-stale');

// ---- sanity checks ----
if (!fs.existsSync(path.join(CIPP, 'src', 'layouts', 'config.js'))) {
  console.error(`FATAL: ${CIPP} does not look like the CIPP frontend repo (src/layouts/config.js not found).`);
  console.error('Clone https://github.com/KelvinTegelaar/CIPP and pass its path via --cipp.');
  process.exit(1);
}
if (!fs.existsSync(path.join(CIPP_API, 'Modules', 'CIPPHTTP', 'Public', 'Entrypoints'))) {
  console.error(`FATAL: ${CIPP_API} does not look like the CIPP-API repo (Modules/CIPPHTTP/Public/Entrypoints not found).`);
  console.error('Clone https://github.com/KelvinTegelaar/CIPP-API and pass its path via --cipp-api.');
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(DATA, { recursive: true });

// ---- provenance ----
function git(repo, args) {
  try { return execSync(`git ${args}`, { cwd: repo, encoding: 'utf8' }).trim(); }
  catch { return null; }
}
function readVersion(repo) {
  for (const [file, pick] of [
    ['public/version.json', (t) => JSON.parse(t).version],
    ['version_latest.txt', (t) => t.trim()],
    ['package.json', (t) => JSON.parse(t).version],
  ]) {
    const p = path.join(repo, file);
    if (fs.existsSync(p)) {
      try { return pick(fs.readFileSync(p, 'utf8')); } catch { /* try next */ }
    }
  }
  return null;
}
function repoProvenance(repo) {
  return {
    path: repo,
    commit: git(repo, 'rev-parse --short HEAD') || 'unknown',
    commitDate: git(repo, 'log -1 --format=%cI') || null,
    version: readVersion(repo),
    dirty: (git(repo, 'status --porcelain') || '') !== '',
  };
}
const provenance = {
  generatedAt: new Date().toISOString(),
  cipp: repoProvenance(CIPP),
  cippApi: repoProvenance(CIPP_API),
};
fs.writeFileSync(path.join(OUT, 'provenance.json'), JSON.stringify(provenance, null, 2));
console.log(`Provenance: CIPP ${provenance.cipp.version || '?'} (${provenance.cipp.commit}${provenance.cipp.dirty ? ', dirty' : ''}) + CIPP-API ${provenance.cippApi.version || '?'} (${provenance.cippApi.commit}${provenance.cippApi.dirty ? ', dirty' : ''})`);

// ---- pipeline steps ----
function run(script, args, allowCodes = []) {
  console.log(`\n=== ${script} ${args.join(' ')}`);
  const r = spawnSync(process.execPath, [path.join(SCRIPTS, script), ...args], { stdio: 'inherit' });
  if (r.status !== 0 && !allowCodes.includes(r.status)) {
    console.error(`\nPIPELINE ABORTED: ${script} exited with code ${r.status}.`);
    console.error('If the output mentions a TRIPWIRE, an upstream convention changed - fix the script, do not hand-interpret partial output.');
    process.exit(r.status || 1);
  }
  return r.status;
}

run('extract-nav-permissions.js', [CIPP, OUT]);
run('extract-permission-usages.js', [CIPP, OUT]);
run('build-permission-matrix.js', [OUT]);
run('extract-backend-permissions.js', [CIPP_API, OUT]);
run('crosscheck.js', [CIPP, OUT]);
run('merge-matrix.js', [OUT, path.join(DATA, 'descriptions.json')]);

const diffStatus = run('diff-descriptions.js', [OUT, DATA], [1, 4]);
if (diffStatus === 1) {
  console.error('\nPIPELINE PAUSED: descriptions need work before the catalog can be published.');
  console.error(`Work list: ${path.join(OUT, 'descriptions-todo.json')}`);
  console.error('Write/delete the listed entries in data/descriptions.json, then re-run this pipeline.');
  process.exit(1);
}
if (diffStatus === 4 && !ACCEPT_STALE) {
  console.error('\nPIPELINE PAUSED: some descriptions have stale evidence (see output/descriptions-todo.json).');
  console.error('Review each stale entry: update data/descriptions.json if the prose is now wrong,');
  console.error('then re-run. If all stale entries were reviewed and the prose is still accurate,');
  console.error('re-run with --accept-stale.');
  process.exit(4);
}

// ---- publish ----
fs.copyFileSync(path.join(OUT, 'permission-matrix-merged.json'), path.join(DATA, 'permission-matrix-merged.json'));
fs.copyFileSync(path.join(OUT, 'backend-only-permissions.json'), path.join(DATA, 'backend-only-permissions.json'));
fs.copyFileSync(path.join(OUT, 'provenance.json'), path.join(DATA, 'provenance.json'));
run('render-catalog-md.js', [OUT, DATA]);
run('render-catalog-html.js', [OUT, path.join(REPO, 'cipp-permissions-catalog.html')]);
run('verify-output.js', [REPO]);

console.log('\nPipeline complete. Deliverables:');
console.log('  cipp-permissions-catalog.html   (primary reference)');
console.log('  data/permissions-catalog.md     (markdown view)');
console.log('  data/permissions-catalog.csv    (spreadsheet view)');
console.log('  data/permission-matrix-merged.json + data/backend-only-permissions.json (machine-readable)');
