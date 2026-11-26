# Furmtech Chemical Engineering Interactive Simulation Library

**Development specification 0.1.0 · 25 November 2026**

Open **Handbook.html** for the searchable reading edition. It works offline after download; external references need network access. The five-page decision brief and the standalone simulation register are provided separately and the same register is included under registers/. The HTML is a reading edition of the specification, with worked graphics; implemented teaching simulations are a subsequent release.

| Reader | First file | Next step |
|---|---|---|
| Product owner | PROJECT_SCOPE.md | Review the six tracks, weights and open decisions under roadmap/. |
| Academic | research/BENCHMARK_REPORT.md | Follow a pathway in registers/CURRICULUM_MAP.md and review the target A–P simulation record. |
| Scientist or reviewer | simulations/S11.md | Check the applicable source, scientific assumptions and independent fixtures under verification/. |
| Front-end developer | architecture/ARCHITECTURE.md | Read the block contract and schema-valid wall examples, then briefs/S11.md and briefs/S02.md. |
| Equipment/software integrator | integration/RECIPE_INTEGRATION_PLAN.md | Follow the read-only head-calculation and scenario handoff, then the website deployment plan. |

**Record ownership.** simulations/Sxx.md is the scientific and educational source of truth for a block. briefs/Sxx.md is a derived, standalone handoff for each of the 28 prototypes. Catalogue, rates, weights and parameter/equation CSVs are machine-readable projections of this baseline. Each block has a proposed manifest in manifests/. Manifest module keys identify planned implementations. They are not links to code already delivered. The representative wall scenario/snapshot/host envelope under examples/ is suitable for contract tests.

**Evidence.** Run `python verification/reference_checks.py` with NumPy and SciPy to reproduce the 28-topic reference worksheet. The recorded output and a separate independent fit to NIST’s observed Norris dataset are provided. For release maturity, see STATE.md, QUALITY_GATE.md and the open issues in roadmap/BACKLOG.md. An educational modelling specification or a numerical match does not certify equipment performance.
