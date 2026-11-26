# Baseline state: working copy for 0.2.0-proto (Run 2A)

> Copy maintained in `app/docs/`. The controlled original is `spec/STATE.md` (0.1.0), which is unchanged. The baseline paragraph below is quoted from it unchanged; the Phase 2 additions follow.

**Specification 0.1.0 baseline (unchanged).** Specification 0.1.0, 25 November 2026. Release status: specification drafted. All 84 blocks have a record and scored catalogue entry. First 28 have prototype briefs. The decision owner is Furmtech; academic, scientific and licence sign-off are pending for a public release. No website or existing software was modified. Start with S11/S02 and the cross-host contract test. The highest weighted product priority is S09 once its hydraulic and evidence dependencies are available.

## Phase 2 status: 0.2.0-proto, 26 November 2026 (after Run 2B)

| Item | Status | Evidence |
|---|---|---|
| Runtime kernel (units, block lifecycle, applicability, schema validation, anchors, in-process host) | Prototype; reused unchanged by 2B, apart from additive changes (more units, member-block anchors, learning record in exports) | `app/reports/2B/unit-tests.log` |
| S02 Continuity, model 0.2.0 | Prototype implemented (2A). Rules **accepted as provisional, needs-SME-review**. NCSE codes proposed | 2A report |
| S07 Reynolds number, model 0.2.0 | **Prototype block** (fixedSpeed, fixedFlow); no standalone page | spec fixture Re = 2000 and doubling rules pass |
| S04 Bernoulli / mechanical energy balance, model 0.2.0 | **Prototype block** (ideal, losses, addedHead); no standalone page | spec fixture Δp = −1945.37 Pa, +1 m → +9806.65 Pa, hₚ = 0.19837 m pass |
| S08 Friction and pressure loss, model 0.2.0 | **Prototype block** (automaticRegime, fixedDarcy); Colebrook by bisection as S08 §K specifies | f = 0.064 at Re = 1000; f = 0.0179898 at Re = 10⁵; matches mpmath and fluids 1.3.1 to < 1e-9 |
| Composite pipe lesson (S04 variant `composite.contraction-run`) | **Prototype lesson** with three tasks (a, b, c) | `app/reports/2B_TEST_REPORT.md`; spec in `app/docs/COMPOSITE_PIPE_SPEC.md` |
| Mathematical models | **Not verified.** No subject reviewer has checked them. | 14 open questions in `app/OPEN_QUESTIONS.md` |
| Curriculum mappings (EA Stage 1, NCSE 2026) | **Proposed** | metadata JSON files |
| S09, public deployment, host adapter (2C), live equipment | Out of scope | — |
| Public release | **None** | — |

Next (Run 2C): host adapter and handshake/nonce (SI-09), then S09 once hydraulic prerequisites are reviewed.
