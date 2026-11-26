# Equipment performance, design and optimisation

**Design basis.** Record service, geometry and orientation, imposed flows/temperatures/pressures, allowable losses and constraints, operating window, property source and uncertainty, candidate catalogue revision and duty schedule. Identify which variables the user can set in each mode. The forward solver is the source of truth. After solving an inverse problem, re-run the forward model on the *rounded, available* candidate and on operating-window extremes.

| Mode | Algorithm | Required output |
|---|---|---|
| Performance | Evaluate a given candidate at a prescribed input state | Duty, losses, utilities, validity and relevant margin; plot basis and units. |
| Design | Invert analytically, bracket physically separated roots, or enumerate a discrete catalogue | All admissible candidates, no solution, unique solution, multiple branches or missing evidence. Include active constraints and residual. |
| Optimisation | Enumerate or sample feasible controls, eliminate dominated candidates and show trade-off | Pareto set on stated objectives, robustness under changed inputs, reason each rejected candidate fails. Never silently choose weights. |

**Worked duty.** S10 at Q=.001 m³/s, D=.05 m and the published illustrative constants yields about 2.132 m required head and 34.85 W shaft power. At .025 m the velocity exceeds the default 2 m/s ceiling. A .063 m bore saves friction head but adds diameter. Put both surviving and rejected points on the plot. For annual energy convert shaft power using actual motor efficiency and operating hours. Where prices are absent, plot diameter, kWh and water use. If pricing is supplied, record AUD/base year, source, assumed installation scope, replacement life, annual hours, tariff, discount rate and sensitivity. Lifecycle present worth equals initial capital plus sum of annual net costs discounted to the basis date. Do not infer capex from diameter alone.

| Equipment | Geometry that changes | Performance, inverse and trade-off | Next engineering evidence |
|---|---|---|---|
| Pipe / pump / valve | Actual bore, head duty, valve throat | Pressure drop / bore and speed / power vs size and operating range | Manufacturer curves, allowable duty, NPSH margin, system hydraulics, service/material rating; valve standard [IEC]. |
| Exchanger / insulation | Area, equivalent tube length, inner/outer radii | Duty / area or thickness / approach vs fouling, energy vs clearance | Actual pass configuration, fouling history, pressure drop, mechanical rating, vibration and thermal expansion [HEAT]. |
| Reactor / residence vessel / mixer | Working volume, diameter, impeller and headspace | Conversion or mixing / V,N / yield, energy and residence distribution | Verified kinetics, mixing trials, heat removal, containment and review of process hazards. |
| Distillation / absorption | Theoretical contacts, packing height and diameter | Separation / stage count, area or height / utility vs size | Actual tray efficiency, packing curves, hydraulics/flooding, pressure rating, vendor and professional design. |
| Cake filter / membrane / centrifuge | Effective area, module count, equivalent settling area | Throughput / area or capacity / installation vs cleaning and recovery | Service trials, membrane limits, cycle overhead, cut curve and equipment ratings. |
| Utilities / resource use | Capacity, peak demand, storage working volume | Energy balance / supply or buffer / energy, water and cost | Duty coincidence, operating schedule, local tariff, reliability and supply limits. |

These are preliminary teaching scopes. An equipment requirement record must identify applicable local design codes, required vendor selections and professional review; certified pressure boundaries, relief sizing, protective trips and plant safety cases are separate engineering deliverables. Avoid a universal design margin. If an educator specifies a factor, show its basis, effect on feasibility and units. A missing vendor datum is an explicit unknown.
