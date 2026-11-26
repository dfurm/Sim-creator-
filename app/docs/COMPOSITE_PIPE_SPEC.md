# Composite pipe lesson: contraction + straight run (S07 → S04 → S08)

**Status: draft written before implementation (Run 2B), 0.2.0-proto. Not reviewed.** Every item marked **[SME]** is where the spec is silent or ambiguous; each is also listed in `app/OPEN_QUESTIONS.md`. Nothing here is verified.

Source records (read-only): `spec/simulations/S07.md` (Reynolds number), `S04.md` (Bernoulli and the mechanical energy balance), `S08.md` (friction and pressure loss), `S02.md` (continuity), `registers/CORRELATION_REGISTER.md` (Colebrook row), `registers/PROPERTY_DATA_REGISTER.md` (TEACH-WATER), `standards/MODEL_APPLICABILITY_STANDARD.md`, `verification/SOLVER_ACCEPTANCE.md`.

## 1. Geometry, stations, datum and signs

```
   station 1            station 2                        station 3
   D1, z1 = 0           D2, z2 = 0                       D2, z3 = Δz
 ════════════╲_______________________________________________ ...
   (bore D1)   contraction   straight run, length L, bore D2, rises by Δz
```

| Item | Definition | Source |
|---|---|---|
| Station 1 | Upstream section, bore D₁, elevation z₁ = 0 (datum) | S04 §C "z₁ = 0" |
| Station 2 | Immediately downstream of the contraction, bore D₂. **Level contraction: z₂ = z₁ = 0** | Lesson definition [SME: the spec has no composite geometry] |
| Station 3 | End of a straight run of length L in bore D₂, elevation z₃ = Δz | S04 "outlet elevation", S08 "straight, constant bore" |
| Positive flow | 1 → 2 → 3; Q ≥ 0 (no reverse flow) | S02 §C, S08 |
| Elevation | z measured upward from the datum through the station-1 centreline | S04 |
| Pressure | **Absolute** static pressure p at the section (S04 p₁ is absolute). Gauge pressure is not used in the model. | S04 §D |
| Geometric constraint | \|Δz\| ≤ L (the rise cannot exceed the pipe length). With L = 0, station 3 coincides with station 2 and Δz must be 0. | Lesson definition |

## 2. Classification of quantities

| Class | Quantities |
|---|---|
| **Fixed** (constants, not editable) | g = 9.80665 m/s² (S04); z₁ = z₂ = 0; kinetic-energy correction factors α₁ = α₂ = α₃ = 1 (S04 §C); Newtonian single-phase liquid; no pump head (h_p = 0; pumps belong to S09, out of scope) |
| **Input** (editable within the ranges in §6) | Q, D₁, D₂, Δz, L, ε, ρ, μ, p₁, K |
| **Solved** (outputs) | v₁, v₂ (= v₃), Re₁, Re₂, regime, ε/D₂, f_D, h_K, h_f, p₂, p₃, all heads, ideal p₂ and p₃, head-balance residual |

## 3. Equations (evaluation order follows S04 §N: continuity → kinetic heads → losses → absolute pressure)

1. **Continuity (S02, S04):** vᵢ = 4Q/(πDᵢ²); v₃ = v₂.
2. **Reynolds number (S07):** Reᵢ = ρ vᵢ Dᵢ / μ.
3. **Contraction loss (S04):** h_K = K v₂²/(2g). **K is referenced to the downstream velocity v₂**, as in S04 §C ("K referenced to station 2"). K is a lumped user input. **No contraction-loss correlation is implemented, because the spec contains none** (CORRELATION_REGISTER has no contraction entry). Default K = 0, the S04 default. [SME: whether a K from tables, typically quoted for turbulent flow, can be used in laminar flow.]
4. **Friction (S08, Darcy convention):** h_f = f_D (L/D₂) v₂²/(2g); Δp_f = ρ g h_f = f_D (L/D₂) ρ v₂²/2.
   - Laminar: f_D = 64/Re₂ (roughness plays no part).
   - Turbulent: Colebrook, 1/√f = −2 log₁₀[ε/(3.7 D₂) + 2.51/(Re₂ √f)], **solved as S08 §K specifies: bisection on s = 1/√f over [1, 30], residual < 10⁻¹⁰**. The bracket-width criterion from VERIFICATION_VALIDATION_PLAN (relative width ≤ 10⁻⁸) is also applied. A missing bracket is reported on a separate solver-error channel, not as a validity status.
   - L = 0 gives h_f = 0 exactly, whatever f is.
