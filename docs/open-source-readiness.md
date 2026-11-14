# Open-source readiness and maintenance

This page separates the **current observed repository state** from the retained 2026-10-24 readiness audit. The [vision](VISION.md), [user guide](USER_GUIDE.md), [documentation map](README.md) and [contribution guide](../CONTRIBUTING.md) describe the current APS project. A public repository and successful deployment do not establish license authority over every imported item, operational safety or a staffed support service.

## Current observed state — 2026-11-14

Authenticated GitHub inspection for `SafetyMP/Agentic-Process-Safety` found the following. These observations are dated; settings may change and should be checked again before a release decision.

| Area | Observed state | Remaining boundary |
| --- | --- | --- |
| Identity and publication | Public repository, default branch `main`, Apache-2.0 license metadata, canonical [Pages app](https://safetymp.github.io/Agentic-Process-Safety/). | Public visibility is not a legal or safety clearance. |
| Guided experience | [PR #32](https://github.com/SafetyMP/Agentic-Process-Safety/pull/32) deployed as `3ddc4ae9a0dc42c5af98fa7818121cf18a1b364f`; [run 43645203614](https://github.com/SafetyMP/Agentic-Process-Safety/actions/runs/43645203614) succeeded. The strict postdeployment gate, 233 hosted Linux checks, 233 live checks, seven capture reviews and nine published-file hash comparisons passed. | This receipt applies to that release, not later source changes. It does not measure learning or operational effectiveness. |
| Community entry points | Issues enabled, Discussions disabled; GitHub community profile reported 100%. | The profile checks file presence, not support quality or response time. Use the issue forms and [support guide](../SUPPORT.md). |
| Security reporting | GitHub private vulnerability reporting enabled. | Enabled intake does not verify staffing, acknowledgement time, or a tested reporting exercise. Follow [SECURITY.md](../SECURITY.md). |
| Secret protection | Secret scanning and push protection enabled. | These are configured protections, not an exhaustive secret-free or history-clean attestation. |
| Dependency maintenance | Version-update configuration exists; Dependabot security updates were disabled at inspection. | Maintainers must assess security-update enablement and review advisories, lockfiles and offline wheels. This refresh does not enable automatic dependency updates or merge them. |
| Code scanning | Latest observed main CodeQL checks passed. | A passing scan has bounded coverage; it does not replace threat review or prove absence of vulnerabilities. |
| GitHub discovery | Homepage points to the app. On 2026-11-14, the description was updated and verified to explain workflow risk, control comparison, causal paths and human recommendations tied to evidence; 17 topics include `assurance` and `human-in-the-loop`. No custom social-preview image was configured at inspection. | These are applied GitHub metadata changes, not publication of this documentation revision. Metadata availability and meaningful descriptions do not guarantee search indexing, ranking or agent retrieval. See [search visibility](SEO.md). |

## Current owner decisions

- Confirm rights to project contributions, source data, generated material, screenshots and third-party distributions. Preserve dependency notices and any conflicting legal terms. The original audit's licensing limitations remain applicable.
- Maintain and exercise confidential security intake, establish accountable responders and truthful response expectations, and verify conduct-reporting routes. Do not infer staffing from an enabled GitHub setting.
- Verify current default-branch rulesets, required checks, bypass permissions, Actions permissions and the Pages environment against the actual maintenance workflow. Their complete configuration is not certified by the observations above.
- Assess enabling Dependabot security updates and monitor dependency advisories, including separately bundled wheels. Package publication and supported-version commitments require their own reviewed release process; both npm workspaces remain private.
- Preserve research blinding and exposure records, unverified findings, proposed requirements and pending human risk decisions. Browser discussion-ready status is not a human safety approval.

## Current validation workflow

Use `node scripts/verify-repository-readiness.mjs` and `node --test scripts/verify-repository-readiness.test.mjs` for local documentation and community-file checks. Follow [current development checks](DEVELOPMENT_REFERENCE.md#current-development-workflow) for the app, and the source-bound predeployment/postdeployment verifiers for release evidence. Local checks cannot certify remote settings, rights, support staffing or safety suitability.

New documentation, metadata or discovery assets must be checked as their own revision. The source-bound receipt for PR #32 remains historical once those source bytes change; preserve it rather than relabeling it as evidence for a new release.

## Historical readiness audit — 2026-10-24

The original audit below is retained for provenance. Its initial empty-checkout observations, pending publication statements, stale-manifest failures, then-current test counts and owner checklist describe that earlier work. They are not statements that today's repository lacks Git history, lacks a deployment or still has private reporting disabled. The current observed state above supersedes those time-sensitive descriptions; unresolved rights and safety questions remain unresolved.

<details>
<summary>Read the original readiness review and reconciliation record</summary>

Review date: 2026-10-24. Initial local review followed by authenticated remote reconciliation for a draft PR; release remains pending owner decisions. This is a research prototype, not certified industrial software. Hazards remain unverified, controls proposed, and human approvals pending. No remote settings, intellectual-property rights or safety suitability are certified.

## Inspection and prioritized findings

| Priority | Before | Implemented / remaining |
| --- | --- | --- |
| P0 | No root license or package license metadata | Complete official Apache-2.0 LICENSE added at the user's direction; npm root/workspace and corresponding lock entries declare Apache-2.0. Rights confirmations below remain pending. |
| P0 | Public disclosure and enforcement routes unspecified | SECURITY.md defines conditional GitHub private intake and no supported production versions; CODE_OF_CONDUCT.md provides behavior/enforcement expectations and an honest GitHub abuse route. Owner must establish confidential project intake. |
| P0 | Local publication set includes research, evidence and scratch outputs | Added ignore rules for machine metadata, common key/env files and scratch directories; no files deleted. Owner must review the actual proposed publication set, data rights and blinded review exposure. |
| P1 | Only existing main-push/manual Pages workflow | Separate PR/push/manual repository checks added, no deployment privileges or secrets. Existing pinned deployment workflow and registered verification files preserved. |
| P1 | No contribution/support/issue/PR path | Added CONTRIBUTING.md, SUPPORT.md, two issue forms, disabled blank issues and a PR checklist. README links community files and rights limits. |
| P1 | Dependency update maintenance unspecified | Bounded npm/pip weekly and Actions monthly Dependabot PRs, maximum three per ecosystem, no automatic merge, reviewers, credentials or insecure external execution. |
| P2 | No consistency check for these deliverables | Added readiness verifier and mutation-based negative tests for links, license, metadata, forms and automation. Remote availability and legal review cannot be tested by it. |

The initial git inspection, before remote reconciliation, found branch main with **zero commits, zero tracked files and no remotes**. At that initial snapshot all source was untracked; no existing root legal terms were found. README homepage names safetymp/Agentic-Process-Safety, but that is documentation, not verified remote identity. Previous README deployment/run claims are retained historical evidence, not new live verification. There is no local commit history to scan or rewrite. This review did not push, publish, change visibility, configure GitHub settings, create issues or alter the installed harness.

## Licensing and material review

LICENSE was downloaded verbatim over TLS from the official Apache text, including all nine sections and the appendix. The appendix placeholders are part of the official text, not fabricated copyright attribution. The license applies to project-owned contributions offered here; it does not relicense separately licensed dependencies or establish authority over imported data. No holder name, corporate approval or invented NOTICE was added. Python metadata is deliberately unchanged: pyproject.toml is protected by the existing production byte mapping. A future owner-reviewed baseline update is needed for Python packaging license metadata before package publication. Both npm packages remain private.

The six bundled wheels in dependencies/otel-wheels each contain an embedded license/notice entry. Their bytes and notices are preserved; dependency metadata is not a complete compatibility review. The owner must inventory transitive npm/Python dependencies, binary distribution obligations, required attribution and any upstream NOTICE material before redistribution. The complete Apache license does not authorize third-party trademarks.

Sensitive-material inspection covered nonignored untracked files below 2 MB using private-key-header, GitHub-token and AWS-access-ID patterns; no matches were found. No matching contents were printed. This is a limited pattern review, not a secret-free attestation: ignored artifacts, .harness archives, local environments, databases, archives/wheel internals, larger files and any remote/history were not exhaustively scanned. Scratch runs and SQLite databases exist locally; blanket staging or publication is inappropriate. Ignore rules do not remove already-published material or prove sanitization. Review docs/operator-publication, docs/verification-evidence, screenshots, wheel provenance, fixture/source snapshots and pilot records for identities, operational data, confidential details and redistribution rights. No history rewrite was performed. If exposure is discovered, revoke/rotate affected credentials and coordinate remediation privately.

Preserve the pilot package and solo execution results. All reviewer assignments, conflict/exposure checks, independent reference authoring, human risk acceptance and go/no-go approvals remain pending actual human work. Publishing repository documentation can expose reference answers: owner must assess the complete public set and mark exposed candidates honestly; merely distributing the blind ZIP does not erase prior exposure. No pilot file was changed for this task.

## Automation design

repository-checks.yml uses ordinary pull_request events on GitHub-hosted runners with contents: read, credential persistence disabled, full commit SHA action pins inherited from the existing reviewed workflow, timeouts and cancellation of superseded checks. It has no untrusted event-string shell interpolation, privileged PR events, secrets, deployment, artifact execution or automatic merge. npm/pip installation still executes dependency code in an ephemeral runner, so dependency changes require review. Avoid self-hosted runners for public PRs. New checks cover readiness, root TypeScript, frontend snapshots/production integrity/lint/types/tests/build/static safety and Python engine tests on Ubuntu's Python 3.12. They do not replace complete OPA governance, Phase 3 or retained real-browser evidence checks documented in README.

Existing deploy-pages.yml already pins Actions, limits build permissions and separates Pages/id-token privileges into an environment-bound deployment job. It remains unchanged because it participates in source-bound evidence. Owner follow-up: assess checkout credential persistence, build/deploy timeouts, environment protection and trusted main-branch review through an explicit reviewed baseline/evidence refresh. Do not weaken its tests. Dependabot cannot refresh offline wheels or prove requirements.lock and pyproject consistency automatically; review related updates and regenerate hash manifests only through the existing wheel verification procedure.

## Pending owner checklist

- [ ] Confirm the actual repository identity, default branch, intended public scope and license authority for every project-owned file. Resolve employer/client, contributor, source-data, screenshot, generated/AI material and third-party obligations before release; preserve conflicting legal terms and seek qualified review where unresolved.
- [ ] Review an explicit publication allowlist, including archives and prior remote branches/tags/logs; scan the actual full history and proposed tree privately. Exclude operational data, keys and confidential pilot material. Preserve original local evidence; never blanket-stage the workspace.
- [ ] Establish staffed confidential security and conduct routes, truthful contacts, response expectations and backup coverage. Enable and test GitHub private vulnerability reporting with an authorized reporter; update SECURITY.md only after verification. No private project route is currently confirmed.
- [ ] In Settings → Rules → Rulesets, protect the default branch: PR review, stale approval dismissal, latest-push approval where appropriate, resolved conversations, blocked force pushes/deletion, and narrowly reviewed bypass permissions. Choose an independent reviewer when available; a solo project must disclose inability to supply independence. Do not fabricate CODEOWNERS or assignees.
- [ ] Run the new workflow on the actual repository and select the observed required checks (job names: Readiness and frontend, Python engine). Require the existing deployment build and applicable OPA/Phase 3/browser evidence gates through the actual review process. Confirm exact displayed status names before ruleset selection; required checks do not appear merely because this document names them.
- [ ] Set Actions default token read-only, restrict allowed Actions and full SHA pins, require approval for outside contributors as appropriate, protect the github-pages environment and review repository/workflow permissions. Review changes to .github and verification gates deliberately.
- [ ] Verify dependency graph and Dependabot alert/security-update availability and enablement, plus version-update PR behavior after merging configuration. Monitor npm/pip/Actions advisories and bundled offline wheels; do not enable automatic merge by default.
- [ ] Confirm secret scanning and push protection availability for the actual visibility/plan. GitHub documents free automatic public secret scanning; private/internal organization coverage may require GitHub Secret Protection. Do not assume coverage or enable paid services without separate authorization. No scans/settings were enabled here.
- [ ] Confirm release branch, source-data rights, dependency notices/SBOM, clean install, full governance/Phase 3 and source-bound browser evidence before publishing. Publish packages only through a separately reviewed release process; npm private flags remain set. Set supported versions only after an actual maintenance commitment. Retain pending human safety gates.

## Validation

Run from the repository root: `node scripts/verify-repository-readiness.mjs` and `node --test scripts/verify-repository-readiness.test.mjs`. The checker validates scoped local links/anchors, complete-license markers, npm/lock agreement, community files/forms, dependency ecosystems and bounded workflow trust/pins. It is a lightweight structural check, not a general YAML parser, vulnerability scanner, legal clearance or remote settings audit. Negative tests deliberately break links, metadata, forms, license completeness, action pins and permissions. Execution results: readiness checker and six deliberate mutation cases pass; Ruby YAML parsing passes for all new YAML files; fixture and production-integrity checks pass (70 protected files unchanged). Frontend lint/types, 111 tests, build and static contract pass. The complete `bash scripts/verify.sh` exits 0: 108 Python tests, seven Node tests, types, schema/determinism checks and OPA/governance demo/receipt checks pass. Logs are local ignored artifacts: artifacts/repository-readiness-regression.log and artifacts/repository-readiness-static.log.

The unchanged `node scripts/verify-linux-ci-evidence.mjs` exits 1 with “Stale or incomplete source”: package license metadata changes invalidate the retained source manifest even though the built frontend bytes remain unchanged. This is an expected evidence gap, not a pass. No verifier, source manifest, review record or historical capture was rewritten to hide it. An authorized later publication must obtain fresh Linux run/artifact/capture review; no new browser run, remote workflow run, full Phase 3 run or wheelhouse installation is claimed by this task. artifacts/repository-readiness-linux-evidence.log retains the failure. The initial attempted Python license metadata change was reverted after the production guard rejected it; the rerun passed without baseline edits.

Official LICENSE SHA256: cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30.

### Independent closeout inspection (2026-10-24)

Fresh local readiness verification and its six mutation cases pass. Direct comparison with the retained Linux identity (run 40124958497, attempt 1, commit `556d3d61bfcf6f237c08c3338caf6dc6006bcc4c`) finds exactly three changed source entries: `package.json`, `package-lock.json`, and `apps/aps-demo/package.json`; no source entries are added or missing. The complete current dist inventory and hashes match the retained identity. This confirms stale source binding, not current browser acceptance. At that closeout snapshot Git still had no tracked files or commits and no remotes; `git diff` therefore cannot reconstruct the prior worker's change set. The comparison establishes present bytes against retained evidence, not authorship or a complete before/after audit.

Owner refresh, only under separate authorization for publication/deployment: reconcile an explicitly reviewed publication set with the actual remote history; preserve the pinned runner/workflow and source-bound gate. Obtain a successful current-source Linux run of `.github/workflows/deploy-pages.yml` (this workflow includes deployment), retain the original `aps-browser-qa-<commit>-<attempt>` ZIP with its authenticated GitHub artifact digest, and check commit/run/attempt/workflow identities plus complete source/dist manifests. Inspect all seven genuine captures (`overview`, `hazop`, `governance`, `simulator`, `assurance`, `mobile-light`, `mobile-dark`); record actual observations, hashes, reviewer, review time and limitations in `.harness/linux-ci-review.json`, retaining historical evidence separately. Place the matching original ZIP at `.harness/linux-ci-evidence.zip` and require the unchanged `node scripts/verify-linux-ci-evidence.mjs` to pass against the reconciled current checkout and authenticated metadata. See [the evidence field specification](STATIC_DEMO_CI_HANDOFF.md) for the review schema; its historical publication authorizations do not authorize actions in this closeout. If access, artifact retention or source reconciliation prevents verification, leave browser acceptance pending and report that exact blocker. No dispatch, deployment, push, evidence rewrite or human approval is performed or implied here.

Bounded inspected readiness inventory: `README.md`, `LICENSE`, `CONTRIBUTING.md`, `SUPPORT.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.gitignore`, both npm manifests and root lockfile; `.github/ISSUE_TEMPLATE/{bug,question,config}.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/dependabot.yml`, `.github/workflows/repository-checks.yml`; `scripts/verify-repository-readiness{,.test}.mjs`; this audit. Browser diagnosis additionally reads the retained identity and existing gate/handoff. This closeout changes only this audit; prior full regression claims above remain prior execution evidence, not a new full-suite run.

## Official sources consulted

These are exact official source URLs consulted for this review; GitHub may redirect older documentation paths to these canonical pages.

- Community health file placement and issue form recognition: https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories
- Rulesets, review and required-check options: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets
- Actions least privilege, untrusted input and commit pinning: https://docs.github.com/en/actions/reference/security/secure-use
- Private reporting requires owner/admin enablement: https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository
- Dependabot ecosystem, schedule and PR limit configuration: https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference
- Dependency graph visibility and manifest coverage: https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-graph
- Secret scanning scope and plan-dependent availability: https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning
- Official complete license text: https://www.apache.org/licenses/LICENSE-2.0.txt

## Verified remote reconciliation and draft PR scope

Authenticated GitHub connector metadata and existing gh credentials independently identified repository `SafetyMP/Agentic-Process-Safety` (ID 1430231911), public, default branch `main`, with push access. Its head was `556d3d61bfcf6f237c08c3338caf6dc6006bcc4c`; 162 of 168 remote tracked files matched local bytes, including all protected production files and pinned deployment/verification gates. No open PR or extra branch existed at inspection. The remote already carries complete Apache-2.0 terms; they are preserved byte-for-byte (the local copy differed only by a leading blank line), with no legal conflict or third-party notice replacement.

The proposed tree starts from that remote commit. It includes only community documents, issue forms/PR template, bounded Dependabot and separate repository CI, readiness verifier/tests, scoped ignore additions, this audit, README onboarding/evidence-limit paragraphs, and npm manifest/lock license fields. Existing README content remains on the remote baseline. Unpublished pilot links and evidence narratives are excluded. No pilot, private data, wheel binaries, scratch, operational artifacts or harness state are added. Earlier wheel and local regression observations above describe the local review, not newly published material or current PR execution.

The draft PR performs no deployment, merge, visibility/settings change or human approval. Default-branch protection, rights review, confidential intake and release evidence remain owner gates. Retained Linux browser evidence remains stale after license metadata changes; the pinned gate is unchanged. No current browser run or remote CI success is claimed. Validation on the actual proposed tree is recorded in the draft PR and the local operational handoff; historical results above remain explicitly historical.

Current proposed-tree checks pass: readiness verification, a positive-tree test and eight deliberate mutation cases, seven root simulator tests, root/frontend types, frontend lint, 111 frontend tests, fixture integrity, all 70 protected production files, build and static contract. The first simulator attempt exposed a missing Python environment; the new frontend CI job now installs requirements into a venv before invoking the Python-backed simulator tests. A mutation test rejects omission of that prerequisite. Dependencies were installed with writable workspace-local caches. Full `verify.sh` was not rerun because it includes a benchmark, outside this task's scope; pinned scripts remain unchanged. The current local Linux evidence verifier still rejects stale source binding. No deployment workflow was dispatched.

The full Python unittest discovery also passes on the proposed tree: 108 tests. These are local macOS results, not a claim about Ubuntu CI. The initial workspace Git metadata was backed up privately. Its configured filesystem policy denies writes to the root `.git/config` and `.git/FETCH_HEAD`, so connecting the original workspace remains blocked; the isolated remote-based checkout retains the valid origin/history and proposed branch. No permission escalation or alternate write method was used.

The first live PR run passed the Python engine job but the simulator tests failed closed with `policy_unavailable_or_error`: GitHub runners lacked OPA. The new workflow now installs OPA v1.21.4 before those tests, verifies the Linux static binary against the official GitHub release asset SHA-256 `2ab571f367f293bb19523b76f92f1945bbf245003392c7f392903f95c2b9b630`, and adds it to PATH. A mutation case rejects loss of checksum verification. Release metadata was queried directly from `open-policy-agent/opa` via authenticated GitHub API. This prerequisite fix changes only the new readiness workflow, never the pinned deployment or policy gates.


</details>
