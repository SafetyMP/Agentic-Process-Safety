# Illustrative browser model

`simulation.ts` is a pure reducer: scheduling a timer does not supply time to policy decisions. The view must dispatch `timer` on each interval and clear its interval on pause/unmount. A paused timer action cannot advance state. `step` advances one logical stage; stage three evaluates a simulated purchase. Review suspends progression until an explicit approve/deny action. Reset and configuration clear prior events and injected faults.

Seeds are integers from 0 to 2147483647 (invalid input defaults to 1). Integer mixing selects a benign amount from 100–399; this is an intentionally different deterministic generator from the Python research workload. No browser run is a replay or a recorded research trial. Event IDs have a `sim-` prefix and never assert receipt authenticity.

A has no checks. B checks actor/tool scope and spend. C additionally illustrates depth, approval, replay, expiry and context checks. Conflict review is an **illustrative addition**, linked to `GAP-CONFLICTING_OBJECTIVES`; there is no production objective arbitration control or test. UI links should resolve story control IDs through frozen requirements to their hazard IDs and source test selectors, showing gaps explicitly. Passing browser tests does not execute those production tests.

All decisions and metrics are illustrative, not authoritative enforcement. The model performs no network activity, procurement, cryptographic signing, authentication or backend calls. Frozen experimental metrics must be rendered from fixtures independently of this state.
