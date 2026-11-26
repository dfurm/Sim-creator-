# Run 2A test report: runtime foundation and S02

**Furmtech Simulation Library · 0.2.0-proto · 26 November 2026** · branch `claude/furmtech-phase-2-setup-web075`

This report covers only what was run and observed in this run. The logs are in `app/reports/2A/`. Nothing here is a scientific, educational or accessibility sign-off. The spec in `./spec/` was not modified: `git diff --stat HEAD -- spec` is empty after every commit.

## 1. Results summary

| Check | Command (from `app/` unless stated) | Result |
|---|---|---|
| Spec reference worksheet | `.venv/bin/python spec/verification/reference_checks.py` (repo root) | **30/30 passed**, exit 0. One last-digit difference against the recorded JSON in S27 (4.4e-16, within tolerance), logged as SPEC_ISSUES SI-13 |
| Strict type-check | `npm run typecheck` | **Clean** |
| Unit tests | `npm test` | **170/170 passed** in 8 files |
| Fixture tests | `npm run test:fixtures` | **49/49 passed** (subset of the unit tests above) |
| Browser tests | `npm run test:e2e` (builds `dist/app` and `dist/file`, serves `dist/app` on :4173, Chromium 158 headless) | **14/14 passed** |
| Single-file build from file:// | included in `test:e2e` (`e2e/file-build.spec.ts`) | **Passed**: 0 console errors or warnings, 0 non-file network requests, KaTeX rendered, model responds to input |
| Automated accessibility scan | axe-core 4.14.1, WCAG 2.0/2.1/2.2 A and AA tags | **0 violations** on the default S02 page. This is an automated scan, not a manual audit. |
| Reflow | Playwright at 320 px, and a screenshot at 360 px | No horizontal page scroll (`scrollWidth` 320 and 360) |
| Bundle | `npm run build` | JS 680 kB raw / **204 kB gzip** (budget ≤350 kB gzip). CSS 9.7 kB gzip. woff2 fonts 256 kB. Single file 1.06 MB raw / 472 kB gzip |

## 2. What was built

**Kernel (`app/src/core/`)**: pure TypeScript with no DOM or React; `tests/purity.test.ts` enforces this.
- `units.ts`: SI unit registry, 7-component dimension vectors, conversion with dimension checks, and `DimQ` for checking formula dimensions.
- `block.ts`: `AlgebraicBlock`, which implements `spec/contracts/block.ts`:
  - **Lifecycle:** `initialise`, `reset` and `dispose`. `start`, `pause` and `advanceTimestep` reject with `UNSUPPORTED`; any call after `dispose` rejects with `DISPOSED`.
  - **Inputs:** `setInputParameters` validates and commits a patch atomically, with an optional expected revision; `getInputParameters` returns the current set.
  - **Results:** `calculate`, `getOutputs` and `getModelValidity`.
  - **Export and state:** `exportData` writes CSV (with formula-injection neutralisation) or JSON; `saveState` and `restoreState` validate against the snapshot schema.
  - **Events:** `subscribe` delivers `parameter.changed`, `calculation.completed`, `validity.changed`, `simulation.stateChanged`, `error`, `data.exported` and `activity.completed`.
- `applicability.ts`: four statuses, `within`, `approaching`, `outside` and `indeterminate`, combined in the order outside → indeterminate → approaching → within, per output. Each has an icon and text presentation. `indeterminate` maps to the contract's `unknown`.
- `schemas.ts`: Ajv (draft 2020-12) validation against `spec/contracts/*.schema.json`, read in place rather than copied.
- `anchors.ts`: stable semantic anchor IDs (`S02/throat_area`, …) in a registry that rejects duplicates and foreign IDs.
- `host.ts`: in-process `furmtech.sim/1` host:
  - every message is checked against the envelope schema, with a 64 kB payload cap;
  - commands are rejected until a handshake;
  - the instance ID and model version must match exactly;
  - a retry cache keyed by session + requestId prevents re-execution;
  - acks and events are separate envelopes.
- `criteria.ts`: evaluates scenario criteria from enumerated operations only. No assessed credit is given outside applicability.

**S02 (`app/src/sims/S02/`)**
- `model.ts`: A = πD²/4, v = Q/A, ṁ = ρQ with ρ = 1000 kg/m³. Areas are computed before velocities. Bore design gives D_min = √(4Q/(π v_max)) with a forward check on the teaching bore grid. Seven applicability rules, all author-defined and `unverified`.
- `definition.ts`: binds `spec/manifests/S02.json`, unchanged, to the model. App extensions: `mode` and `vmax` (SPEC_ISSUES SI-03).
- `scenario.default.json` and `scenario.investigate.json` are schema-valid. The investigate scenario hides v₂ until a prediction is recorded.
- `metadata.json`: sidecar holding:
  - EA Stage 1 codes, **proposed**;
  - NCSE 2026 ETP- codes, **left blank as `needs-SME-review`** because the EA site was unreachable, so none were guessed;
  - Bloom level and evidence type per activity;
  - fidelity tags (model form: algebraic-analytical; solution: closed-form; data: one stipulated constant) next to F1;
  - `verification_status: unverified` on every equation, coefficient, reference and rule.

