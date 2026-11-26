# Run 2B test report: S07, S04, S08, composite pipe lesson and three tasks

**Furmtech Simulation Library · 0.2.0-proto · 26 November 2026** · branch `claude/furmtech-phase-2-setup-web075`

This report covers only what was run and observed in Run 2B. The logs are in `app/reports/2B/`. Nothing here is a scientific, educational or accessibility sign-off, and nothing is marked verified or reviewed. `./spec/` is unmodified: `git diff 557b644 HEAD -- spec` is empty.

## 1. Step 1: 2A state verified before any change

| Command (from `app/`) | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 170/170 passed |
| `npm run test:e2e` | 14/14 passed |

No defects blocked 2B, so nothing was fixed at this stage.

## 2. Results at the end of 2B

| Check | Command | Result |
|---|---|---|
| Spec reference worksheet | `.venv/bin/python spec/verification/reference_checks.py` (repo root) | **30/30 passed**, exit 0 |
| Strict type-check | `npm run typecheck` | **Clean** |
| Unit tests | `npm test` | **339/339 passed** in 11 files |
| Fixture tests | `npm run test:fixtures` | **151/151 passed** (part of the 339) |
| Browser tests | `npm run test:e2e` (Chromium 158 headless; builds both bundles) | **21/21 passed** |
| Independent fixtures | `npm run fixtures:generate` | Regenerates both fixture files **byte-identically** (deterministic) |
| Colebrook cross-check | `app/fixtures/generate_pipe_fixtures.py` | mpmath (Illinois root on f, 50 digits) vs **fluids 1.3.1** `fluids.friction.Colebrook`: max relative difference **1.6e-14** over 42 (Re, ε/D) points. TypeScript bisection vs both: < 1e-9 relative. |
| Bundle | `npm run build` | JS 745 kB raw / **224 kB gzip** (budget ≤ 350 kB). Single file 1.12 MB raw / 492 kB gzip |

## 3. What was built

- **Spec first.** `app/docs/COMPOSITE_PIPE_SPEC.md` was committed (82a0a04) before any 2B code. It covers stations, datum and signs, the fixed/input/solved classification, the equations in S04 §N order, the regime rule with the transition band out of scope, ranges, and the identification choice. Spec silences are flagged [SME] and listed in `app/OPEN_QUESTIONS.md` (14 questions).
- **S07** (`src/sims/S07/`): Re = ρvD/μ, fixed-speed and fixed-flow modes, and S07's own screen label. A shared regime classifier follows the S08 convention.
- **S04** (`src/sims/S04/`): p₂ = p₁ + ρg[z₁ − z₂ + hₚ − h_L] + ρ(v₁² − v₂²)/2, evaluated in the spec's order. Modes: ideal (K and hₚ locked at 0), losses and addedHead. Also gives the pump head needed for a target p₂.
- **S08** (`src/sims/S08/`): laminar 64/Re; Colebrook by **bisection on s = 1/√f over [1, 30], residual < 1e-10, relative bracket width ≤ 1e-8**. A missing bracket goes to a separate solver-error channel. The teaching envelope (Re ≤ 10⁷, ε/D ≤ 0.05) is a product guard. At Q = 0, f is undefined and Δp = 0.
- **Composite lesson** (`src/sims/pipe/`): registered as S04 variant `composite.contraction-run` (SI-17).
  - Lossy and ideal predictions come from identical inputs, with a head-balance residual and a pressure budget.
  - In the transition band, f, h_f, p₃, H₃ and the residual are **null with a reason** and status ⛔ outside. Re is still shown, and the ideal prediction is unaffected.
  - With L = 0, h_f = 0 whatever the regime.
  - Absolute p ≤ 0 suppresses that pressure and everything downstream.
  - The cavitation margin is shown as indeterminate, because no vapour-pressure record exists.
- **Kernel changes (additive):**
  - more units (Pa, kPa, Pa·s, mPa·s, m²/s, cm/s, g/L, text);
  - `AnchorRegistry` accepts member-block prefixes;
  - exports (CSV and JSON) now carry the learning record, i.e. predictions, answers and explanations.
- **UI:**
  - **Library home** at `?`, listing S02, the S02 investigation and the four pipe-lesson pages.
  - **Lesson page** `?sim=pipe&task=explore|a|b|c`:
    - **Controls:** every quantity is tagged *input*, *fixed* or *solved* (as a tag and in text), and the fixed constants are listed. Display units can be switched while values stay in SI.
    - **Results:** a heads table with pressure, velocity, elevation and total head at stations 1–3, lossy and ideal side by side. A grade-line chart shows the lossy EGL and HGL, the dashed ideal EGL and the pipe centreline, each with a distinct marker shape. A signed head-budget bar separates recoverable from dissipated head (solid vs dashed edges, not colour alone). Equations show live substitution, and outputs carry an icon-and-text status.
    - **Linking:** semantic anchors connect the diagram, table and equations, and the diagram has a text alternative. Nothing moves, so reduced motion is respected trivially.
