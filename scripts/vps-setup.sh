#!/usr/bin/env bash
# =============================================================================
# Visa Shuttle — one-shot production VPS bootstrap (Ubuntu 24.04 LTS)
#
# Run ONCE on a fresh VPS, from your machine via Trae terminal:
#   export DOMAIN=app.yourdomain.com
#   ssh root@SERVER_IP 'bash -s' < scripts/vps-setup.sh
#
# Installs: Node 22 LTS, pnpm, PostgreSQL 16, Caddy (auto-HTTPS), systemd
# service "visashuttle", UFW firewall. Prints DB + session secrets to save.
# =============================================================================
set -euo pipefail

DOMAIN="${DOMAIN:?export DOMAIN=app.yourdomain.com first}"
APP_DIR=/opt/visashuttle
DB_NAME=visashuttle
DB_USER=visashuttle
DB_PASS="$(openssl rand -hex 24)"
SESSION_SECRET="$(openssl rand -hex 32)"

[ "$(id -u)" -eq 0 ] || { echo "Run as root"; exit 1; }

echo "==> base packages"
apt-get update -y
apt-get install -y curl git rsync ufw openssl postgresql postgresql-contrib caddy

echo "==> Node 22 + pnpm"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
corepack enable
corepack prepare pnpm@10.26.1 --activate

echo "==> PostgreSQL role + database"
systemctl enable --now postgresql
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
SQL

echo "==> dedicated app user"
id -u visashuttle &>/dev/null || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin visashuttle
mkdir -p "$APP_DIR"

echo "==> systemd service"
cat > /etc/systemd/system/visashuttle.service <<EOF
[Unit]
Description=Visa Shuttle (API + web)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=visashuttle
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env.production
Environment=NODE_ENV=production
ExecStart=/usr/bin/node --enable-source-maps dist/index.mjs
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=${APP_DIR}

[Install]
WantedBy=multi-user.target
EOF

echo "==> env template at ${APP_DIR}/.env.production (fill in secrets)"
cat > "${APP_DIR}/.env.production" <<EOF
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
APP_BASE_URL=https://${DOMAIN}
CORS_ALLOWED_ORIGINS=https://${DOMAIN}
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}
SESSION_SECRET=${SESSION_SECRET}
# --- payments (fill in) ---
STRIPE_MODE=test
STRIPE_TEST_SECRET_KEY=
STRIPE_TEST_PUBLISHABLE_KEY=
STRIPE_LIVE_SECRET_KEY=
STRIPE_LIVE_PUBLISHABLE_KEY=
PAYPAL_MODE=sandbox
PAYPAL_SANDBOX_CLIENT_ID=
PAYPAL_SANDBOX_CLIENT_SECRET=
PAYPAL_LIVE_CLIENT_ID=
PAYPAL_LIVE_CLIENT_SECRET=
CASHFREE_MODE=test
CASHFREE_TEST_CLIENT_ID=
CASHFREE_TEST_CLIENT_SECRET=
CASHFREE_LIVE_CLIENT_ID=
CASHFREE_LIVE_CLIENT_SECRET=
# --- SMS (India OTP) ---
SMS_PROVIDER=msg91
MSG91_AUTH_KEY=
MSG91_SENDER_ID=
MSG91_TEMPLATE_ID=
PING4SMS_API_KEY=
PING4SMS_OTP_TEMPLATE=
# --- AI ---
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
OPENAI_API_KEY=
OPENAI_MODEL=
EOF
chmod 600 "${APP_DIR}/.env.production"

echo "==> Caddy (auto-HTTPS on first request)"
cat > /etc/caddy/Caddyfile <<EOF
${DOMAIN} {
	encode zstd gzip
	reverse_proxy 127.0.0.1:8080
}
EOF

echo "==> firewall"
ufw allow OpenSSH >/dev/null
ufw allow 80 >/dev/null
ufw allow 443 >/dev/null
ufw --force enable >/dev/null

systemctl daemon-reload
systemctl enable --now caddy

cat <<EOF

=========================================================
 Setup done. SAVE THESE SECRETS NOW:
   DB_PASSWORD    = ${DB_PASS}
   SESSION_SECRET = ${SESSION_SECRET}
 (already written into ${APP_DIR}/.env.production)

 Next (from Trae terminal):
   ./scripts/deploy.sh root@SERVER_IP
 Then point DNS A record for ${DOMAIN} -> SERVER_IP.
=========================================================
EOF
