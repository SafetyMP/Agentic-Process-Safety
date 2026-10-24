# Phase 2 operator workflow

## Setup and verification

Use the existing source checkout with Python 3.11+, Node 22.18+ and OPA 1.x on `PATH` (tested with OPA 1.20.2). Install OPA using your platform's official distribution; see [OPA](https://www.openpolicyagent.org/docs). No fallback evaluator exists.

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.lock
npm ci
export PYTHONPATH=packages/engine:packages/governance
mkdir -p artifacts/phase2
bash scripts/verify.sh > artifacts/phase2/full-verification.log 2>&1
```

The script runs every Phase 1 and Phase 2 test, TypeScript checking, governed legacy demo, JSON/CSV commands, deterministic report comparison, Rego checking, policy-case simulation, proposal trace generation, HTTP integration, public-key receipt verification and the 200-sample benchmark. Tests that open loopback listeners need an environment allowing local sockets.

```sh
.venv/bin/python -m aps_governance.demo --audit-dir artifacts/phase2
.venv/bin/python -m aps_governance.cli simulate-policy --bundle policies/v1 --cases policies/v1/cases.json --out artifacts/phase2/policy-simulation.json
.venv/bin/python -m aps_governance.cli trace artifacts/report.json --out artifacts/phase2/traceability.json
.venv/bin/python -m aps_governance.cli verify-receipts artifacts/phase2/authorization-receipts.json --public-key artifacts/phase2/receipt-public-key.txt
```

Demo credentials and keys are disposable and not exported. The Phase 1 report still has 96 unverified findings and zero approved requirements. The default traceability matrix has 16 proposals, not human approvals.

## Persistent local service

Create separate runtime, administrator and agent-client locations. `init` refuses an existing runtime or existing key/credential files; do not overwrite a prior sandbox's evidence.

```sh
.venv/bin/python -m aps_governance.cli init --runtime .aps-runtime --admin-key .aps-admin/key.json --clients .aps-clients --task procurement-task --sandbox-bootstrap
.venv/bin/python -m aps_governance.cli serve --runtime .aps-runtime --bundle policies/v1 --port 8765
```

Keep `.aps-admin/key.json` outside the execution service's filesystem access. Give an agent only its own `.aps-clients/<actor>.json`; keep other tokens inaccessible. The current provisioner supports one task/identity set per database. A new task defaults to a five-minute lifetime; the disposable integration runner creates fresh ones automatically.

Send `POST /v1/call` with `Content-Type: application/json` and `Authorization: Bearer <own-token>`. The request contract is `schemas/governance-request.schema.json`. Use a fresh random nonce and request ID per attempt. The orchestrator first calls `delegate_mock` with its depth 0, current version, target worker and value 0. A worker calls only its own `<agent>_mock` at depth 1 with the current state version, empty target, and value 0 except demand (the admitted demand input). The resource is `procurement:<task-id>`. Context is the opaque reference issued by trusted provisioning. See `demo.py` for a complete client flow, including all five worker calls.

The API returns a schema-valid `governance-response` containing signed decision receipt and an allowed state result. Denied/review-required calls return `state=null`. Transport problems return a non-authorizing `governance-error`; persistence problems return HTTP 503. Do not interpret HTTP 200 as permission: inspect the signed `decision` and `executed` fields.

## Human findings and policy promotion

1. Conduct the Phase 1 human workflow described in the main README. Do not invent or copy approval events. Generate a fresh Phase 2 proposal from the resulting report.
2. Review each selected requirement/control, including explicit gaps. Select rows in a review copy of the trace JSON; preserve IDs and digests. A revised text increments the requirement version and invalidates prior approval:

   ```sh
   .venv/bin/python -m aps_governance.cli revise-requirement trace.json REQ_ACTUAL_ID --text 'Specific enforceable requirement' --out revised-trace.json
   .venv/bin/python -m aps_governance.cli approve-requirement reviewed-report.json revised-trace.json REQ_ACTUAL_ID --admin-key .aps-admin/key.json --reviewer 'Actual reviewer' --reason 'Evidence and control-gap rationale' --human --out signed-trace.json
   ```

   Promotion fails unless the linked finding is Phase 1 `approved_requirement` and the full hazard/report digests match. Each row requires its own human approval; requirement signatures use the pinned administrator key.

3. Copy the policy to a new directory, increment its unique config version, and make the proposed control change. Extend policy cases and gateway tests for the changed behavior. Run simulation against baseline and candidate, inspect the decision differences, then run the full regression suite. Simulation has no side effects or activation authority.

   ```sh
   .venv/bin/python -m aps_governance.cli simulate-policy --bundle policies/v1 --cases policies/v1/cases.json --out baseline-simulation.json
   .venv/bin/python -m aps_governance.cli simulate-policy --bundle policies/v2 --cases policies/v2/cases.json --out candidate-simulation.json
   ```

4. An independent human administrator can activate the candidate after reviewing evidence:

   ```sh
   .venv/bin/python -m aps_governance.cli activate-policy --runtime .aps-runtime --admin-key .aps-admin/key.json --bundle policies/v2 --trace signed-trace.json --cases policies/v2/cases.json --reviewer 'Actual reviewer' --reason 'Reviewed change and regression evidence' --human
   ```

   The command re-executes candidate policy cases, requires passing allow/deny coverage, validates signed trace approvals, and signs an exact policy/trace/simulation manifest. It refuses used version IDs. Restart the gateway with the new bundle; the old snapshot fails closed as soon as activation commits. Reauthorize any action under the new policy. The `policies/v2` paths above are instructions for a future reviewed candidate; no v2 policy is activated during implementation.

## Spend review and escalation

For an amount above 500 and at most both spending caps, finance receives `review_required`; no approval or order is created. An independent human may grant the exact finalized purchase within the pending deadline:

```sh
.venv/bin/python -m aps_governance.cli approve-spend --runtime .aps-runtime --admin-key .aps-admin/key.json --task procurement-task --reviewer 'Actual reviewer' --reason 'Specific purchase evidence' --human
```

Finance must retry with a fresh nonce; purchase then requires the gateway-generated, unexpired approval and exact state. An expired pending review escalates on the next request and cannot be approved late. Inspect the task/review audit state offline and provision a new task after resolving the issue; no background messenger or automatic authorization is provided.

## Evidence interpretation

`artifacts/phase2/enforcement-latency.json` reports 100 cached allowed calls and 100 policy-denied calls with median, nearest-rank p95/p99, platform and measurement scope. These timings include real OPA process launch; they are not production SLAs or fresh-purchase throughput. `integration-latency.json` measures 10 loopback HTTP calls (five delegations and five workers). Receipt signatures can be verified with the exported public key; retain an independently trusted chain head/count if truncation detection is required.
