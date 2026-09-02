#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-lam-production}"
REGION="${CLOUD_RUN_REGION:-asia-northeast3}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

gcloud run deploy lam-api \
  --project="$PROJECT_ID" \
  --source="$ROOT_DIR/lam-api" \
  --region="$REGION" \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=1 \
  --set-secrets=DATABASE_URL=lam-database-url:latest,ADMIN_API_TOKEN=lam-admin-api-token:latest \
  --set-env-vars='ALLOWED_ORIGIN=*' \
  --quiet

API_BASE_URL="$(gcloud run services describe lam-api \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format='value(status.url)')"

gcloud run deploy lam-web \
  --project="$PROJECT_ID" \
  --source="$ROOT_DIR/lam-web" \
  --region="$REGION" \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=1 \
  --set-env-vars="API_BASE_URL=$API_BASE_URL" \
  --set-secrets=ADMIN_API_TOKEN=lam-admin-api-token:latest,STAFF_ENTRY_TOKEN=lam-staff-entry-token:latest \
  --quiet

WEB_URL="$(gcloud run services describe lam-web \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format='value(status.url)')"

printf 'Deployment complete: %s\n' "$WEB_URL"
