# Property and evidence data

| Record | Definition and units | Origin and permitted use | Limitation |
|---|---|---|---|
| G-STD | Standard gravity 9.80665 m/s² | Defined conventional constant for calculations | Local gravity may differ. |
| R-MOL | Molar gas constant 8.314462618 J/(mol K), rounded | Physical constant, rounded as stated | All temperatures absolute. |
| TEACH-WATER | Density 1000 kg/m³, μ=.001 Pa·s when stated in module | Constant illustrative hydraulic inputs, original fixtures | No claim of simultaneous precision at a specific water state. Gauge/absolute pressure and cavitation checks separate. |
| TEACH-PLATE | ν=1.5e−5 m²/s, kf=.026 W/(m K), selectable Pr | Illustrative property set | Pr must be calculated if μ, cp and k are independently supplied; independent Pr slider is a dimensionless teaching family. |
| TEACH-WALL | User-defined positive conductivity and resistance | Generic specimen parameters with declared bounds | Thickness is geometric. A material change affects k; apparent k can also reflect contact/heterogeneity. |
| TEACH-BINARY | Fixed illustrative Psat pair 200 and 100 kPa | Synthetic binary at one unspecified fixed teaching temperature | No named mixture, temperature sweep or physical validation. |
| WEBBOOK | Component identity, property, phase, citation, range, unit convention [NIST] | Link to source; verify NIST SRD terms before bundling coefficients [NISTTERMS] | Do not extrapolate or claim all US government data are unrestricted. |
| NORRIS | Ozone-monitor calibration data, NIST StRD [STRD, NORRIS] | Publicly accessible reference dataset and certified coefficients, linked, not repackaged | Independent software check for regression, not FlexBench validation. |
| EXP01–04 | Furmtech experiment designs for pump, system/valve, series/parallel and PID | Internal documents used for alignment. Runtime data absent. | Require permission/provenance, actual CSV, geometry, timebase, instrument quality and separate held-out run. |

Later property packs must specify phase, p/T validity, species, composition basis, property uncertainty, interpolation method and units, source/licence and revision. Include independent property checkpoints, boundary queries and continuity test across adjacent fit intervals. Missing pressure, temperature or mixture tags return unknown. Choosing a nominal teaching fluid is an explicit assumed fact in the session. An imported file never inherits the provenance of a source merely because column names match.
