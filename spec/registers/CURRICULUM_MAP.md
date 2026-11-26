# Curriculum map

Read left to right within each pathway. Cross-subject prerequisites are skill dependencies rather than mandated course enrolments. Reuse a pure kernel when geometry, independent variables and boundary conditions agree. S07 supplies the Reynolds *concept* across pipe, plate, impeller and particle flows; each variant defines its own characteristic scales and regime criteria.

| Pathway | Foundation → phenomenon → model → operation → design or operation |
| --- | --- |
| Hydraulics | S02/S03/S07 → S04/S05 → S08 → S09/S45 → S10/S47 → EXP01–04 |
| Heat | S01 → S11 → S12/S13 or S06/S14 → S15 → S16/S79 → thermal practical |
| Mass transfer | S01/S17 → S54 → S60/S63 → absorption or membrane trials |
| Reaction | S01/S18/S21 → S19 → S20/S57 → S58 or CSTR/tracer practical |
| Separation | S33/S22 → S41 → S23/S61/S62 → equipment stage/capacity decision |
| Control | S01/S26 → S18/S66 → S25 → S67/S68/S69 → EXP04 or virtual troubleshooting |
| Bioprocess | S33/S35/S19 → S70 → S71/S72 → S75/S84 → S65/S78/S74 |
| Evidence | S01/S26 → S27/S28 → S32/S77 or calibrated rig comparison |

## Node-level prerequisite and transfer map

