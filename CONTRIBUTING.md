# Contributing

Start with [setup](README.md#setup-and-verification) and the [readiness audit](docs/open-source-readiness.md). This is a research sandbox with unverified hazards and no industrial safety approval.

Discuss substantial changes in a sanitized issue. Submit only work you have authority to license under [Apache-2.0](LICENSE); identify imported material and preserve third-party notices. No CLA or DCO process is established. Use [SECURITY.md](SECURITY.md) for vulnerabilities and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for conduct concerns.

Use focused branches and PRs describing the problem, behavior and actual validation. Use the root lockfile and `npm ci`. Run `node scripts/verify-repository-readiness.mjs`, `npm test`, `npm run typecheck` and frontend checks from the README. Python/policy changes require `bash scripts/verify.sh`; Phase 3 changes require `bash scripts/verify-phase3.sh` and its prerequisites. Report failures and missing prerequisites explicitly.

Keep pinned deployment and verification gates intact. Never replace recorded evidence with simulation. Do not post secrets, operational data or confidential reference answers. Preserve pilot blinding/exposure boundaries: exposed contributors cannot claim blinded independent review. Human assignments, approvals, ratings and signoffs remain pending until actual human work. Review is required before merge; response times are not guaranteed.
