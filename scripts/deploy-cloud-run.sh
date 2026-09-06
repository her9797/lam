#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-lam-production}"
API_REGION="${CLOUD_RUN_API_REGION:-asia-northeast3}"
WEB_REGION="${CLOUD_RUN_WEB_REGION:-asia-northeast1}"
ADMIN_WEB_REGION="${CLOUD_RUN_ADMIN_WEB_REGION:-asia-northeast1}"
WEB_DOMAIN="${CLOUD_RUN_WEB_DOMAIN-www.barlaam.store}"
WEB_SERVICE_ACCOUNT="${CLOUD_RUN_WEB_SERVICE_ACCOUNT:-lam-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

gcloud run deploy lam-api \
  --project="$PROJECT_ID" \
  --source="$ROOT_DIR/lam-api" \
  --region="$API_REGION" \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=1 \
  --set-secrets=DATABASE_URL=lam-database-url:latest,ADMIN_API_TOKEN=lam-admin-api-token:latest,SUPABASE_BROADCAST_KEY=lam-supabase-secret-key:latest,SUPABASE_URL=lam-supabase-url:latest \
  --set-env-vars='ALLOWED_ORIGIN=*' \
  --quiet

API_BASE_URL="$(gcloud run services describe lam-api \
  --project="$PROJECT_ID" \
  --region="$API_REGION" \
  --format='value(status.url)')"

gcloud run deploy lam-web \
  --project="$PROJECT_ID" \
  --source="$ROOT_DIR/lam-web" \
  --region="$WEB_REGION" \
  --service-account="$WEB_SERVICE_ACCOUNT" \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=1 \
  --set-env-vars="API_BASE_URL=$API_BASE_URL" \
  --set-secrets=PAYMENT_API_TOKEN=lam-payment-api-token:latest,SESSION_SECRET=lam-web-session-secret:latest,QR_SIGNING_SECRET=lam-qr-signing-secret:latest,QR_ACCESS_TOKEN=lam-qr-access-token:latest,STAFF_ENTRY_TOKEN=lam-staff-entry-token:latest,CUSTOMER_TEST_ENTRY_TOKEN=lam-customer-test-entry-token:latest \
  --quiet

WEB_URL="$(gcloud run services describe lam-web \
  --project="$PROJECT_ID" \
  --region="$WEB_REGION" \
  --format='value(status.url)')"

if [[ -n "$WEB_DOMAIN" ]]; then
  DOMAIN_API="https://${WEB_REGION}-run.googleapis.com/apis/domains.cloudrun.com/v1/namespaces/${PROJECT_ID}/domainmappings"
  CLOUD_ACCESS_TOKEN="$(gcloud auth print-access-token)"
  DOMAIN_RESPONSE="$(curl -sS \
    -H "Authorization: Bearer ${CLOUD_ACCESS_TOKEN}" \
    -w $'\n%{http_code}' \
    "${DOMAIN_API}/${WEB_DOMAIN}")"
  DOMAIN_STATUS="${DOMAIN_RESPONSE##*$'\n'}"
  DOMAIN_BODY="${DOMAIN_RESPONSE%$'\n'*}"

  case "$DOMAIN_STATUS" in
    200)
      if ! grep -Eq '"routeName"[[:space:]]*:[[:space:]]*"lam-web"' <<<"$DOMAIN_BODY"; then
        printf 'Domain mapping %s exists but does not target lam-web.\n' "$WEB_DOMAIN" >&2
        exit 1
      fi
      ;;
    404)
      curl -fsS \
        -X POST \
        -H "Authorization: Bearer ${CLOUD_ACCESS_TOKEN}" \
        -H 'Content-Type: application/json' \
        --data "{\"apiVersion\":\"domains.cloudrun.com/v1\",\"kind\":\"DomainMapping\",\"metadata\":{\"name\":\"${WEB_DOMAIN}\",\"namespace\":\"${PROJECT_ID}\"},\"spec\":{\"routeName\":\"lam-web\",\"certificateMode\":\"AUTOMATIC\"}}" \
        "$DOMAIN_API" >/dev/null
      ;;
    *)
      printf 'Could not inspect domain mapping %s (HTTP %s).\n' "$WEB_DOMAIN" "$DOMAIN_STATUS" >&2
      exit 1
      ;;
  esac
fi

# NEXT_PUBLIC_* 값은 lam-admin-web/Dockerfile의 ARG로 받아 `npm run build`
# 시점에 클라이언트 번들에 그대로 박힌다 — 컨테이너 실행 시점 환경변수가 아니므로
# --set-secrets로는 넣을 수 없고, --set-build-env-vars는 리터럴 값만 받는다.
# 배포 전에 셸에서 내보내 둔다:
#   export NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
#   export NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon/publishable key>
# 값 자체는 비밀이 아니다 — anon/publishable key는 브라우저에 공개되도록
# 설계된 값이다(docs/plans/2026-09-04-admin-request-notifications.md 참고).
# 비워두면 빌드는 그대로 성공하고 Realtime Broadcast 구독만 비활성화된다
# (60초 안전망 폴링은 계속 동작).
#
# --set-build-env-vars가 이 저장소의 Dockerfile 기반 소스 배포에서 정확히
# ARG로 전달되는지는 공식 문서로 확정하지 못했다 — 최초 배포 후 로그인해
# 브라우저 개발자도구 Network(WS) 탭에서 wss://<project-ref>.supabase.co/realtime/...
# 연결이 뜨는지로 직접 확인한다.
gcloud run deploy lam-admin-web \
  --project="$PROJECT_ID" \
  --source="$ROOT_DIR/lam-admin-web" \
  --region="$ADMIN_WEB_REGION" \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=1 \
  --set-env-vars="API_BASE_URL=$API_BASE_URL" \
  --set-secrets=ADMIN_API_TOKEN=lam-admin-api-token:latest,ADMIN_PASSWORD=lam-admin-web-admin-password:latest,SESSION_SECRET=lam-admin-web-session-secret:latest \
  --set-build-env-vars="NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-},NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" \
  --quiet

ADMIN_WEB_URL="$(gcloud run services describe lam-admin-web \
  --project="$PROJECT_ID" \
  --region="$ADMIN_WEB_REGION" \
  --format='value(status.url)')"

printf 'Deployment complete: %s (web) / %s (admin)\n' "$WEB_URL" "$ADMIN_WEB_URL"
if [[ -n "$WEB_DOMAIN" ]]; then
  printf 'Customer domain: https://%s\n' "$WEB_DOMAIN"
fi
