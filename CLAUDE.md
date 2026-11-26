# CLAUDE.md — Furmtech Simulation Library, Phase 2

## Read first, every run
1. `spec/STATE.md` — baseline state and where to start.
2. `spec/AGENT_INSTRUCTIONS.md` — how to implement a block from this baseline.
Then read the records the task names (`spec/simulations/Sxx.md`, `spec/briefs/Sxx.md`,
`spec/architecture/*`, `spec/contracts/*`, `spec/QUALITY_GATE.md`).

## Hard rules
- **Never edit, move, reformat or delete anything under `./spec/`.** It is the
  immutable v0.1.0 specification. If a spec file looks wrong, report it; do not fix it.
- **Work only in `./app/`.** Build output goes to `./dist/` (generated, git-ignored).
  Reports go in `app/reports/`, project notes in `app/docs/`.
- The Python venv (`./.venv/`) is for independent reference checks only; product code
  is TypeScript in `app/`.
- Do not present simulated output as measured, or a numerical match as validation of
  equipment (see `spec/QUALITY_GATE.md`).

## Reporting
- Report only work you have verified in this run, with the command you ran and its result.
- End every report with a **"Verification pending"** list: everything not yet verified
  (not run, failed, needs a human reviewer, needs a browser or device not available here).
- Never claim a test passed unless you saw it pass. Quote exact errors.

## Commands (run from `app/`)
| Purpose | Command |
|---|---|
| Install dependencies | `npm ci` |
| Type-check (strict) | `npm run typecheck` |
| Unit tests (Vitest) | `npm test` |
| Fixture tests only | `npm run test:fixtures` |
| Regenerate independent fixtures (mpmath) | `npm run fixtures:generate` |
| Browser tests (Playwright, headless Chromium; builds both bundles, serves dist/app on :4173) | `npm run test:e2e` |
| Everything | `npm run test:all` |
| Dev server | `npm run dev` |
| Serve production build | `npm run build && npm run serve` (http://localhost:4173) |
| Production build → `dist/app/` | `npm run build` |
| Single-file offline build (opens via file://) → `dist/file/index.html` | `npm run build:file` |

Reference checks (from repo root):
```
.venv/bin/python spec/verification/reference_checks.py > app/reports/reference_checks_output.json
```
If `.venv` is missing: `python3 -m venv .venv && .venv/bin/pip install -r app/reports/python-requirements.lock.txt`.

## Project notes
- Spec defects go in `app/SPEC_ISSUES.md`; updated copies of STATE/DEVELOPMENT_LOG/QUALITY_GATE live in `app/docs/`.
- Models (`app/src/core`, `app/src/sims`) must stay free of DOM and React; renderers (`app/src/views`) free of React. `tests/purity.test.ts` enforces this.
- Never mark a mapping or status verified/reviewed; mappings are "proposed", statuses "unverified".

## Environment notes
See `app/ENVIRONMENT.md`. In the cloud container `npx playwright install` is blocked;
`playwright.config.ts` falls back to `/opt/pw-browsers/chromium` automatically.
