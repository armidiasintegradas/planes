#!/usr/bin/env bash
set -euo pipefail

# Offline-capable after Docker image cache is populated. No hosted credentials.
# Runs the same synthetic RLS matrix as GitHub Actions, without exposing ports.
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for this local database test." >&2
  exit 2
fi
name="planes-rls-validation-$$"
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM

docker run --rm -d --name "$name" \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=planes_ci \
  -e POSTGRES_PASSWORD=synthetic_test_only \
  postgres:16 >/dev/null

ready=0
for attempt in $(seq 1 40); do
  if docker exec "$name" pg_isready -U postgres -d planes_ci >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then
  echo "Synthetic PostgreSQL did not start" >&2
  exit 1
fi

echo "Running isolated Planes Intelligence RLS matrix (synthetic data only)..."
docker exec -i "$name" psql -X -U postgres -d planes_ci -v ON_ERROR_STOP=1 \
  < tests/sql/intelligence-rls-isolated.sql
echo "RLS matrix passed. Test database will be destroyed."
