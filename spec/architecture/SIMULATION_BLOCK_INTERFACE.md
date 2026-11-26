# Simulation block interface

The public contract is in contracts/block.ts. An instance has lifecycle new → ready → running ↔ paused → disposed. Analytical blocks calculate in ready/paused; start/advance on an algebraic block returns UNSUPPORTED. On init validate manifest and version then load defaults atomically. Start/resume does not reset. Pause finishes the current model step; reset restores scenario defaults and zero time, begins a new run, clears active history and emits reset. Dispose is idempotent and cancels workers and subscriptions. Any later operation rejects with DISPOSED.

Units and metadata travel with results. Input batches have an optional expected revision for optimistic concurrency. A revision is allocated only after successful validation and commit. Calculation response includes matching revision, namespaced output IDs, status by output, scientific data origins and unit map. Calculation may legitimately return null for unmodelled quantities. Errors are coded, recoverable and distinguish bad input, missing model/asset, incompatible version, empty data, solver failure and cancellation. Commands from hosts carry protocol, exact version, requestId and instanceId; acknowledgements and events are separate. Retry cache keyed by host session and requestId prevents repeated steps or submissions. No state mutation from an obsolete acknowledgement.

Save state includes values, active mode, dynamic state vector, clock/step, pending scheduled events, solver version, seed and generator state, history policy, model/property/correlation versions, learning activity snapshot and any hashes of external data. Save/restore is round-trip deterministic for the declared supported solver build. For cross-browser floating point differences assert scientific tolerances. Loading a scenario validates required anchors/outputs, locks and ranges before initialisation; locked values cannot be changed by learner input. The host may be absent. Activity completion comes from a host-neutral predicate, never a guessed page view.

| Event | Minimum payload besides common envelope |
|---|---|
| parameter.changed | changed IDs, prior and new SI values, source, revision |
| calculation.completed | outputs, validity, revision and simulated time |
| simulation.stateChanged | from, to, simulated time, run ID |
| validity.changed | affected output, rule IDs, facts, previous and new state |
| error | code, severity, affected input/step, recoverability |
| activity.completed | activity/version, criterion, evidence refs and timestamp |
| data.exported | content kind, schema version, row count, user action; exclude raw personal data |

Offline initial site can use the same interface in-process. A static iframe calls it through a constrained adapter. Future Qt Master can load the same versioned bundle in a supported WebEngine view or use a local browser page. Runtime may compare recorded telemetry but has no actuator methods. Physical operation, PLC command authority, interlocks and operating recipes belong in the existing equipment system. The precise desktop adapter depends on review of the actual Master/Author build.
