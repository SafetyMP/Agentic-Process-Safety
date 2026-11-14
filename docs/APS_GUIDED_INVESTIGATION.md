# APS guided investigation improvements

This work follows the first-time walkthrough of the deployed redesign at main `2232a5536347cad5cd35c32a3608c3c818d186d9`. The scope is presentation and local investigation: recommendation-driven next steps, a clear compare/change/explain sequence, concrete case-specific causal paths, and relevant hazard/control/evidence inspection. Existing model behavior, frozen fixtures, original protected source, saved session format, and operational authority boundaries remain intact.

Acceptance checks:

- A recommendation changes the next investigation panel. Information gathering records an unresolved evidence question; only an eligible, explicitly chosen fresh-approval exploration creates a hypothetical child. Neither reasoning nor readiness changes prior outcomes.
- Evidence attachments identify the actual selected run and modeled check, preserve authored notes, and survive navigation/save/export. Incomplete positions remain honestly incomplete.
- The first visit introduces both control bundles, offers a clear next action after comparison, exposes the 61/59 variation, and leads into a position. Dirty inputs never relabel retained results. Existing routes and history remain usable.
- Causal stages reflect each case's real inputs and modeled limits. Successful timing variations do not retain failure wording. Outcome styling distinguishes violated constraints, held boundaries, unresolved review and task status instead of treating execution as success.
- Supporting screens explain approval/quotation, browser/recorded context-stage, and objective/arbitration differences before broader source records. Exact recorded pairing and complete source data remain accessible.
- Desktop/mobile, light/dark, keyboard focus, accessible labels, static network behavior, immutable runs, saved sessions, and all nine cases retain regression coverage.

Implemented across all five app routes. The opening introduces the control bundles and coordinated task; the Case Lab guides a retained comparison through a timing variation into a position. Recommendations reflect the actual case and approval state, with their investigation response immediately below the choice. Modeled-check and recorded-event attachments preserve authored notes and identify their different evidence sources. Case-specific causal stages and constraint-based emphasis replace generic failure framing. Supporting pages explain the relationship to source records before exposing the full registers and traces.

Local verification on 2026-11-14:

- 303 frontend tests across 14 files, frontend lint/typecheck and production build passed.
- 233 built-site Chromium checks passed across all nine cases, retained comparisons, recommendation branches, reasoning/export/storage, supporting routes, keyboard operation, responsive sizes and both themes. No console/page errors or nonstatic requests were observed.
- Static publication and frozen fixture checks passed. The production boundary retained all 70 original files and the exact three prior test additions; all 25 mutation tests passed.
- 136 Linux-evidence verifier tests passed. The new candidate branch is explicitly allowlisted; the exact browser runner and its 233-check completion count are pinned without changing the deployment workflow or weakening artifact checks.
- Independent semantic and design reviews found no remaining blocking issues after correcting recommendations for current approvals. Independent visual review accepted all seven desktop/mobile captures. Independent infrastructure review verified all final pins, reran the 136 verifier tests, and found no weakened checks.

The browser checks and visual inspection establish the implemented behavior, not measured learning or operational decision quality. Follow-up actions remain illustrative evidence requests or hypothetical branches. The source-linked local receipts are under `.harness/guided-investigation-20261114/`; candidate CI and any deployment are separate states. Prior release receipts remain unchanged.
