# APS documentation map

[Project overview](../README.md) · [Live app](https://safetymp.github.io/Agentic-Process-Safety/) · [User guide](USER_GUIDE.md) · [Vision](VISION.md)

APS now centers on a guided investigation: compare the same request, inspect or change a condition, and form an evidence-linked position. The browser experience and the Python/OPA research implementation are separate layers. Use the current guides below for navigation; use historical records to understand what a particular work unit actually established.

**Status key:** **Current guide** describes how to use or contribute to the present project. **Technical reference** describes a retained implementation contract or research method; results still need source-bound verification. **Historical record** preserves a dated plan, checkpoint or acceptance boundary and does not establish the current release state. **Integrity contract** is an active machine-readable preservation boundary, not a document to refresh by rewriting its evidence.

## Start by intent

| Intent | Start here | Status |
| --- | --- | --- |
| Understand the project and run it locally | [Project README](../README.md) | Current guide |
| Explore the app and its nine cases | [User guide](USER_GUIDE.md) | Current guide |
| Test executive decisions, shift handoffs, replication and teaching on one build | [Walkthroughs and observation sheet](AUDIENCE_WALKTHROUGHS.md) | Moderator guide |
| Understand the problem, scope and unanswered research questions | [Vision](VISION.md) | Current guide |
| Navigate all documentation | [Documentation map](README.md) | Current guide |
| Develop or verify a change | [Development reference](DEVELOPMENT_REFERENCE.md) | Current workflow with separately retained historical notes |
| Contribute, report a bug or request help | [Contributing](../CONTRIBUTING.md) · [Support](../SUPPORT.md) · [PR template](../.github/PULL_REQUEST_TEMPLATE.md) | Current guides |
| Use a coding agent or cite the project | [Agent guide](../AGENTS.md) · [Citation metadata](../CITATION.cff) | Current repository metadata |
| Understand community and security expectations | [Code of conduct](../CODE_OF_CONDUCT.md) · [Security reporting](../SECURITY.md) | Current policies |
| Inspect publication and repository governance | [Open-source readiness](open-source-readiness.md) | Current guidance and dated observations; see its explicit limits |
| Inspect search and agent discovery | [Search visibility](SEO.md) | Current guide |

## Research and implementation references

These describe mechanisms and assumptions, not a replacement for the current app guide. The Phase 1/2/3 names identify research implementation layers.

| Topic | Document | Status |
| --- | --- | --- |
| Browser comparison, session and evidence contracts | [Browser domain](../apps/aps-demo/src/domain/README.md) | Technical reference |
| Frozen public data and source provenance | [Fixture documentation](../apps/aps-demo/src/fixtures/README.md) | Technical reference |
| HAZOP-inspired screening and human review | [Methodology](METHODOLOGY.md) | Technical reference |
| Engine layout and Phase 1 baseline | [Architecture](ARCHITECTURE.md) | Technical reference with historical baseline |
| Research gateway, credentials and policy boundary | [Governance architecture](GOVERNANCE_ARCHITECTURE.md) | Technical reference |
| Gateway setup, operation and policy workflow | [Phase 2 operations](PHASE2_OPERATIONS.md) | Technical reference |
| Experiments and source-bound assurance | [Phase 3 operations](PHASE3_OPERATIONS.md) | Technical reference |
| Assumed adversary, assets and remaining gaps | [Threat model](THREAT_MODEL.md) | Technical reference |
| Generated hazard/control/test mappings | [Traceability matrix](TRACEABILITY_MATRIX.md) | Technical reference; generated mappings do not imply approval |

## Browser design and release history

The current guided experience was deployed through [PR #32](https://github.com/SafetyMP/Agentic-Process-Safety/pull/32) on 2026-11-14. [Run 43645203614](https://github.com/SafetyMP/Agentic-Process-Safety/actions/runs/43645203614) binds that deployment to commit `3ddc4ae9a0dc42c5af98fa7818121cf18a1b364f`. This is a dated release reference; later changes need their own verification.

All entries in the following table are **historical records**. Read their failures, limitations and original approval state in context. Older statements such as “deployment unverified” or instructions for timer controls and the saved decision-brief interface describe those revisions, not the present guided app.

| Record | What it preserves |
| --- | --- |
| [Guided investigation improvements](APS_GUIDED_INVESTIGATION.md) | Latest guided interaction implementation and local acceptance scope |
| [Experience redesign plan](APS_EXPERIENCE_REDESIGN_PLAN.md) | Comparison, causal path and human-reasoning design proposal |
| [Redesign implementation](APS_REDESIGN_IMPLEMENTATION.md) | Original implementation receipt, including its then-unresolved checks |
| [Redesign release candidate](APS_REDESIGN_RELEASE.md) | Reconciliation and preservation requirements for that candidate |
| [Audience experience plan](AUDIENCE_EXPERIENCE_PLAN.md) | Earlier executive/technical journey design |
| [Continuity and saved decision briefs](CONTINUITY_IMPLEMENTATION.md) | Earlier PR #28 interface and its distinct saved-brief behavior |
| [Static demo plan](STATIC_DEMO_PLAN.md) | Initial browser scope and inspection |
| [Static demo acceptance](STATIC_DEMO_ACCEPTANCE.md) · [JSON record](STATIC_DEMO_ACCEPTANCE.json) | Incomplete acceptance state of that earlier work unit |
| [Static UI progress](STATIC_DEMO_UI_PROGRESS.md) | Partial initial interface implementation |
| [Simulation handoff](STATIC_DEMO_SIMULATION_HANDOFF.md) | Initial browser model implementation |
| [Browser QA work unit](STATIC_DEMO_BROWSER_QA.md) | Earlier browser qualification and its limits |
| [Linux CI handoff](STATIC_DEMO_CI_HANDOFF.md) | Earlier CI route and prerequisite state |
| [Publication handoff](STATIC_DEMO_PUBLICATION_HANDOFF.md) | Earlier remote publication prerequisites and observations |

## Research implementation history

All entries in this table are **historical records**. Their code may remain part of the research implementation, but a checkpoint is not evidence that a new source revision has passed its tests or that a pilot was completed.

| Record | Topic |
| --- | --- |
| [Phase 1 implementation](IMPLEMENTATION_PLAN.md) | Screening engine implementation and acceptance |
| [Phase 2 plan](PHASE2_PLAN.md) | Gateway design and inspected baseline |
| [Phase 2 acceptance](PHASE2_ACCEPTANCE.md) | Bounded gateway acceptance |
| [Phase 3 plan](PHASE3_PLAN.md) | Experiment and assurance milestones |
| [Evidence foundation](PHASE3_EVIDENCE.md) | Evidence primitive and initial limits |
| [Seeded workloads](PHASE3_WORKLOADS.md) | Reproducible input generation |
| [Runtime pilot](PHASE3_RUNTIME_PILOT.md) | Matched benign execution foundation |
| [Replacement checkpoint](PHASE3_REPLACEMENT_CHECKPOINT.md) | Dependency and timeout investigation |
| [Replacement step 2](PHASE3_REPLACEMENT_STEP2.md) | Trace correspondence checks |
| [Wheelhouse checkpoint](PHASE3_WHEELHOUSE_CHECKPOINT.md) | Offline dependency evidence |
| [Test attestation](PHASE3_TEST_ATTESTATION.md) | Local subprocess provenance |
| [Scope and context](PHASE3_SCOPE_CONTEXT.md) | Scope/context runtime milestone |
| [Response observation](PHASE3_OBSERVATION_CHECKPOINT.md) | Request-linked monotonic observations |
| [Approval expiry](PHASE3_APPROVAL_EXPIRY.md) | Expiry checkpoint |
| [Recursive delegation](PHASE3_RECURSIVE_DELEGATION.md) | Delegation checkpoint |
| [Pilot metrics](PHASE3_METRICS.md) | Evidence-derived metric boundaries |
| [Offline dashboard](PHASE3_DASHBOARD.md) | Retained evidence inspection |
| [Acceptance gate](PHASE3_ACCEPTANCE.md) | Executable evidence acceptance milestone |
| [Change regression](PHASE3_CHANGE_REGRESSION.md) | Content-triggered regression |
| [Goal conflict](PHASE3_GOAL_CONFLICT.md) | Bounded budget-conflict work unit |
| [Duplicate action](PHASE3_DUPLICATE_ACTION.md) | Duplicate purchase runtime adapter |
| [Technical report](PHASE3_REPORT.md) | Evidence-derived report generation |
| [Latency step](PHASE3_LATENCY_STEP1.md) | Focused timing measurement |
| [Outage checkpoint](PHASE3_OUTAGE_CHECKPOINT.md) | Matched local outage work unit |
| [Race checkpoint](PHASE3_RACE_CHECKPOINT.md) | Same-version purchase race |
| [Assurance recheck](PHASE3_ASSURANCE_RECHECK.md) | Retained failure and subsequent recheck |
| [Telemetry boundary](PHASE3_TELEMETRY.md) | Optional OpenTelemetry integration and limits |

## Integrity contracts and visual evidence

| Material | Status and interpretation |
| --- | --- |
| [Original production inspection](STATIC_DEMO_INSPECTION.json) | Integrity contract: exact original source pins; preserve the original mapping |
| [Approved production test additions](STATIC_DEMO_PRODUCTION_ADDITIONS.json) | Integrity contract: exact separately pinned additions |
| [Current README preview provenance](assets/README.md) · [comparison preview](assets/aps-comparison.jpg) | Dated visual evidence from the deployed guided app |
| [Continuity screenshot provenance](verification-evidence/aps-continuity/README.md) · [saved-brief capture](verification-evidence/aps-continuity/continuity-saved-brief.jpg) | Historical PR #28 evidence |
| [Redesign artifact hashes](verification-evidence/aps-redesign-20261114/artifact-hashes.json) · [layout checks](verification-evidence/aps-redesign-20261114/browser-layout-checks.json) | Historical redesign evidence; not current release receipts |
| [Desktop comparison](verification-evidence/aps-redesign-20261114/comparison-desktop.jpg) · [mobile comparison](verification-evidence/aps-redesign-20261114/comparison-mobile.jpg) · [failure path](verification-evidence/aps-redesign-20261114/failure-path.jpg) · [topology](verification-evidence/aps-redesign-20261114/topology.jpg) | Historical captures of the earlier redesign |

Generated private/local receipts under `.harness/` and `artifacts/` are intentionally not public documentation. A fresh release requires its actual source, workflow, original artifact, browser result and reviewed screenshot bindings. Do not change an old receipt to make it describe new work.

When adding documentation, link it from this map, identify whether it is guidance, a technical reference or a dated record, and update the relevant entry point. Preserve historical filenames and evidence unless a deliberate migration retains provenance and links.