**Views (`app/src/views/`, framework-free SVG)**
- Scene: two round sections drawn to one diameter scale (1500 px/m), with a dimension legend.
  - Mean-velocity arrows share one legend and carry a labelled note when the scale is reduced.
  - Hatched equal-volume parcels lengthen downstream in proportion to v̄.
  - Five focusable anchors, each with an `aria-label`.
  - `<title>`/`<desc>` and a visible text description.
- Plots: station vs v̄ (two points) and a D₂ sweep of v̄₂ with the current point marked, plus a table equivalent.

**UI shell (`app/src/ui/`, React 19)**
- **Controls:** slider plus numeric entry for each input. The numeric field accepts partial tokens and commits on Enter or blur; arrows step finely; Shift+Arrow and PageUp/PageDown step ×10.
- **Validation:** inline errors with `aria-invalid`, and the last result is kept. Locked and derived inputs are disabled with a reason.
- **Units:** an L/min·mm ↔ SI toggle; values are stored in SI.
- **Status:** a banner with icon, text and rule list.
- **Outputs and equations:** an outputs table (3 s.f. plus full precision, status, origin, revision) and KaTeX equations with live substitution and a plain-text alternative. Table row, equation term and diagram anchor highlight together.
- **Activities:** a prediction → halve → feedback → explanation flow, and a bore-design panel.
- **State:** save and restore in the browser (localStorage), download and load a snapshot file, CSV and JSON export, reset. A polite live region announces each committed change.
- **Motion:** pause and play; motion starts paused when reduced motion is on.

## 3. Test inventory

| Area | File | What it shows |
|---|---|---|
| Spec fixture | `tests/fixtures/s02.fixtures.test.ts` | v₂ at defaults is within ±5e-6 of 2.03718 (reference_results.json) and matches the spec's unrounded value to 1e-12. §M values v₁ = .509296, ṁ = 1 and D_min = .0252313 m are reproduced. |
| Independent fixtures | same file, data from `app/fixtures/generate_s02_fixtures.py` | mpmath at 50 digits, written separately from the TypeScript. 40 forward cases (defaults, equal diameters, Q = 0, halving, expansion, eight range corners, 25 seeded random) and 5 design cases (feasible, all-feasible, infeasible, zero flow). All agree to rtol 1e-12, and the feasible bore lists match exactly. Regenerate with `npm run fixtures:generate`. |
| Continuity closure | `tests/s02.model.test.ts` | 45 cases with A₁v₁ = A₂v₂ = Q and ṁ = ρAv, residual ≤1e-8 of Q. v₂/v₁ = (D₁/D₂)². |
| Dimensions | same | Each output's dimension equals its manifest unit; the dimensioned twin equals the numeric model. |
| Invalid inputs | same | NaN, ±Infinity, negative Q, zero or negative D, out-of-range values, strings, unknown IDs, unknown mode and locked inputs are all rejected with a specific message. No partial update, and the revision does not change. |
| Lifecycle and events | `tests/block.test.ts` | Phases, optimistic revision, event payloads, `validity.changed`, `UNSUPPORTED`, reset, idempotent dispose, scenario locks and ranges, malformed or incompatible scenarios, CSV and JSON export content. |
| Snapshot round trip | `tests/snapshot.test.ts` | Save → JSON → restore in a new instance gives **bit-identical outputs**, the same revision, inputs, learning record and runId, including bore-design mode. Invalid snapshots are rejected and state is left unchanged. Saved snapshots validate against `snapshot.schema.json`. |
| Contracts | `tests/contracts.test.ts` | Spec examples (host command, wall manifest, scenario and snapshot), the S02 manifest and both S02 scenarios validate. Every manifest anchor is registered. Metadata statuses are present, and none is `verified`. |
| Cross-host | `tests/host.test.ts` | The same inputs give identical outputs standalone and through the envelope host. Covers handshake gating, the retry cache, rejection paths and save/restore through the host. |
| Purity | `tests/purity.test.ts` | No React or DOM in the kernel or models, no React in the renderers, no network APIs in `src/`. |
| Browser | `e2e/s02.spec.ts`, `e2e/file-build.spec.ts` | Defaults; keyboard-only interaction; invalid entries; unit toggle; bore design including the infeasible case; guided investigation; save/restore; CSV download; anchor linking; reduced motion; 320 px reflow; axe scan; file:// build. |

