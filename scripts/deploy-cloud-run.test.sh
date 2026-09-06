#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_TMP="$(mktemp -d)"
trap 'rm -r "$TEST_TMP"' EXIT

GCLOUD_LOG="$TEST_TMP/gcloud.log"
CURL_LOG="$TEST_TMP/curl.log"
export GCLOUD_LOG CURL_LOG

cat >"$TEST_TMP/gcloud" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail

printf '%s\n' "$*" >>"$GCLOUD_LOG"

case "$*" in
  "run services describe lam-api "*)
    printf '%s\n' 'https://lam-api.example.run.app'
    ;;
  "run services describe lam-web "*)
    printf '%s\n' 'https://lam-web.example.run.app'
    ;;
  "run services describe lam-admin-web "*)
    printf '%s\n' 'https://lam-admin-web.example.run.app'
    ;;
  "auth print-access-token")
    printf '%s\n' 'test-access-token'
    ;;
esac
MOCK
chmod +x "$TEST_TMP/gcloud"

cat >"$TEST_TMP/curl" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail

printf '%s\n' "$*" >>"$CURL_LOG"
printf '%s\n%s' '{"spec":{"routeName":"lam-web"}}' '200'
MOCK
chmod +x "$TEST_TMP/curl"

PATH="$TEST_TMP:$PATH" bash "$ROOT_DIR/scripts/deploy-cloud-run.sh" >/dev/null

grep -Fq 'run deploy lam-web' "$GCLOUD_LOG"
grep -Fq -- '--region=asia-northeast1' "$GCLOUD_LOG"
grep -Fq -- '--service-account=lam-cloud-run@lam-production.iam.gserviceaccount.com' "$GCLOUD_LOG"
grep -Fq 'auth print-access-token' "$GCLOUD_LOG"
grep -Fq 'https://asia-northeast1-run.googleapis.com/apis/domains.cloudrun.com/v1/namespaces/lam-production/domainmappings/www.barlaam.store' "$CURL_LOG"

: >"$CURL_LOG"
CLOUD_RUN_WEB_DOMAIN='' PATH="$TEST_TMP:$PATH" bash "$ROOT_DIR/scripts/deploy-cloud-run.sh" >/dev/null
if [[ -s "$CURL_LOG" ]]; then
  printf '%s\n' 'empty CLOUD_RUN_WEB_DOMAIN must skip domain mapping' >&2
  exit 1
fi

printf '%s\n' 'deploy-cloud-run test passed'
