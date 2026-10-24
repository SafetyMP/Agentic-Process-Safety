# Authorized wheelhouse milestone

Inspected current untracked files, Phase 3 plan, replacement checkpoint, acceptance,
report, replacement step 2, telemetry implementation and telemetry tests before
editing. Preserved all prior evidence. No nested controller or agents launched.

Downloaded six authentic wheels from PyPI using binary-only resolution. Versions,
official file origins and independently compared PyPI SHA256 values are recorded
in `dependencies/otel-wheels/manifest.json`; hash-locked offline requirements and
installation instructions are adjacent. SDK/API are 1.38.0. Updated the project's
optional telemetry dependency group and reproducibility version list. Installed
these six packages offline into the project venv; no existing packages replaced.

Fresh `bash scripts/verify-otel-wheelhouse.sh` passed: isolated offline pip install
with hashes, dependency check, exact installed versions and genuine SDK export of
two parent/child spans with event verification. Retained evidence directory:
`artifacts/phase3/wheelhouse-verification-9ldj21rj/`.
Four telemetry tests passed with no skips; log:
`artifacts/phase3/wheelhouse-step1/telemetry-tests.log`.
The initial metadata fetch hit the system Python missing CA configuration;
using pip's bundled certificate authority store with certificate validation
enabled resolved it. No TLS verification bypass was used.

Trusted verify.sh remains SHA256
`8deb958ae8d193957017d878d8e87293c35c49b89d326506efcc87beb6eb0d15`.
No full-workflow pass status or controller receipt is claimed. Pending work:
race/outage adapters, honest latency/overhead and attestation provenance,
complete tracing validation and fresh all-workflow acceptance. Zero-demand
timeout remains unreproduced; prior worker bind restriction remains distinct.
