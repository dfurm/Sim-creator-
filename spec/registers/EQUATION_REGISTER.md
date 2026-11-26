# Shared equations and numerical methods

EQUATION_REGISTER.csv identifies the governing relation, output basis, calculation method, conditions and sources for every block. Own equations once, supply mode-specific parameter and validity wrappers.

| Shared kernel | Consumers | Numerical controls |
| --- | --- | --- |
| geometry.area; pipe/plate/particle/impeller Re | S02/05–10/14/42/49/75 | Explicit characteristic length and velocity; no global regime label. |
| hydraulic.head; Darcy; pump intersection | S04/08–10/45/46/47 | Check pressure datum, kinetic factors, positive root, branch and data hull. |
| thermal.resistance; stable LMTD; effectiveness | S11–16/51/53/79 | Use near-equal limits, sign and positive approaches, common U area. |
| balances.inventory; first-order propagator | S13/18/19/25/66/69/72 | Exact piecewise ZOH when linear; preserve state on input change. |
| bracket, continuation and tridiagonal solve | S06/08/12/13/23/30/32/41/58 | Sign check or turning point for repeated roots; residual + bracket; cancellation and refinement. |
| reaction.rate; Levenspiel; RTD | S19–21/56–59/70–73 | Use declared units/order and temperature; separate mixing and sensor effects. |
| equilibrium.binary; split balances | S22/23/40/41/60–64 | Use compatible thermodynamic constraint; reject pinches and infeasible compositions. |
| regression.QR; covariance; seeded MC | S27/28/57/69/78/84 | Rank/conditioning checks, covariances, reproducible train/test split and independent validation. |
