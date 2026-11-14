# Security policy

## Supported versions

APS is a research project with a public static investigation app and a separate local Python/OPA implementation. It has no supported production release or LTS branch. The current `main` branch is the candidate for best-effort investigation. Historical experiments, deployed snapshots and package-version metadata are not maintenance commitments. No security response SLA is established. Do not use this sandbox as a production safety barrier.

## Scope and data

The browser app makes illustrative comparisons; it does not call the Python gateway, authorize a purchase or submit discussion notes to a backend. Notes remain in memory unless a visitor explicitly saves a browser copy or downloads an export. An export may contain the visitor's free text; review it before sharing. The local research implementation has separate credentials, policy, persistence and receipt boundaries described in the [threat model](docs/THREAT_MODEL.md) and [governance architecture](docs/GOVERNANCE_ARCHITECTURE.md).

Report incorrect security claims, unsafe static publication, exposed secrets, unintended network access, and violations of the declared gateway boundaries. An illustration's documented omission is not evidence that the omitted protection exists in production.

## Private reporting

Do not post vulnerability details, exploit payloads, keys or sensitive evidence in public issues or PRs. Use GitHub's [private vulnerability report](https://github.com/SafetyMP/Agentic-Process-Safety/security/advisories/new), available under Security → Advisories → Report a vulnerability. Private vulnerability reporting was confirmed enabled through GitHub's authenticated API on 2026-11-14. This verifies the setting, not end-to-end intake, maintainer acknowledgment or a response SLA. No alternate confidential project intake is verified. If the option becomes unavailable, retain the report privately; a public issue may request only private-reporting enablement without vulnerability details.

In a private report include affected revision, app or research component, environment, synthetic reproduction, impact and suggested mitigation. Never test live third-party services or purchasing systems. Maintainers should acknowledge privately, investigate, coordinate a fix/advisory and agree disclosure timing with the reporter. This is an intended process, not a staffed service. Testing confidential intake remains an owner task; see the [current owner decisions](docs/open-source-readiness.md#current-owner-decisions).