5. **Mechanical energy balance (S04 §C):** with h_p = 0 and z₂ = z₁,
   - 1 → 2: p₂ = p₁ + ρ(v₁² − v₂²)/2 − ρ g h_K
   - 2 → 3: p₃ = p₂ − ρ g (z₃ − z₂) − ρ g h_f
6. **Heads (all in m of the flowing fluid at the input ρ):** pressure head p/(ρg) using absolute p; velocity head v²/(2g); elevation head z; total head H = p/(ρg) + v²/(2g) + z.
7. **Head balance:** H₁ = H₂ + h_K = H₃ + h_K + h_f. The closure residual r = H₁ − H₃ − h_K − h_f is reported; it should be zero to round-off.
8. **Ideal (no-loss) prediction under identical inputs:** the same equations with h_K = 0 and h_f = 0: p₂ᶦ = p₁ + ρ(v₁² − v₂²)/2, p₃ᶦ = p₂ᶦ − ρ g z₃. The lossy minus ideal difference is p₃ − p₃ᶦ = −ρ g (h_K + h_f).
9. **Zero-loss recovery:** K = 0 and L = 0 make the lossy result *identical* (same floating-point operations) to the ideal result.
10. **Pressure budget** shown in the head-loss bar: (p₁ − p₃)/(ρg) = Δz + (v₂² − v₁²)/(2g) + h_K + h_f. The first two terms are recoverable conversions; the last two are dissipated.

## 4. Regime rule and applicability (per output)

The regime is evaluated on **Re₂** (the friction run). The thresholds are **conventions** for developed Newtonian pipe flow (S07 §I, S08 §I), not physical constants; disturbance level can shift transition (S07 §I).

| Re₂ | Regime | f_D, h_f, p₃ (lossy), H₃, residual | Status |
|---|---|---|---|
| 0 (Q = 0) | no flow | f undefined (null, reason given); h_f = 0; p₃ valid | f: indeterminate; others within (S08 §I "At Q=0 output Δp=0 and f undefined") |
| 0 < Re₂ < 2000 | laminar | 64/Re₂ | within |
| 2000 ≤ Re₂ < 2300 | laminar | 64/Re₂ | **approaching**. The 2000–<2300 band is a provisional UI buffer (APPLICABILITY_STANDARD), not a physical threshold |
| 2300 ≤ Re₂ < 4000 | **transitional, outside scope** | **suppressed** (null + reason), unless L = 0 | **outside**. Re is still shown. No friction factor or pressure drop is shown as valid. |
| 4000 ≤ Re₂ < 4500 | turbulent (Colebrook) | Colebrook | **approaching** (4000–4500 provisional UI buffer) |
| 4500 ≤ Re₂ ≤ 10⁷ | turbulent | Colebrook | within, if ε/D₂ ≤ 0.05 |
| Re₂ > 10⁷ | beyond teaching envelope | suppressed | outside (product guard, CORRELATION_REGISTER) |
| turbulent and ε/D₂ > 0.05 | beyond teaching envelope | suppressed | outside (product guard) |

- **At exactly Re = 4000:** S08 says turbulent "≥4000", while S07 says ">4000 commonly turbulent". The friction model's owner (S08) is followed: 4000 counts as turbulent and approaching. [SME, SPEC_ISSUES SI-16]
- **Exactly at 2300:** transitional (S08 "Laminar <2300").

