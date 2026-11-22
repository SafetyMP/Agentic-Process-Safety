# Reproduce the APS OpenTelemetry wheelhouse

Run from the repository root on macOS with Python 3.11+ and pip. The checkout supplies the original six-package hash lock and provenance manifest. Fetch the pure-Python wheels once on a connected machine. Pip checks each downloaded file against the committed SHA256.

```sh
python3 -m pip --isolated download --index-url https://pypi.org/simple --only-binary=:all: --no-deps --require-hashes -r dependencies/otel-wheels/requirements.lock --dest dependencies/otel-wheels
```

For a disconnected machine, transfer the six downloaded `.whl` files to the same directory in a checkout of the same revision. They are local build inputs and Git ignores them. The manifest lists each filename, upstream URL and digest.

Run the standalone check offline, without installing the full research runtime:

```sh
APS_PYTHON=python3 bash scripts/verify-otel-wheelhouse.sh
```

The verifier compares the exact file set and bytes with the manifest and lock, installs into a new temporary environment under `/private/tmp`, and checks dependency consistency, versions and a real SDK export. The printed evidence directory contains `export-verification.json` and `spans.json`. Expect six packages and two linked spans with the child's event. A fresh experiment requires the additional [Phase 3 setup](../../docs/PHASE3_OPERATIONS.md).
