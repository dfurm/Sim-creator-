# Release gate record: working copy for 0.2.0-proto

> Copy maintained in `app/docs/`. The controlled original is `spec/QUALITY_GATE.md` (0.1.0), which is unchanged. The third column records what Run 2A has evidenced. It is self-reported by the implementer, so **no sign-off is given or implied**.

| Evidence | Baseline 0.1.0 disposition | Evidence required for next approval | 0.2.0-proto (Run 2A), S02 only |
|---|---|---|---|
| A–P structures and unique IDs | Provided for all 84 blocks; 28 detailed starter handoffs | Academic owner accepts depth, assumptions and names for selected tranche | Unchanged. Sidecar metadata added; mappings **proposed**. |
| Numerical examples | Independent Python arithmetic spans all 28 required prototypes | Public block API matches fixtures and complete boundary matrix; second scientific reviewer | **Partly evidenced.** The public block API matches the spec fixture and 45 independent mpmath fixtures (rtol 1e-12), including zero-flow, equal-diameter, corner, expansion and infeasible-design cases. **Second scientific reviewer: pending.** |
| Correlation applicability | Source or explicit unknown per family; synthetic data labelled | Original experimental envelope for real-service use | S02 uses no correlation. The rules are author-defined and `unverified` (SPEC_ISSUES SI-05). |
| Implementation, visual accuracy and browser support | Architecture and acceptance criteria defined | Tested browser builds, quantitative diagram checks and accessibility evidence | **Chromium 158 headless only.** 14 Playwright tests, including an automated axe WCAG 2.2 A/AA scan with zero violations and file:// with zero console errors. The diagram draws diameters to one scale (1500 px/m) and arrows to one velocity legend; there is no quantitative pixel check yet. **Firefox, Safari, mobile devices and screen-reader testing: pending.** |
| Educational effectiveness | Research-informed design and assessment plan | Observed learner/instructor pilot and disposition of feedback | Not started. The prediction → reveal → explanation flow is implemented but untested with learners. |
| Experimental validation | No supplied apparatus data used to establish validation | Predeclared held-out data, uncertainty and domain-specific sign-off | None. No physical validation is claimed. Outputs are labelled "calculated", not measured. |
| Published release | No simulation marked released | Signed version, dependency rights, archived assets and rollback | **Not released.** Dependency licences listed in the 2A test report; rights review (R06) pending. |
