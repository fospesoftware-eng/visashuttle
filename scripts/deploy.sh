#!/usr/bin/env bash
# =============================================================================
# Visa Shuttle — deploy the current working tree from Trae to production VPS.
#
#   ./scripts/deploy.sh root@SERVER_IP          # one-off
#   export DEPLOY_TARGET=root@SERVER_IP         # then just: ./scripts/deploy.sh
#
# What it does: rsync working tree -> VPS, pnpm install, build, (optional)
# drizzle schema push, restart visashuttle service, show status.
#
# Skip schema push when only app code changed:   DEPLOY_DB_PUSH=1 to enable
# =============================================================================
set -euo pipefail

TARGET="${1:-${DEPLOY_TARGET:?pass user@host, e.g. ./scripts/deploy.sh root@1.2.3.4}}"
APP_DIR="${DEPLOY_DIR:-/opt/visashuttle}"

echo "==> syncing working tree -> ${TARGET}:${APP_DIR}"
rsync -azP --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.env*' \
  --exclude '.trae' \
  --exclude '.vscode' \
  --exclude 'dist' \
  --exclude 'cookies.txt' \
  --exclude 'attached_assets' \
  --exclude 'Upwork' \
  --exclude 'website-restore' \
  --exclude 'artifacts/pitch-deck' \
  --exclude 'artifacts/mockup-sandbox' \
  --exclude 'artifacts/visashuttle-mobile' \
  ./ "${TARGET}:${APP_DIR}/"

echo "==> fix ownership (service runs as 'visashuttle')"
ssh "${TARGET}" "chown -R visashuttle:visashuttle ${APP_DIR}"

echo "==> install + build on server"
ssh "${TARGET}" "set -e; cd ${APP_DIR}
  pnpm install --frozen-lockfile
  pnpm run build
  if [ \"\${DEPLOY_DB_PUSH:-}\" = '1' ]; then
    pnpm --filter @workspace/db push --force
  fi
  sudo systemctl restart visashuttle"

echo "==> status"
ssh "${TARGET}" "systemctl is-active visashuttle; journalctl -u visashuttle -n 12 --no-pager -o cat"

echo "==> done. https://${DEPLOY_DOMAIN:-your-domain} should be live once DNS points here."
