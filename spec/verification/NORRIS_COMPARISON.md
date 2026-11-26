# Published measurement data and regression example

NIST's Norris file contains 36 observed ozone-monitor calibration pairs; the original text columns are response **y first**, predictor **x second**. Read both columns without assigning invented physical units or treating the sequence as time. Use this reference case in S27 to verify coefficient orientation and residual calculations. Source data and certified values are available from NIST. [Raw file](https://www.itl.nist.gov/div898/strd/lls/data/LINKS/DATA/Norris.dat) · [Certified fit](https://www.itl.nist.gov/div898/strd/lls/data/LINKS/v-Norris.shtml)

| Quantity | Recalculated by QR on 36 observations | NIST certified |
|---|---:|---:|
| Intercept | -0.26232307377413 | −0.262323073774029 |
| Slope | 1.00211681802045 | 1.00211681802045 |
| Residual sum of squares | 26.6173985294231 | 26.6173985294224 |
| Residual standard deviation, 34 df | 0.8847963961444 | 0.884796396144373 |

**Implementation.** Build A=[1,x], compute thin QR, solve Rβ=Qᵀy, compute residuals using the original x units and s=√(SSE/34). Compare coefficients to absolute tolerance 1e−10 and SSE to 1e−9. The overlay should offer fitted response and a residual axis with a zero line; a near-unity slope on the main plot can conceal deviations on the residual plot. Keep the mean confidence band and future observation interval distinct. This dataset benchmarks the fitting procedure on observed measurements. It supplies no calibration for a Furmtech sensor or pump.

The downloadable source data are linked above. The reference chart in the reading edition is an original rendering of these published observations.
