---
name: cipp-permissions-mapper
description: Regenerate the CIPP Permissions Catalog (cipp-permissions-catalog.html + data/) from locally cloned CIPP and CIPP-API repos. Runs the deterministic extraction/cross-check pipeline, then writes descriptions only for permissions the gap analysis says are new, removed, or have changed evidence. Use after upstream CIPP/CIPP-API updates, or when validating tiered custom role designs.
---

# CIPP Permissions Catalog Regeneration

Regenerates the catalog that maps every CIPP `Category.Object` permission pair to the nav
sections and actions it unlocks, the CIPP-API backend functions it governs, and every place
where frontend visibility disagrees with backend enforcement.

**Everything is deterministic except description prose.** Extraction, cross-checking, merging,
gap analysis, rendering, and verification are all done by the scripts in `scripts/`. The ONLY
AI-authored content is the per-permission descriptions in `data/descriptions.json` - and even
there, the pipeline decides *which* entries need work; you only write the prose. Never extract,
count, or classify by reading repo files and summarizing from memory - if a script's output
looks wrong, fix the script and re-run it.

## Prerequisites

- Node.js 18+ on PATH.
- The CIPP frontend and CIPP-API backend repos cloned locally. Defaults are sibling
  directories (`../CIPP`, `../CIPP-API`); pass `--cipp <path>` / `--cipp-api <path>` otherwise.
  Both are read-only throughout.
- The scripts live in `scripts/`. If any are missing, stop and tell the user - do not rewrite
  them from scratch without asking.

## Procedure

### 1. Run the pipeline

```
node scripts/run-pipeline.js [--cipp <path>] [--cipp-api <path>]
```

It sanity-checks both repos, records provenance (commit SHAs, versions, dirty flags), runs all
deterministic steps, and then either completes (rendering + verifying every deliverable) or
pauses at the description gap analysis.

**If any step aborts with a TRIPWIRE message**, an upstream convention changed (nav export
renamed, routing conventions, comment-based-help declaration style, gating idioms). Fix the
script so the invariant passes honestly, then re-run. Never proceed with, or hand-interpret,
tripwired output.

### 2. If the pipeline pauses: work the description todo list

`output/descriptions-todo.json` lists exactly what needs attention in `data/descriptions.json`:

- **`new`** - permissions with no description. Each entry carries its evidence bundle
  (nav sections, usage refs, backend function lists, cross-check status and mismatches).
  If the evidence is unclear, read the referenced `file:line` sources in the two repos.
  Write a description (style below) and add it to `data/descriptions.json`.
- **`removed`** - descriptions whose permission no longer exists. Check whether a similar
  `new` key appeared (rename - port and adapt the old prose), otherwise delete the entry and
  note the removal in your report.
- **`stale`** - the row's nav surface or backend function set changed since the catalog was
  last published; the diff of what changed is included. Re-read the description against the new
  evidence. Update it if wrong; if it is still accurate, leave it unchanged.

Work one category at a time - never reason about all categories in one pass. Then re-run the
pipeline; add `--accept-stale` only when every remaining stale entry has been reviewed and its
prose confirmed still accurate.

### 3. Description style

Descriptions explain what the permission is *for* - a clear, useful account of its purpose
based on both frontend and backend evidence. One to four sentences, plain English,
feature-level not function-level:

- Lead with what the permission unlocks or governs: name the nav sections, pages, and feature
  areas. Note what `Read` vs `ReadWrite` means for it when that isn't obvious (e.g. write-only
  or visibility-only permissions).
- State backend reality as plain fact, citing backend function names when they carry the
  point. Never write correction prefixes ("CORRECTED...", "NOTE from cross-check...") or any
  other provenance markers in the prose - revision history lives in git, not in the catalog.
- When the cross-check shows the UI needs a *different* permission for its actions to work,
  say so and name the pairing (e.g. "grant X.Y at the matching level alongside it, or the
  pages render but nothing works").
- Call out cross-category gotchas (a permission gating pages that live under a different nav
  section than its category suggests).
- Never guess. If the evidence is too thin to describe confidently, prefix the entry with
  `ANOMALY - flagged` and say what needs manual verification.

Good existing models to match: `Security.SafeLinksPolicy`, `Tenant.Directory`, `Exchange.SpamFilter`.

### 4. Spot-verify before delivering

Pick at least 3 mismatches from the final matrix (at least 1 you have not seen in a previous
run) and verify each by reading the actual frontend page file and backend `.ps1` - the
structural heuristics are validated but not infallible. If a spot-check fails, treat it as a
script bug: fix the script, re-run the pipeline, re-verify.

### 5. Report to the user

Summarize: row/category/mismatch counts, provenance (both repos' versions and commits, and
whether either was dirty), which permissions were added/removed/changed and how their
descriptions were handled, any `ANOMALY` entries (new or still outstanding), backend
enforcement gaps (`output/backend-permission-gaps.json`) and naming-drift candidates
(`output/naming-drift-candidates.json`) worth reporting upstream, and the spot-check results.

## Known limitations (check these when results look off)

- **Wildcard nav gates (`X.Y.*`) are checked at Category.Object level only** - inherent: the
  nav layer carries no level information. Level checking happens where levels are declared
  (component/file pairs), which is the correct layer.
- **JSX conditional-render gates (`{canX && (...)}`) are not paired** - associating a gate
  variable with API calls inside rendered JSX needs real AST scoping. These fall back to
  nav-level checking or abstention; the spot-verify step is the safety net.
- **Import following is one hop and skips self-gated files** - deliberate: deeper transitive
  attribution compounds over-attribution risk. Pages still landing in
  `NO_INFORMATIVE_ENDPOINTS` after fallbacks genuinely delegate everything to self-gated
  shared components.
- **Files with multiple distinct gate sets abstain** (`ABSTAINED_MULTIPLE_GATE_SETS`) rather
  than guess which set gates which action.
- **Category-wildcard nav gates (`Identity.*`) are skipped** when attributing nav sections -
  they are section headers, not object-specific grants.
- **Enforcement semantics are read from code, not tested live** - cited from
  `Test-CIPPAccess.ps1` (case-insensitive `-match`, ReadWrite ⊃ Read). If that file changes
  upstream, re-verify and update `scripts/crosscheck.js`.
- **Hardcoded conventions**: `nativeMenuItems` export name, `src/layouts/config.js` location,
  `/api/<Endpoint>` ↔ `Invoke-<Endpoint>` naming, comment-based-help declaration style, and
  the gating idioms themselves. Upstream refactors break steps loudly via the tripwires -
  treat a tripwire as "update the scripts", not "ignore and continue".
