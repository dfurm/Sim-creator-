# Data contracts and reproducibility

| Object | Format and constraints |
|---|---|
| Manifest and parameter dictionary | UTF-8 JSON, JSON Schema 2020-12. Stable model/variant and variable IDs; values finite, SI internal; units explicit per variable, description of temperature and pressure basis. |
| Scenario | JSON schema + registry-aware validation. Exact model/variant version, initial values, allowed controls, narrower bounds, locks, reveal rules, semantic anchors and criterion expression from enumerated operations. |
| Snapshot | Versioned JSON, checksum of source data and profile, RNG/solver state, events and timestamps, independent scenario and learning version. Exact replay or explicit migration receipt. |
| Numerical outputs and histories | Tidy CSV UTF-8 with header, CSV quoting, decimal point, time basis and units in named columns or companion mapping; paired JSON metadata for units, source, quality, model and scenario versions. Empty field with reason for unknown, never a zero substitute. |
| Experiment | Immutable input bytes, content hash, equipment and instrument metadata, calibration date/uncertainty, row quality, planned exclusions and declared split by run. Derived dataset retains parent ID and transformations. |
| Assessment | JSON evidence with prompt version, prediction, tolerance, calculation revision and completion rule. Suppress external submission by default. |
| Large spatial data | Optional compressed binary typed-array field with JSON mesh/units/BC metadata; consider HDF5/NetCDF for specialist offline workflows after a demonstrated need. Link to a validated mesh and provenance. |

Version schema and model independently. Use semver and exact pins for published courses; any change affecting a previously assessable numerical response requires a new model version and replay comparison. Never replace an existing published asset in place. Additive metadata migrations are pure, logged and tested. For incompatible changes preserve previous reader or provide clearly stated migration and new verification fixtures.

**Synthetic data generator.** Define xorshift32 v1 unsigned state, nonzero seed, update by XOR with left shifts 13,17-right-unsigned,5-left in that order, truncating to uint32 each step. Uniform U=(uint32+0.5)/2³². Normals are Box–Muller from successive independent uniforms using sqrt(−2 ln U1)cos(2πU2); discard sine partner in v1 for stable stream. For holdout seed use seed XOR 0x9e3779b9, replace zero with 1. Noise-free fixtures may skip RNG only if documented in snapshot. Initial MC seed 17. Synthetic data uses source=synthetic and explicit generator version/parameters on scene, plot and export. Measured data require acquisition record. A fitted curve retains label fitted even when overlaid on measurements.

**Validation order.** Parse under size cap, reject unknown schema versions, map required units including affine temperature conversion, require known channel semantics and nonnegative time increments (two equal timestamps require an explicit event or deduplication decision), flag gaps and duplicates, preview, accept without changing raw file. Validate shape, then model-dependent constraints and admissibility. Distinguish “loaded successfully” from “eligible for a quantitative comparison”.