| ID | Block | Required IDs | Direct successors | Practical bridge |
| --- | --- | --- | --- | --- |
| S01 | Rate, gradient and accumulated volume | Entry | S06 S11 S13 S17 S18 S21 S24 S26 S27 S28 S29 S30 S36 S38 | Flow logging or weighed accumulation; EXP01 optional |
| S02 | Continuity through a contraction | Entry | S04 S05 S09 S18 S28 S33 | EXP01 measured flow and line geometry |
| S03 | Hydrostatic pressure and datum | Entry | S04 S44 S46 | Static water-column pressure check; EXP01 tap-datum preparation |
| S04 | Bernoulli and the mechanical energy balance | S02 S03 | S09 S42 | EXP01 single pump and EXP02 system curve |
| S05 | Laminar pipe velocity and shear | S02 S07 | S08 S43 S81 | Separate laminar capillary demonstration; EXP02 only if regime and taps qualify |
| S06 | Flat-plate momentum and thermal boundary layers | S01 S07 | S14 S77 | Independent flat-plate teaching data; no claimed FlexBench capability |
| S07 | Reynolds number and competing scales | Entry | S05 S06 S08 S14 S31 S42 S49 S50 S75 | EXP01/02 pipe geometry, flow and viscosity |
| S08 | Darcy friction and pressure loss | S05 S07 | S09 S10 S24 S45 S47 S50 S81 | EXP02 only with suitable straight-pipe differential taps |
| S09 | Pump and system operating point | S02 S04 S08 | S10 S45 S46 S47 | EXP01 and EXP02; EXP03 extension |
| S10 | Pipe selection and pump duty | S08 S09 | S76 | EXP01/02 design tutorial |
| S11 | Fourier conduction through a composite wall | S01 | S12 S13 S14 S15 S17 S32 S51 S52 | Proposed instrumented wall specimen; lecture-ready without equipment |
| S12 | Cylindrical insulation and critical radius | S11 | S51 | Independent insulated-cylinder demonstration |
| S13 | Transient heating and cooling | S01 S11 | Terminal transfer/design | Proposed thermal module; instrumented slab for spatial validation |
| S14 | Convection from a plate and the Nusselt number | S06 S07 S11 | S15 S54 | Independent isothermal plate; separate from internal-flow rig |
| S15 | Heat exchanger performance and flow arrangement | S11 S14 | S16 S53 S79 | Proposed heat-exchanger module; confirm stream vs bath boundary |
| S16 | Heat exchanger area and feasible duty | S15 | S76 S79 | Proposed heat-exchanger module, preliminary duty exercise |
| S17 | Diffusive flux and transient concentration | S01 S11 | S54 S59 S62 S63 | Independent tracer diffusion or membrane coupon demonstration |
| S18 | Dynamic tank mass and level balance | S01 S02 | S19 S25 S57 | Manual tank inventory or proposed level module |
| S19 | CSTR concentration response | S18 S21 | S20 S57 S58 S70 | Proposed CSTR with calibrated conductivity tracer |
| S20 | CSTR versus PFR performance and sizing | S19 | S59 | Proposed CSTR; PFR comparison is virtual until separately measured |
| S21 | Arrhenius temperature sensitivity | S01 | S19 S56 S58 | Independently supplied kinetics data |
| S22 | Binary vapour–liquid equilibrium | Entry | S23 S41 | Published equilibrium data after rights/mixture review |
| S23 | McCabe–Thiele design and reflux | S22 | Terminal transfer/design | Graphical design tutorial; no physical column claimed |
| S24 | Cake filtration performance and filter area | S01 S08 | S63 S78 S82 | Proposed dead-end filtration extension |
| S25 | PID control, saturation and recovery | S18 S26 | S67 S68 S69 | EXP04 PID flow control |
| S26 | Numerical integration and timestep convergence | S01 | S25 S32 S56 S66 S70 | Virtual solver comparison, reuse on CSTR traces |
| S27 | Fitting an empirical correlation | S01 | S73 S74 S78 | EXP01 fitted curve or sensor calibration across independent runs |
| S28 | Uncertainty and sensitivity in flow measurement | S01 S02 | Terminal transfer/design | EXP01 flow/geometry metrology; independently documented uncertainties |
| S29 | Function shape and dimensional scaling | S01 | S43 | Analytical or recorded teaching dataset |
| S30 | Root finding and feasible branches | S01 | S37 S40 S41 S52 S58 | Analytical or recorded teaching dataset |
| S31 | Dimensionless groups and similarity | S07 | S75 | Analytical or recorded teaching dataset |
| S32 | Boundary values, finite differences and mesh refinement | S11 S26 | S77 | Analytical or recorded teaching dataset |
| S33 | Mixing, dilution and multicomponent balances | S02 | S34 S35 S36 S61 S64 | Manual inventory or weighing exercise |
| S34 | Recycle, bypass and purge | S33 | Terminal transfer/design | Manual inventory or weighing exercise |
| S35 | Reactive balances, yield and selectivity | S33 | S40 S56 S70 | Manual inventory or weighing exercise |
| S36 | Sensible heating, latent duty and continuous energy balance | S01 S33 | S39 S53 S55 S64 S76 S80 | Manual inventory or weighing exercise |
| S37 | Real gas compressibility and phase roots | S30 | S38 S48 | Tutorial or independently sourced equilibrium data |
| S38 | Compression paths, work and irreversibility | S01 S37 | S39 S48 S80 | Tutorial or independently sourced equilibrium data |
| S39 | Entropy generation and refrigeration cycles | S36 S38 | Terminal transfer/design | Tutorial or independently sourced equilibrium data |
| S40 | Chemical equilibrium and extent | S35 S30 | S61 S80 | Tutorial or independently sourced equilibrium data |
| S41 | Nonideal mixtures, phase diagrams and flash | S22 S30 | Terminal transfer/design | Tutorial or independently sourced equilibrium data |
| S42 | Flow metering, orifice and Venturi | S04 S07 | Terminal transfer/design | EXP01 reference meter only with suitable pressure taps |
| S43 | Rheology, shear and viscosity | S05 S29 | Terminal transfer/design | Hydraulic loop or independent water-column demonstration |
| S44 | Surface tension and capillary rise | S03 | Terminal transfer/design | Hydraulic loop or independent water-column demonstration |
| S45 | Pipe networks, minor losses and parallel pumps | S08 S09 | Terminal transfer/design | EXP03 series/parallel and EXP02 system curve |
| S46 | Suction head and cavitation margin | S03 S09 | Terminal transfer/design | EXP01 suction-side design discussion; no deliberate cavitation required |
| S47 | Valve travel, installed characteristics and sizing | S08 S09 | Terminal transfer/design | EXP02 system curve and valve characterisation |
| S48 | Compressible nozzle and choking | S37 S38 | Terminal transfer/design | Hydraulic loop or independent water-column demonstration |
| S49 | Particle drag, settling and classification | S07 | S50 S65 S83 | Manual or virtual separation practical |
| S50 | Porous beds, pressure drop and fluidisation | S07 S08 S49 | S60 | Hydraulic loop or independent water-column demonstration |
| S51 | Sphere conduction, fins and effective conductivity | S11 S12 | Terminal transfer/design | Proposed thermal rig or separate instrumented specimen |
| S52 | Radiation and natural convection | S11 S30 | Terminal transfer/design | Proposed thermal rig or separate instrumented specimen |
| S53 | Boiling, condensation and utility load | S15 S36 | Terminal transfer/design | Proposed thermal rig or separate instrumented specimen |
| S54 | Mass transfer films, boundary layers and absorption | S14 S17 | S55 S60 S62 S63 S72 S83 | Proposed transport demonstration |
| S55 | Humidification and drying | S36 S54 | Terminal transfer/design | Proposed transport demonstration |
| S56 | Batch kinetics, selectivity and yield | S21 S35 S26 | Terminal transfer/design | Proposed CSTR/tracer teaching module |
| S57 | Tracer residence time and nonideal mixing | S18 S19 | S74 S84 | Proposed benign tracer CSTR |
| S58 | Nonisothermal reactors and multiple steady states | S19 S21 S30 | Terminal transfer/design | Proposed CSTR/tracer teaching module |
| S59 | Catalyst effectiveness and diffusion resistance | S17 S20 | Terminal transfer/design | Proposed CSTR/tracer teaching module |
| S60 | Packed absorber height and diameter | S50 S54 | Terminal transfer/design | Design tutorial; compare vendor or independently measured duty when available |
| S61 | Liquid–liquid extraction stages | S33 S40 | Terminal transfer/design | Manual or virtual separation practical |
| S62 | Adsorption equilibrium and breakthrough | S17 S54 | Terminal transfer/design | Manual or virtual separation practical |
| S63 | Membrane flux, polarisation and TFF sizing | S17 S24 S54 | Terminal transfer/design | Design tutorial; compare vendor or independently measured duty when available |
| S64 | Evaporation and crystallisation balances | S33 S36 | Terminal transfer/design | Manual or virtual separation practical |
| S65 | Centrifuge capacity and biomass clarification | S49 | Terminal transfer/design | Design tutorial; compare vendor or independently measured duty when available |
| S66 | Dynamic response and frequency domain | S26 | S67 S68 S69 | EXP04 PID flow control; compare only compatible plant assumptions |
| S67 | Control structures and disturbance rejection | S25 S66 | Terminal transfer/design | EXP04 PID flow control; compare only compatible plant assumptions |
| S68 | Predictive control with constraints | S25 S66 | Terminal transfer/design | EXP04 PID flow control; compare only compatible plant assumptions |
| S69 | Sensor lag, actuator dynamics and fault diagnosis | S25 S66 | Terminal transfer/design | EXP04 archived signal or synthetic fault case |
| S70 | Growth, substrate and fermentation balances | S19 S26 S35 | S71 S72 | Proposed food-yeast or abiotic classroom dataset |
| S71 | Chemostat and washout | S70 | Terminal transfer/design | Proposed food-yeast or abiotic classroom dataset |
| S72 | Dissolved oxygen and competing oxygen demand | S54 S70 | S84 | Proposed food-yeast or abiotic classroom dataset |
| S73 | Enzyme kinetics and saturation | S27 | Terminal transfer/design | Proposed food-yeast or abiotic classroom dataset |
| S74 | Chromatographic peak shape and resolution | S27 S57 | Terminal transfer/design | Proposed food-yeast or abiotic classroom dataset |
| S75 | Mixing vessel, agitation power and scale-up | S07 S31 | S84 | Proposed stirred-vessel and fermentation teaching line |
| S76 | Utility capacity, operating cost and resource trade-offs | S10 S16 S36 | Terminal transfer/design | Design tutorial; compare vendor or independently measured duty when available |
| S77 | Transport discretisation, CFD and finite elements | S32 S06 | Terminal transfer/design | Analytical or recorded teaching dataset |
| S78 | Depth filtration and throughput qualification | S24 S27 | Terminal transfer/design | Proposed food-yeast or abiotic classroom dataset |
| S79 | Shell-and-tube configuration and fouling | S15 S16 | Terminal transfer/design | Design tutorial; compare vendor or independently measured duty when available |
| S80 | Second-law limits and phase boundaries | S36 S38 S40 | Terminal transfer/design | Tutorial or independently sourced equilibrium data |
| S81 | Turbulent velocity profiles and wall stress | S05 S08 | Terminal transfer/design | Hydraulic loop or independent water-column demonstration |
| S82 | Constant-rate filtration and terminal pressure | S24 | Terminal transfer/design | Design tutorial; compare vendor or independently measured duty when available |
| S83 | Sphere drops and convective analogies | S54 S49 | Terminal transfer/design | Proposed transport demonstration |
| S84 | Mixing time, heat production and scale evidence | S57 S72 S75 | Terminal transfer/design | Proposed food-yeast or abiotic classroom dataset |
