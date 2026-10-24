# Phase 3 assurance recheck

The prior `artifacts/phase3/acceptance-ffrAJ54B` failure was a real
supplier-injection subprocess timeout in both Node executions. Its measurement,
trace, dashboard and report checks passed; failed test executions correctly
prevented acceptance. All prior evidence remains preserved.

Reproduction: `bash scripts/verify-phase3.sh` from the repository root.
Fresh output: `artifacts/phase3/acceptance-sf99nFBL`.
No implementation, assertion, timeout or verifier changes were needed. All nine
workflow stages exited zero and all 21 evidence acceptance checks passed.
The timeout did not recur; its cause remains unresolved, so this rerun does not
establish that the intermittent failure is fixed.

Bound logs record 108 Python regression tests, seven Node tests within that
regression, seven separately attested Node tests, and 43 focused Phase 3 tests,
all passing. The trusted verifier SHA256 remains
`8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15`.

Fresh seed 17 report: `artifacts/phase3/acceptance-sf99nFBL/report.md`.
Dashboard: `artifacts/phase3/acceptance-sf99nFBL/dashboard/index.html`.
Acceptance: `artifacts/phase3/acceptance-sf99nFBL/acceptance.json`.
Six internal samples yield detection mean 14161527.666666666 ns and
committed-denial containment mean 15076874.833333334 ns. Four counterbalanced
matched pairs yield incremental policy enforcement mean 148291322.75 ns.
Raw intervals, pair evidence sequences and setup are in dashboard/data.json
and the pinned run ledger. Missing internal samples remain A 10/10, B 9/9,
C 2/8 attack calls; unsafe mutations are A/B/C 10/6/0.

Containment covers simulated task state and delegated authority only. Policy
ablation excludes total governance stack cost; four pairs retain finite sample
and scheduler noise. Undetected cases, semantic goal gaps and physical truth
remain residual risks. Human risk gates remain unapproved. This is local
assurance evidence, not a controller completion receipt or complete safety proof.
The coordinator must independently recheck and validate its current receipt.
