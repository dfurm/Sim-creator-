# Controlled simulation specification template

One owner per simulation ID. Record a model version, educational content version, data revision, review status, affected host adapters and superseded versions. Allocate new IDs for distinct reusable models; a change of teaching activity usually warrants a new scenario.

| Section | Mandatory review questions |
|---|---|
| A Identification | What stable ID, subject, primary A–F, model tag(s), academic level, duration, effort and scope apply? |
| B Educational purpose | What observable outcome, prerequisite, misconception, industrial use and experiment justify an interactive scene? |
| C Mathematics | Which signed equations, symbols, units, constants, material properties, IC/BC and derivation establish the prediction? Identify independent, fixed, constrained and calculated quantities. |
| D Controls | For each ID specify name/symbol, meaning, canonical and display units, min/max/default/step, linear/log scale, permitted combinations, locked/derived states and accessible input mechanism. Include mode-specific target controls. |
| E Outputs | Specify IDs, units, intermediate values, rounding vs tolerance, physical interpretation, provenance, uncertainty and flags. |
| F Scene | What exactly moves or changes when an input changes? Specify named geometry, orientation, quantitative vs qualitative marks, legend, magnification and semantic targets. |
| G Graphs | What axes, units, scales, bounds, traces, references, markers, bands and experimental overlays answer the question? Provide a table equivalent. |
| H Interactive equations | Give symbolic → substituted → intermediate → rounded result, unit consistency and term-focus links. |
| I Applicability | Which assumptions are stipulated, observed, unknown or violated? Specify the rule, consequence, alternative and outputs affected. |
| J Alternatives | Simplest useful model, additional mechanism/data/solver cost, experimental identifiability and when a decision would change. |
| K Design | State target, controlled variables, discrete catalogue or continuous domain, feasibility checks, nonuniqueness, objective trade-off and detailed engineering boundary. |
| L Learning | Explore, predict and investigate, independent challenge, misconceptions and feedback, transfer/extension and assessment evidence. |
| M V&V | Source-backed analytical/published reference, independent check, limiting/invalid cases, units, residuals, numerical convergence/tolerances; separately identify physical comparison data and uncertainty. |
| N Implementation | Algorithm and complexity, dynamic step independent of rendering, ledger of dependencies, offline/browser/mobile/a11y/performance and custom graphics needs. |
| O Integration | Scenario pins, exposed/hidden/locked fields, anchors, completion rule, capture, state round trip, CSV mapping and host capabilities. |
| P Readiness | Links/sections, licences, illustrative/empirical sources, open questions, owner, review stage, dependency, priority and next learning. |

Categories are A mathematical foundations, B physical phenomena, C analytical engineering models, D unit operations, E design/sizing and F advanced modelling/judgement. Fidelity tags F1–F6 are a separate classification. Difficulty is conceptual; computational cost and implementation effort are separate quantities.