**Defect found and fixed during the run:** focusing a diagram anchor did not highlight its table row, because the scene was rebuilt on every React render and the focused node was replaced. The scene now rebuilds only when its data changes, and the e2e anchor test passes.

## 4. Launch instructions

**Double-click (offline, no install):** open `S02-standalone.html` from the zip, or `dist/file/index.html` after `npm run build:file`, in Chrome or Edge. Everything is inlined: no server and no network. The guided investigation is at `S02-standalone.html?scenario=investigate`; type it in the address bar or use the link at the top of the page. Saving in the browser works per file location; use "Download snapshot" to keep your work.
*Only Chromium 158 has been tested under file://. Firefox and Safari are untested.*

**Local web server (from a clone):**
```
cd app
npm ci
npm run build && npm run serve        # http://localhost:4173/
npm run dev                           # development server with hot reload
```
**Tests:** `npm test`, `npm run test:fixtures`, `npm run test:e2e`, `npm run test:all`. Reference checks from the repo root:
`.venv/bin/python spec/verification/reference_checks.py`.

## 5. Google Drive connector test (step 6)

Folder created: **Furmtech Simulation Library / Phase2_v0.2.0-proto** (`1g1QnETftLUavf_J2jDZWQGalMNZmXJ3O`). The v0.1.0 files in the parent folder were not touched.

| Test file | Bytes | Upload | Read back via connector, SHA-256 |
|---|---|---|---|
| drive-test-small.txt | 83 | ✅ | identical (`f2025768…db8900`) |
| drive-test-1M.bin | 1,048,576 | ✅ | identical (`2df4114e…335ea7d`) |
| drive-test-3000000.bin | 3,000,000 | ✅ | identical (`110d1ebc…938becf`) |
| drive-test-4M.bin | 4,194,304 | ❌ | Connector: "over the 4.2 MB limit on each connector call … room for about 3.1 MB of files". Nothing sent. |
| drive-test-16M.bin | 16,777,216 | ❌ | Connector: "over the 10 MB limit for uploads from here". Nothing sent. |

**Largest verified upload: 3,000,000 bytes.** The practical ceiling is about 3.1 MB per file per call. The three test files remain in the folder and can be deleted.
The package upload result is recorded in `app/reports/2A/drive-upload.md`, written after packaging.

## 6. Runtime dependencies and licences (bundled)

react 19.3.1 (MIT), react-dom 19.3.1 (MIT), scheduler 0.28.0 (MIT), katex 0.19.1 (MIT, with its fonts), ajv 8.20.0 (MIT), fast-deep-equal (MIT), json-schema-traverse (MIT), fast-uri (BSD-3-Clause), require-from-string (MIT). `commander` is a KaTeX CLI dependency and is not bundled. Dev and QA only: TypeScript, Vite, Vitest, Playwright, axe-core (MPL-2.0); in Python, mpmath (BSD-3-Clause), NumPy, SciPy and fluids 1.3.1 (MIT). The rights review (BACKLOG R06) has **not** been done.

## 7. Verification pending

- **Scientific review** of the S02 equations, the seven applicability rules and the bore-design logic by a named second reviewer. Everything is `unverified`.
- **NCSE 2026 ETP- codes:** not retrieved (EA site unreachable from the container). Codes and labels need SME entry and review. All EA Stage 1 mappings are proposed only.
- **Spec owner decisions** on SPEC_ISSUES SI-01–SI-15, especially SI-05 (applicability thresholds) and SI-09 (handshake and nonce).
- **Browser matrix:** only headless Chromium 158 was tested. Firefox, Safari, Edge, iOS Safari, Android Chrome and real devices are untested, and so is double-clicking in a desktop browser.
- **Accessibility:** a manual keyboard and screen-reader walkthrough (NVDA, JAWS, VoiceOver), a 200% zoom check, contrast measurement in dark mode and touch-only use have not been done. The axe scan covered only the default page in light mode.
- **Performance** on the reference midrange Android device (input-to-output median <50 ms, p95 <100 ms) has not been measured.
- **Diagram accuracy:** no automated pixel or geometry check of diameter-to-scale or arrow-to-legend proportionality.
- **Iframe/postMessage adapter, WordPress/LMS embedding and the S11 wall block** are not implemented. Cross-host testing so far is in-process only.
- **Learner and instructor pilot** of the investigate and challenge activities.
- **Licence and rights inventory** (R06) and a licence decision for the code and content (D08).
- **Drive:** binary uploads over about 3.1 MB are blocked through the connector. See `drive-upload.md` for the package.
