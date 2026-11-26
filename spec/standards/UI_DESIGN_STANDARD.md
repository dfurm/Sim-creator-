# Student interface and visual language

Desktop places the physical scene and result above the equation and trend; controls form an adjacent column. Tablet stacks a short control group below the scene. At 320 CSS pixels use one column, numeric entry and a list/table alternative to pan-dependent plots. Keep the selected input and its principal output simultaneously visible where possible. Example S11 desktop orders title/objective, slab scene, heat flux, thickness/conductivity controls, equation, resistance chart and optional investigation. On mobile move the heat flux and edited control into the immediate reading order; keep a persistent pause button during animation.

| Element | Interaction contract |
|---|---|
| Controls | Native labels, units adjacent, numeric field equivalent to slider, keyboard arrows and coarse/fine steps. Allow editing partial tokens; commit on Enter/blur, show last calculated value while invalid. Range and fixed/derived state announced. |
| Units | SI engine; localised display labels. Separate absolute and gauge pressure, differential and absolute T, mole and mass fractions, Darcy and Fanning factors. Preserve full precision in exports and return to exact SI on display switch. |
| Equation | Render symbolic line, numeric substitution with units, contributions and rounded answer. Term activation via focus/click links to the corresponding control, plot marker and scene element. Include accessible linear text and a plain-text worked example. |
| Scene | Pipes/tanks/slabs carry physical dimensions. Distinguish mean from local velocity; a thin wall or boundary layer can be magnified only with axis label. A continuum law does not predict individual particle paths. Direction by arrows, scale by numeric legend. |
| Plot | Named axes with units and reference state. Use shared axes for comparisons, separate incompatible units, distinct dashes and point shapes. For zero/negative values on log scales explain exclusion. No joined line between independent measurements by default. |
| Motion | Pause/play, step and reset always available; user-controlled 0.25×–4× display speed. Respect reduced motion. No autoplay required for an answer. Changing animation speed leaves solver and assessment invariant. |
| Status | Icon + text + specific rule; describes consequence and next possible model. Screen reader announces a concise committed change, not every animation frame. |
| Export | Accessible data table, CSV and replayable JSON; label synthetic, measured, assumed or fitted. Suppress unknown derived values while preserving their reason. |

WCAG 2.2 AA target: test keyboard order and visible focus, name/role/value, 200% zoom and reflow, contrast (4.5:1 ordinary text, 3:1 relevant graphics and large text), target size, alternatives to dragging, pause and reduced motion. Use solid/dashed curves with symbols; status must remain readable in monochrome. Test a complete S11 investigation with keyboard and screen reader, a pump duty selection with touch only and every plot via a table, including an out-of-range point. Colour legend units and minimum/maximum are mandatory. Reference [WCAG].