- **Tasks** (`src/sims/pipe/metadata.json`, `scenario.task*.json`): each task needs a **committed prediction before the reveal** (hidden outputs come from `hiddenUntil`). The prediction is logged with units, revision and inputs, and appears in snapshots and in CSV/JSON exports. Each task has 3 assessment items (two multiple-choice, one numeric), and every option has explanatory feedback. Numeric answers come from an enumerated list in `assessment.ts`, never from expressions in data. Competency metadata is **proposed**:

| Task | Bloom | EA Stage 1 | NCSE 2026 |
|---|---|---|---|
| (a) Level contraction | Apply | 1.1, 1.2 | ETP-TK1, ETP-IPS1 |
| (b) Ideal vs lossy | Analyse | 1.1, 1.2, 2.2 | ETP-TK1, ETP-TK2, ETP-AN1 |
| (c) Applicability limit | Evaluate | 1.2, 1.4, 2.1 | ETP-AN1, ETP-IPS1, ETP-ST4 |

  Task (c) also logs `limit-reached` automatically when the friction prediction is first withdrawn after the prediction.
- **S02 metadata:** NCSE codes added as proposed (TK1; TK1 + TK2; SD1 + IPS1). The seven S02 rules are now `needs-SME-review` with a note that they are accepted as provisional.

## 4. Test inventory (new in 2B)

| Requirement | Where | Shown |
|---|---|---|
| Spec fixtures | `tests/fixtures/pipe.fixtures.test.ts` | S07 Re = 2000 ± 1e-9; ×2 D at fixed v → 4000; fixed Q → half Re; Re = 0 stationary. S04 Δp = −1945.37 ± 0.01 Pa (1e-10 rel. to the unrounded spec value); equal areas → Δp = 0; +1 m → +9806.65 Pa; hₚ = 0.19837 m. S08 f = 0.064 at Re = 1000; f = 0.0179898 ± 1e-7 at Re = 10⁵; halving L halves Δp; Fanning = Darcy/4; Q = 0 → Δp = 0, f null. |
| Independent Python fixtures | `app/fixtures/generate_pipe_fixtures.py` → `tests/fixtures/pipe.fixtures.json` | 46 composite cases (16 named, 30 seeded random) covering laminar, transitional, turbulent, no flow, too rough, p ≤ 0 at station 2 and at station 3, and an expansion. Regime thresholds and suppression are coded separately from the TypeScript. |
| fluids cross-check | same | Version **1.3.1** recorded in the fixture file; < 1e-9 agreement for every turbulent case |
| Continuity | `tests/pipe.model.test.ts` | A·v = Q at each station (≤ 1e-8 Q) over 9 cases |
| Head-balance closure | same | \|H₁ − H₃ − h_K − h_f\| ≤ 1e-12 H₁; station-by-station H₁ − H₂ = h_K, H₂ − H₃ = h_f; budget closes; lossy − ideal = −ρg(h_K + h_f) |
| Zero-loss recovery | same | K = 0 and L = 0 give p₂, p₃ and H₃ **exactly equal** (`toBe`) to the ideal values, over 6 cases including transitional and zero flow |
| Invalid inputs | same + e2e | NaN, ±Infinity, negative Q, μ = 0, out-of-range μ/ρ/ε/K/p₁, strings, \|z₃\| > L (including L = 0). Each rejected atomically with a message; locked task inputs return `LOCKED` |
| Regime boundaries | same | Kernel at boundary × (1 − 1e-9), boundary, boundary × (1 + 1e-9) for 2000, 2300, 4000, 4500, 10⁷ and ε/D = 0.05. Through the block with Re₂ ± 1e-6 around 2300 and 4000 |
| Never valid-looking when unsupported | same + e2e | For transitional, too rough, p₃ ≤ 0 and p₂ ≤ 0: every `outside` output is null, and every non-null output is within/approaching/unknown. CSV rows for outside outputs have no value and carry a reason. The UI shows "—" plus ⛔ and text; the budget and grade lines say "not available" |
| Snapshot round trip | same | Snapshot with a logged prediction → JSON → restore in a new instance: identical outputs and extras; learning record preserved in the snapshot, JSON and CSV |
| Assessment | `tests/pipe.assessment.test.ts` | Three tasks, ≥ 2 items each, exactly one correct option, feedback on every option, codes proposed, nothing verified; numeric answers (1945.37 Pa; H₁ − H₃; 4.712 L/min) |
| file:// | `e2e/file-build.spec.ts` | Home, all four lesson pages and S02 open from the single file with **0 console errors and 0 network requests**; KaTeX renders |
| Three tasks, keyboard only | `e2e/pipe.spec.ts` | Focus + typing + Space/Enter only. (a) prediction → reveal → A1–A3 with right and wrong feedback → explanation → criteria done → JSON export contains the prediction and answers. (b) same, plus head balance 1.824 m and budget. (c) Q slider: PageDown × 9, ArrowLeft × 3 → Re₂ = 3565, transitional; f, h_f, p₃, H₃, residual withheld; limit logged; C1–C3 |
| axe scan | `e2e/pipe.spec.ts` | **0 violations** (WCAG 2.0/2.1/2.2 A and AA tags) on explore, and on tasks (a), (b) and (c) after the reveal and with feedback shown |
| Anchors, reflow | `e2e/pipe.spec.ts` | Focusing the friction-run anchor highlights the f row and equation; no horizontal scroll at 320 px |

