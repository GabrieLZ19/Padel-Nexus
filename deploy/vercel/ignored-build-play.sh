#!/usr/bin/env bash
# Vercel Ignored Build Step — proyecto play (Root Directory: apps/web)
# Salida 0 = NO desplegar | Salida distinta de 0 = desplegar
# https://vercel.com/docs/deployments/configure-a-build#ignored-build-step

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

PREV="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"
CUR="${VERCEL_GIT_COMMIT_SHA:-HEAD}"

if ! git rev-parse --verify "${PREV}^{commit}" >/dev/null 2>&1; then
  # Primer deploy o historial shallow: construir
  exit 1
fi

if git diff --quiet "${PREV}" "${CUR}" -- apps/web packages/; then
  exit 0
fi

exit 1