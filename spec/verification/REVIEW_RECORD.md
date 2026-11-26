# Independent-method review record

The review used independent numerical formulations for selected prototype outputs, machine checks on schemas and examples, and a second reading across sections. No external subject-matter reviewer was engaged; no human peer-review or experimental-validation stamp is issued.

| Check | Finding or correction | Disposition |
|---|---|---|
| Velocity, pressure and pipe sizing | Checked diameter/area convention, Pa vs metres of head and that the sizing fixture uses the declared 20 m line and Darcy f=.02. | Consistent design and reference fixture. |
| Pump evidence | Speed-command data do not establish RPM or efficiency; measured flow head also depends on tap heights and bores. | Preserve these dependencies in EXP01/02 import and exclude unsupported power claims. |
| Boundary layer | Independent collocation solution checks wall slope and 99% edge against shooting target. ReL is length-based; physical averages apply to the coefficient or stress. | Quantitative separation/turbulent near-wall predictions disabled in laminar branch. |
| Wall and exchanger | Shared flux across series layers and the contact jump checked. Near equal-capacity and equal-temperature-difference limits avoid cancellation. | Fixed-face wall vs bath vs two-stream boundary cases explicitly separated. |
| Stage counting | Independent stage stepping gives six equilibrium contacts for S23 default and Rmin=.8. | Partial reboiler included, total condenser excluded. |
| Regression and propagation | Checked regression residual norm with independent polynomial fitting and covariance using a matrix expression. | Certified Norris values linked as optional external fixture; no real calibration data invented. |
| Source rights | Different conditions apply to PhET HTML, Wolfram embeds and previews, LearnChemE linked materials, OCW and NIST SRD. | Link/cite by default and clear actual assets prior to distribution. |
| Curriculum/readiness | Internal notes include indirect and cohort-specific evidence. Course-topic alignment does not establish a lab purchase or experimental inventory. | Initial teaching levels, scores, hosting and module boundaries are provisional. |

Run `python verification/reference_checks.py` from the pack root with NumPy and SciPy. Compare output with reference_results.json and inspect tolerances. These computations are independent of the proposed TypeScript runtime, which has not been implemented. Schema validation checks structure; an adapter must also enforce registry membership, units, input locks, compatible model/scenario versions and authorised message origin.