**Defects found and fixed during 2B:**
1. The first fixture solver (secant on f) stepped outside f's valid domain. It was replaced with a bracketing Illinois solve on [0.002, 0.5].
2. The outputs-table header claimed "3 s.f.", but values ≥ 1000 are shown as whole integers (e.g. 81488 Pa). The header now reads "≥3 s.f."
3. Two assertions in my own e2e tests were worded wrongly. The behaviour was right; the assertions were corrected.

## 5. Launch instructions

**Double-click (offline):** unzip `furmtech-sim-0.2.0-proto-2B.zip` and open `furmtech-sim-standalone.html` in Chrome or Edge. It opens on the library home page; follow the links to the S02 pages and the pipe-lesson tasks. Pages are chosen with query strings, for example `furmtech-sim-standalone.html?sim=pipe&task=b`; you can also type these into the address bar.
*Only Chromium 158 has been tested under file://.*

**Local server:** `cd app && npm ci && npm run build && npm run serve`, then open http://localhost:4173/?sim=pipe&task=a.

**Tests:** `npm test`, `npm run test:fixtures`, `npm run test:e2e`, `npm run test:all`. To regenerate the independent fixtures: `npm run fixtures:generate` (needs `.venv` with mpmath and fluids; see `app/reports/python-requirements.lock.txt`).

## 6. Open scientific questions for the subject expert

These are listed in full in `app/OPEN_QUESTIONS.md`. In brief:
1. **OQ-02:** at Re = 4000, should S07 (">4000") or S08 ("≥4000") govern?
2. **OQ-03:** are the 2000–2300 and 4000–4500 "approaching" buffers right for teaching, and should they apply to Re₂ only?
3. **OQ-04 and OQ-05:** is a user-entered K referenced to v₂ acceptable without a correlation, and is the illustrative K = 0.3 in task (b) acceptable as labelled?
4. **OQ-06:** should the developed-flow assumption just after a contraction be qualified by an entrance-length rule?
5. **OQ-07:** which vapour-pressure record and fluid state should drive the cavitation check?
6. **OQ-08 and OQ-09:** is the level contraction with all the rise in the run acceptable, and is extending L to 0 m acceptable?
7. **OQ-10:** can 64/Re and Colebrook be applied to any Newtonian liquid across S07's ρ and μ ranges?
8. **OQ-11:** should α = 1 hold in laminar flow, where α ≈ 2?
9. **OQ-12:** what are the original Colebrook specimen range and error bound?
10. **OQ-13:** are the supplied NCSE codes and their task mappings right?
11. **OQ-01 and OQ-14:** S02 rules (provisional), and the ID scheme for composite lessons.

## 7. Drive

The package upload result is recorded in `app/reports/2B/drive-upload.md`, written after packaging.

## 8. Verification pending

- **Scientific review** of the S07, S04 and S08 models, the composite head balance, the Colebrook implementation and envelope, every applicability rule, and the 14 open questions. Everything is unverified or needs-SME-review.
- **Educational review** of the three tasks: wording, the assessment items and feedback, Bloom levels, and the proposed EA and NCSE mappings. No learner or instructor pilot has been run.
- **Browser matrix:** only headless Chromium 158 was tested. Firefox, Safari, Edge, iOS and Android, real devices, and double-clicking the file in a desktop browser are untested.
- **Manual accessibility:** screen reader (NVDA, JAWS, VoiceOver), 200% zoom, dark-mode contrast and touch-only use. The axe scans are automated only and cover light mode.
- **Diagram accuracy:** bores are drawn to one scale, but the run length and rise are schematic and labelled as such. There is no automated geometric check of the charts.
- **Performance** on the reference midrange Android device.
- **Host adapter and handshake/nonce** (SI-09, deferred to Run 2C); iframe and LMS embedding.
- **Licence and rights review** (R06) of bundled dependencies (React, KaTeX and fonts, Ajv; all MIT except fast-uri, which is BSD-3-Clause) and of the content.
- **Drive:** see `drive-upload.md`.
