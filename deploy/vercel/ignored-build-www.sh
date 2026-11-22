#!/usr/bin/env bash
# Vercel Ignored Build Step — proyecto www estatico (Root: apps/padelnexus-web)
# Salida 0 = NO desplegar | Salida distinta de 0 = desplegar

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

PREV="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"
CUR="${VERCEL_GIT_COMMIT_SHA:-HEAD}"

if ! git rev-parse --verify "${PREV}^{commit}" >/dev/null 2>&1; then
  exit 1
fi

if git diff --quiet "${PREV}" "${CUR}" -- apps/padelnexus-web; then
  exit 0
fi

exit 1