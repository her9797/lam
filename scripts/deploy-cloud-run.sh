#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-lam-production}"
API_REGION="${CLOUD_RUN_API_REGION:-asia-northeast3}"
WEB_REGION="${CLOUD_RUN_WEB_REGION:-asia-northeast1}"
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
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=1 \
  --set-env-vars="API_BASE_URL=$API_BASE_URL" \
  --set-secrets=ADMIN_API_TOKEN=lam-admin-api-token:latest,STAFF_ENTRY_TOKEN=lam-staff-entry-token:latest,QR_SIGNING_SECRET=lam-qr-signing-secret:latest \
  --quiet

WEB_URL="$(gcloud run services describe lam-web \
  --project="$PROJECT_ID" \
  --region="$WEB_REGION" \
  --format='value(status.url)')"

printf 'Deployment complete: %s\n' "$WEB_URL"
