# CIPP Permissions Mapper

[![drift-check](https://github.com/Queensland-Computers/cipp-permissions-mapper/actions/workflows/drift-check.yml/badge.svg)](https://github.com/Queensland-Computers/cipp-permissions-mapper/actions/workflows/drift-check.yml)
![Node.js >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

Maps every [CIPP](https://github.com/KelvinTegelaar/CIPP) `Category.Object` permission to
what it actually does: the pages it unlocks, the
[CIPP-API](https://github.com/KelvinTegelaar/CIPP-API) functions it governs, and - most
usefully - the places where those two disagree. If you've ever built a tiered custom role,
granted a permission, watched the page appear, and then watched every button on it return
403, this catalog exists to tell you which second permission you were missing.

**The catalog: [`cipp-permissions-catalog.html`](cipp-permissions-catalog.html)** - one
self-contained page, filterable, with an anchor per permission. GitHub won't render HTML in
the repo view, so download it, or visit [GitHub Pages Link to Come].

The same matrix also ships as [markdown](data/permissions-catalog.md),
[CSV](data/permissions-catalog.csv), and machine-readable JSON
([full matrix](data/permission-matrix-merged.json),
[backend-only permissions](data/backend-only-permissions.json)).

## One thing to understand

**Nav permissions control visibility, not capability.** A permission that makes a page
visible says nothing about whether the page's data calls and buttons work - each backend
function enforces its own role. A working role needs the union of the backend roles its
pages' endpoints declare, and the catalog's mismatch tables list exactly where that union
crosses permission boundaries.

The mechanics, as enforced by CIPP-API's `Test-CIPPAccess.ps1`:

- You assign `Category.Object` pairs at `.Read` (view) or `.ReadWrite` (view + act).
- Matching is case-insensitive, and `ReadWrite` implies `Read`.
- Some permissions are **backend-only** - declared by API functions but surfaced on no page.
  They matter for API-client roles and as hidden pairing requirements.

## Regenerating the catalog

You need `Node.js 18+` and local clones of CIPP and CIPP-API (siblings of this repo by
default):

```
node scripts/run-pipeline.js [--cipp <path>] [--cipp-api <path>]
```

That extracts the frontend nav and permission gates, reads every backend function's `.ROLE`
declaration, cross-checks the gates against the endpoints each page actually calls, and
renders the HTML/MD/CSV - deterministically, stamped with both repos' commits and versions.

The only manual step is **descriptions**. When upstream changes add, remove, or change the
evidence for a permission, the pipeline pauses and writes `output/descriptions-todo.json` -
the exact entries in `data/descriptions.json` that need writing, deleting, or re-review.
Edit them (by hand, or with the bundled Claude Code skill in
`.claude/skills/cipp-permissions-mapper/`, which enforces the style and evidence rules) and
re-run. Pass `--accept-stale` once you've reviewed entries whose evidence changed but whose
descriptions are still right. Untouched permissions are never rewritten.

A monthly [drift-check workflow](.github/workflows/drift-check.yml) re-runs the pipeline
against upstream HEAD and files a tracking issue (with the todo list embedded) whenever the
published catalog needs regenerating - the badge above shows the latest result.

## Why you can (hopefully) trust the numbers

- Everything except description text is script-extracted - counts, function lists, and
  mismatch verdicts are never recalled from memory by a human or a model.
- Every stage carries **tripwires** (bucket sums must equal files scanned, ≥400 backend
  functions, ≥100 nav entries, and so on) that fail the run loudly when an upstream
  convention changes, instead of degrading into plausible-looking garbage.
- Where the heuristics can't attribute an endpoint honestly - shared plumbing, competing
  gate sets, gates ambiguous between pages - the pipeline **abstains and records why**
  (`output/crosscheck.json`) rather than guessing.
- The last pipeline step verifies the published outputs against each other: every row
  described, HTML stats matching the matrix, provenance embedded.

In saying that, I can't completely guarantee that every pattern has been matched accurately. 
At it's core, this was a best-effort attempt to consolidate disparate permissions across CIPP
to make writing Custom Security Roles a little easier.

## Limitations

Static analysis with validated heuristics, not a live-tested authority. Nav-level checks
run at `Category.Object` granularity (the nav layer carries no level info); JSX
conditional-render gates aren't paired to endpoints; import-following is one hop and skips
self-gated components. The scripts hardcode current CIPP conventions (`nativeMenuItems`,
Next.js `src/pages` routing, `/api/<Endpoint>` ↔ `Invoke-<Endpoint>`, comment-based-help
`.ROLE` declarations) - upstream refactors trip the invariants rather than silently
corrupting output. And mismatches are findings about the permission model's granularity,
useful for role design - not necessarily bugs in CIPP.

## Affiliation, licenses, credits

This is an independent community resource, **not an official CIPP project**, and not
affiliated with the CIPP maintainers. Where the catalog and upstream behaviour disagree,
upstream wins.

CIPP and CIPP-API are © Kelvin Tegelaar and contributors, licensed under
[AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html). This tool reads both repos locally
and extracts factual metadata only - permission names, function names, nav titles, file
paths. No upstream source code is redistributed in the published catalog.

Created by Matthew Gray (Queensland Computers). The scripts and catalog content in this
repo are likewise licensed under [AGPL-3.0](LICENSE).

The code in this repository was architected and reviewed by a human, with active coding
assistance from AI.
