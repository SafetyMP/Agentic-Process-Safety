#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
exec "${APS_PYTHON:-.venv/bin/python}" scripts/verify_otel_wheelhouse.py
