# Open scientific questions for the subject-matter expert

Everything below is **needs-SME-review**. Each item names the decision taken in 0.2.0-proto so it can be accepted or changed.

| ID | Block | Question | Provisional decision in 0.2.0-proto |
|---|---|---|---|
| OQ-01 | S02 | Are the seven 2A applicability rules (S02.A1–A4, I1, G1, D1) acceptable? | Accepted as provisional by the product owner (Run 2B brief); flagged needs-SME-review |
| OQ-02 | S07/S08 | Exactly Re = 4000: S07 says ">4000 commonly turbulent", S08 says "turbulent ≥4000". Which governs? | The friction model follows S08: 4000 is turbulent, in the approaching band |
| OQ-03 | S08 | Are the 2000–<2300 and 4000–<4500 "approaching" bands (APPLICABILITY_STANDARD, provisional UI buffers) right for teaching, and should they apply to Re₂ only? | Applied to Re₂ only |
| OQ-04 | Composite | Contraction K: the spec has no correlation. Is a user-entered K referenced to v₂ (S04 convention) acceptable? Should tabulated K values carry a Re range, and is K meaningful in laminar flow? | User input, default 0 (S04 default), stipulated assumption |
| OQ-05 | Composite | Task (b) uses an illustrative K = 0.3. Is this value acceptable as a labelled teaching value, and should it cite a source? | Author-chosen, labelled "illustrative, not from a correlation" |
| OQ-06 | Composite/S08 | Developed-flow assumption immediately after a contraction: should an entrance or development-length rule (e.g. on L/D₂) qualify h_f, and on what source? | Stipulated, not modelled |
| OQ-07 | S04/Composite | Vapour pressure: the spec references an optional "named property record", but none exists. Which fluid state and record should be used? | Cavitation margin reported as indeterminate; only p ≤ 0 absolute is suppressed |
| OQ-08 | Composite | Is a level contraction (z₂ = z₁) with all elevation change in the straight run an acceptable lesson geometry? | Yes, by lesson definition |
| OQ-09 | Composite | Is extending L down to 0 m (S08 minimum is 1 m) acceptable, to show zero-loss recovery? | Extended; \|Δz\| ≤ L enforced |
| OQ-10 | Composite | ρ and μ are editable over S07's ranges, while S04 and S08 fix water values. Is it acceptable to apply Colebrook and 64/Re to any Newtonian liquid in 500–1500 kg/m³ and 0.0005–0.05 Pa·s? | Yes, with the Newtonian assumption stipulated |
| OQ-11 | Composite | Kinetic-energy factors α = 1 at all stations, including laminar flow (where α ≈ 2 for a fully developed profile). Should α depend on regime? | α = 1 (S04 §C) everywhere; flagged |
| OQ-12 | S08 | Colebrook's original specimen range and error bound (CORRELATION_REGISTER: "needs independent extraction"). | Teaching envelope 4×10³–10⁷, ε/D ≤ 0.05 used as a product guard only |
| OQ-13 | All | The NCSE 2026 ETP- codes supplied for Run 2B (TK1, TK2, AN1, IPS1, SD1, ST4), and their task mappings. | Used as **proposed** |
| OQ-14 | Composite | The composite lesson is registered as S04 variant `composite.contraction-run` because the schemas need an S-number. Is a separate lesson ID scheme wanted? | See SPEC_ISSUES SI-17 |
