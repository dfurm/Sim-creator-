# Baseline state: working copy for 0.2.0-proto (Run 2A)

> Copy maintained in `app/docs/`. The controlled original is `spec/STATE.md` (0.1.0), which is unchanged. The baseline paragraph below is quoted from it unchanged; the Phase 2 additions follow.

**Specification 0.1.0 baseline (unchanged).** Specification 0.1.0, 25 November 2026. Release status: specification drafted. All 84 blocks have a record and scored catalogue entry. First 28 have prototype briefs. The decision owner is Furmtech; academic, scientific and licence sign-off are pending for a public release. No website or existing software was modified. Start with S11/S02 and the cross-host contract test. The highest weighted product priority is S09 once its hydraulic and evidence dependencies are available.

## Phase 2 status: 0.2.0-proto, 26 November 2026 (Run 2A)

| Item | Status | Evidence |
|---|---|---|
| Runtime kernel (units, block lifecycle, applicability, schema validation, anchors, in-process host) | Prototype implemented, automated tests pass | `app/reports/2A/unit-tests.log` |
| S02 Continuity through a contraction, model 0.2.0, variant `starter` | **Prototype implemented**, under the VERIFICATION_VALIDATION_PLAN gate "Prototype implemented": frozen fixtures run through the public block API in a browser (Chromium only) | `app/reports/2A_TEST_REPORT.md` |
| S02 mathematical model | **Not verified.** No subject reviewer has checked it. | All equations, coefficients and references are `unverified` |
| Curriculum mappings (EA Stage 1, NCSE 2026) | **Proposed.** NCSE 2026 codes are blank (needs SME review). | `app/src/sims/S02/metadata.json` |
| S11 wall | Not implemented. Only its contract examples are schema-checked. | — |
| S04, S07, S08, S09 | Out of scope for 2A | — |
| Educational review, accessibility audit by people, browser matrix, licence inventory | Not started | See QUALITY_GATE copy |
| Public release | **None.** No simulation is released. | — |

Next: Run 2B, S04 Bernoulli, reusing the kernel. Resolve SPEC_ISSUES SI-05 (S02 applicability thresholds) and SI-09 (host handshake and nonce) with the spec owner.
