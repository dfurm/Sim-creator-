# Fidelity, provenance and maturity

| Tag | Representation | Decision and evidence |
|---|---|---|
| F1 | Fundamental analytical | Exact under declared idealisation; check units and analytical limits. |
| F2 | Extended analytical | Several mechanisms, geometry, effective parameters or boundary conditions; verify each term. |
| F3 | Empirical or semi-empirical | Name data source, coefficient convention, geometry, fitted range and uncertainty. |
| F4 | Numerical | Declare solver, stopping criteria, refinement, initialisation and error evidence. |
| F5 | Specialist computational | Document spatial problem, mesh, time resolution, closures, boundary data and independent verification. |
| F6 | Calibrated or hybrid | Record equipment identity, calibration domain, fit and held-out validation data. |

Tags may coexist and attach to a variant. A root finder for Colebrook adds an F4 algorithm to an F3 law. Blasius is a similarity model solved as an ODE; it does not become a full CFD flow field. A synthetic example with a future rig curve is F2 in starter mode; F6 becomes active only when an identified calibration is loaded. S77 teaches discretisation; F5 labels a comparison target for specialist models. Freeze the variant in every saved scenario. A small time step cannot fix a guessed heat-transfer coefficient. Prioritise improving the dominant source of error for the decision being made.

For an upgrade, write the target quantity and required tolerance, missing mechanism, cost of new inputs/solver, and method for checking improvement on independent data. Reject an upgrade if it is unidentifiable from the measurements or fails to improve the engineering decision. Pair every maturity stamp with a version, scope of claim and reviewer. A verified F1 can outperform an uncalibrated F6.