Other rules:
- **Absolute pressure ≤ 0** at station 2 or 3 is physically impossible for a liquid. The affected pressure, and every downstream pressure and total head, is **outside** and suppressed. This applies to the ideal and lossy predictions separately.
- **Cavitation margin:** S04 §I says to suppress the liquid prediction where p reaches the vapour pressure, and to flag an unknown margin when temperature or vapour data are absent. The spec supplies no vapour-pressure record (PROPERTY_DATA_REGISTER TEACH-WATER has only ρ and μ), and ρ and μ are editable here, so the fluid is unspecified. The cavitation margin is reported as **indeterminate** on a separate information line; it does not suppress pressures that are above zero. [SME]
- **Developed flow over the whole run:** S08 assumes fully developed flow, but station 2 sits immediately after a contraction. The development length is not modelled, so this is a stipulated assumption flagged [SME].
- **K applicability:** the user supplies K, and its dependence on Re and area ratio is not modelled. Stipulated, flagged [SME].
- Station-1 regime (Re₁) is reported for information. No station-1 friction is modelled, because the run upstream of station 1 is not part of the lesson.

## 5. Ideal vs lossy display

Both predictions are calculated from the same committed inputs and revision, and shown side by side: table columns, dashed ideal energy-grade line, separate markers. The ideal prediction remains valid in the transition band because it involves no friction model. It is labelled "ideal (no losses): not a prediction of a real pipe".

## 6. Input ranges (SI; teaching controls)

| ID | Quantity | Min | Max | Default | Step | Range taken from |
|---|---|---|---|---|---|---|
| Q | volume flow | 0 | 0.002 m³/s | 0.001 | 1e-5 | S04 (S08 allows up to 0.01; the composite uses the narrower S04 range) |
| D1 | upstream bore | 0.02 | 0.1 m | 0.05 | 0.001 | S04 |
| D2 | downstream bore | 0.015 | 0.1 m | 0.025 | 0.001 | S04 ∩ S08 |
| dz | outlet elevation z₃ | −2 | 2 m | 0 | 0.01 | S04 |
| L | run length | **0** | 100 m | 10 | 0.1 | S08 is 1–100 m; **0 is added** so the zero-loss check is possible [SME] |
| eps | roughness ε | 0 | 0.001 m | 0 | 1e-6 | S08 |
| rho | density | 500 | 1500 kg/m³ | 1000 | 1 | S07 (S04 and S08 fix 1000) |
| mu | viscosity | 0.0005 | 0.05 Pa·s | 0.001 | 0.0001 | S07 (S08 fixes 0.001) |
| p1 | inlet absolute pressure | 80 000 | 200 000 Pa | 101 325 | 1 | S04 |
| K | contraction loss coefficient (on v₂) | 0 | 10 | 0 | 0.1 | S04 |

Cross-field constraint: \|Δz\| ≤ L.

## 7. Identification

The scenario and snapshot schemas require `simulationId` to match `^S[0-9]{2,}$`, and the spec has no ID scheme for composite lessons. The composite block is therefore registered as **S04, variant `composite.contraction-run`**, because S04 owns the energy balance, with S07 and S08 kernels called as sub-models. Anchors may carry S04, S07 or S08 prefixes. [SME, SPEC_ISSUES SI-17]

## 8. Verification plan

- Spec fixtures: S07 Re = 2000 (and doubling rules), S04 Δp = −1945.37 Pa (and equal-area, +1 m rules, h_p = 0.19837 m), S08 f = 0.064 at Re = 1000 and f = 0.0179898 at Re = 10⁵ smooth (and halving-L, Fanning = Darcy/4).
- An independent Python script using mpmath, with Colebrook solved by `findroot` on f rather than on s, and a separate head balance. It also cross-checks against `fluids.friction.Colebrook`, recording its version.
- Continuity, head-balance residual, zero-loss recovery, invalid inputs, values just below, at and above 2000/2300/4000/4500/10⁷ and ε/D = 0.05, no valid-looking output when unsupported, snapshot round trip, file:// build, Playwright for the three tasks (keyboard only) and an axe scan.
