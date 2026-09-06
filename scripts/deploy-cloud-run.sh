#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: deploy-cloud-run.sh [SERVICE...]

SERVICE는 api, web, admin, all 중 하나 이상. 생략하면 all(전체 배포)로 동작한다.

예시:
  ./scripts/deploy-cloud-run.sh            # lam-api, lam-web, lam-admin-web 전체 배포
  ./scripts/deploy-cloud-run.sh admin      # lam-admin-web만 배포
  ./scripts/deploy-cloud-run.sh api        # lam-api만 배포
  ./scripts/deploy-cloud-run.sh web        # lam-web만 배포

자세한 사전 준비(시크릿, 권한)와 환경변수 목록은 scripts/README.md 참고.
EOF
}

contains() {
  local needle="$1"
  shift
  local x
  for x in "$@"; do
    [ "$x" = "$needle" ] && return 0
  done
  return 1
}

SERVICES=()
if [ "$#" -eq 0 ]; then
  SERVICES=(api web admin)
else
  for arg in "$@"; do
    case "$arg" in
      all) SERVICES+=(api web admin) ;;
      api|web|admin) SERVICES+=("$arg") ;;
      -h|--help) usage; exit 0 ;;
      *)
        echo "알 수 없는 SERVICE: $arg" >&2
        usage >&2
        exit 1
        ;;
    esac
  done
fi

# Windows(Git Bash/MSYS, Cygwin)에서는 PATH의 `gcloud`가 `gcloud.ps1`로 잘못
# 해석되거나 인터랙티브 처리가 깨지는 경우가 있어 `gcloud.cmd`를 직접 호출해야
# 한다. Mac/Linux 네이티브 셸에서는 `gcloud`가 정상 동작한다.
case "${OSTYPE:-}" in
  msys*|cygwin*|win32*)
    GCLOUD=gcloud.cmd
    ;;
  *)
    GCLOUD=gcloud
    ;;
esac

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-lam-production}"
API_REGION="${CLOUD_RUN_API_REGION:-asia-northeast3}"
WEB_REGION="${CLOUD_RUN_WEB_REGION:-asia-northeast1}"
ADMIN_WEB_REGION="${CLOUD_RUN_ADMIN_WEB_REGION:-asia-northeast1}"
NEXT_PUBLIC_SUPABASE_URL="${CLOUD_RUN_NEXT_PUBLIC_SUPABASE_URL:-https://escntlunkvcoiylczijh.supabase.co}"
NEXT_PUBLIC_SUPABASE_ANON_KEY="${CLOUD_RUN_NEXT_PUBLIC_SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzY250bHVua3Zjb2l5bGN6aWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODEyODUsImV4cCI6MjEwMzg1NzI4NX0.MSZoTACZWK_6wGEPFPbYe3Umz0ECnsG6ztoKM_bEZ0E}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

deploy_api() {
  "$GCLOUD" run deploy lam-api \
    --project="$PROJECT_ID" \
    --source="$ROOT_DIR/lam-api" \
    --region="$API_REGION" \
    --allow-unauthenticated \
    --min-instances=0 \
    --max-instances=1 \
    --set-secrets=DATABASE_URL=lam-database-url:latest,ADMIN_API_TOKEN=lam-admin-api-token:latest,SUPABASE_BROADCAST_KEY=lam-supabase-secret-key:latest,SUPABASE_URL=lam-supabase-url:latest \
    --set-env-vars='ALLOWED_ORIGIN=*' \
    --quiet
}

get_api_base_url() {
  "$GCLOUD" run services describe lam-api \
    --project="$PROJECT_ID" \
    --region="$API_REGION" \
    --format='value(status.url)'
}

deploy_web() {
  local api_base_url="$1"
  "$GCLOUD" run deploy lam-web \
    --project="$PROJECT_ID" \
    --source="$ROOT_DIR/lam-web" \
    --region="$WEB_REGION" \
    --allow-unauthenticated \
    --min-instances=0 \
    --max-instances=1 \
    --set-env-vars="API_BASE_URL=$api_base_url" \
    --set-secrets=ADMIN_API_TOKEN=lam-admin-api-token:latest,STAFF_ENTRY_TOKEN=lam-staff-entry-token:latest,QR_SIGNING_SECRET=lam-qr-signing-secret:latest \
    --quiet
}

# NEXT_PUBLIC_* 값은 lam-admin-web/Dockerfile의 ARG로 받아 `npm run build`
# 시점에 클라이언트 번들에 그대로 박힌다 — 컨테이너 실행 시점 환경변수가 아니므로
# --set-secrets로는 넣을 수 없고, --set-build-env-vars는 리터럴 값만 받는다.
# 값 자체는 비밀이 아니다 — anon/publishable key는 브라우저에 공개되도록
# 설계된 값이다(docs/plans/2026-09-04-admin-request-notifications.md 참고).
# 다른 Supabase 프로젝트로 배포하려면 CLOUD_RUN_NEXT_PUBLIC_SUPABASE_URL /
# CLOUD_RUN_NEXT_PUBLIC_SUPABASE_ANON_KEY 셸 환경변수로 덮어쓴다.
#
# --set-build-env-vars가 이 저장소의 Dockerfile 기반 소스 배포에서 정확히
# ARG로 전달되는지는 공식 문서로 확정하지 못했다 — 최초 배포 후 로그인해
# 브라우저 개발자도구 Network(WS) 탭에서 wss://<project-ref>.supabase.co/realtime/...
# 연결이 뜨는지로 직접 확인한다.
deploy_admin() {
  local api_base_url="$1"
  "$GCLOUD" run deploy lam-admin-web \
    --project="$PROJECT_ID" \
    --source="$ROOT_DIR/lam-admin-web" \
    --region="$ADMIN_WEB_REGION" \
    --allow-unauthenticated \
    --min-instances=0 \
    --max-instances=1 \
    --set-env-vars="API_BASE_URL=$api_base_url" \
    --set-secrets=ADMIN_API_TOKEN=lam-admin-api-token:latest,ADMIN_PASSWORD=lam-admin-web-admin-password:latest,SESSION_SECRET=lam-admin-web-session-secret:latest \
    --set-build-env-vars="NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    --quiet
}

if contains api "${SERVICES[@]}"; then
  deploy_api
fi

# web/admin 배포에는 lam-api URL이 필요하고, api만 배포한 경우도 결과 요약에
# 쓰이므로 이미 존재하는(또는 방금 배포한) lam-api를 기준으로 항상 조회한다.
API_BASE_URL="$(get_api_base_url)"

WEB_URL=""
if contains web "${SERVICES[@]}"; then
  deploy_web "$API_BASE_URL"
  WEB_URL="$("$GCLOUD" run services describe lam-web \
    --project="$PROJECT_ID" \
    --region="$WEB_REGION" \
    --format='value(status.url)')"
fi

ADMIN_WEB_URL=""
if contains admin "${SERVICES[@]}"; then
  deploy_admin "$API_BASE_URL"
  ADMIN_WEB_URL="$("$GCLOUD" run services describe lam-admin-web \
    --project="$PROJECT_ID" \
    --region="$ADMIN_WEB_REGION" \
    --format='value(status.url)')"
fi

printf 'Deployment complete.\n'
[ -n "$API_BASE_URL" ] && printf '  api:   %s\n' "$API_BASE_URL"
[ -n "$WEB_URL" ] && printf '  web:   %s\n' "$WEB_URL"
[ -n "$ADMIN_WEB_URL" ] && printf '  admin: %s\n' "$ADMIN_WEB_URL"
