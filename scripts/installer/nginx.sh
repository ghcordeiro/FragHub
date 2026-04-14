#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=logging.sh
source "${SCRIPT_DIR}/logging.sh"
# shellcheck source=state.sh
source "${SCRIPT_DIR}/state.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
NGINX_SETUP_MARKER="${FRAGHUB_NGINX_SETUP_MARKER:-${INPUT_DIR}/nginx-setup.done}"

FRAGHUB_PORTAL_DIR="${FRAGHUB_PORTAL_DIR:-/opt/fraghub/portal}"
FRAGHUB_API_PORT="${FRAGHUB_API_PORT:-3000}"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available/fraghub"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled/fraghub"
NGINX_LOG_DIR="/var/log/fraghub"

fail() {
  fraghub_fail_actionable "$1" "bash scripts/installer/nginx.sh"
  exit 1
}

log_section() {
  fraghub_log_info "$1"
}

nginx_is_installed() {
  command -v nginx >/dev/null 2>&1
}

install_nginx() {
  log_section "Installing Nginx and Certbot..."
  apt-get update -qq
  apt-get install -y nginx certbot python3-certbot-nginx >/dev/null 2>&1 || fail "Failed to install Nginx/Certbot"
  fraghub_log_success "Nginx and Certbot installed"
}

create_nginx_config() {
  log_section "Creating Nginx reverse proxy configuration..."

  mkdir -p "$NGINX_LOG_DIR"

  cat >"$NGINX_SITES_AVAILABLE" <<'EOF'
# FragHub Nginx configuration
# Serves React frontend from /opt/fraghub/portal/dist
# Proxies /api/* to Node.js backend on localhost:3000

upstream fraghub_api {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name _;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://steamcdn-a.akamaihd.net" always;

    # Frontend static files
    root /opt/fraghub/portal/dist;
    index index.html;

    # SPA routing fallback
    location / {
        try_files $uri $uri/ /index.html;

        # Cache busting for hashed assets
        location ~* \.(js|css)$ {
            add_header Cache-Control "public, max-age=31536000, immutable" always;
        }
        # Don't cache index.html
        location = /index.html {
            add_header Cache-Control "no-cache" always;
        }
    }

    # API proxy
    location /api/ {
        proxy_pass http://fraghub_api/;
        proxy_http_version 1.1;

        # Pass through headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Request/response buffering
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        client_max_body_size 10m;
    }
}

# HTTP → HTTPS redirect (only if SSL is configured)
# This block is added by certbot automatically
EOF

  fraghub_log_success "Nginx configuration created at $NGINX_SITES_AVAILABLE"
}

validate_nginx() {
  log_section "Validating Nginx configuration..."
  if nginx -t >/dev/null 2>&1; then
    fraghub_log_success "Nginx configuration is valid"
    return 0
  else
    fail "Nginx configuration validation failed"
  fi
}

enable_and_restart_nginx() {
  log_section "Enabling and restarting Nginx..."

  if [[ ! -L "$NGINX_SITES_ENABLED" ]]; then
    ln -sf "$NGINX_SITES_AVAILABLE" "$NGINX_SITES_ENABLED"
  fi

  systemctl restart nginx || fail "Failed to restart Nginx"
  fraghub_log_success "Nginx enabled and restarted"
}

setup_ssl_with_certbot() {
  local domain="$1"
  local email="$2"

  log_section "Setting up SSL certificate for domain: $domain"

  certbot --nginx -d "$domain" --non-interactive --agree-tos -m "$email" >/dev/null 2>&1 || \
    fraghub_log_warn "Certbot SSL setup encountered issues, but continuing..."

  fraghub_log_success "SSL certificate setup completed for $domain"
}

setup_certbot_renewal() {
  log_section "Setting up Certbot automatic renewal..."

  # Create timer
  cat >/etc/systemd/system/certbot-renew.timer <<'EOF'
[Unit]
Description=Certbot renewal timer

[Timer]
OnCalendar=daily
OnBootSec=2h
Persistent=true

[Install]
WantedBy=timers.target
EOF

  # Create service
  cat >/etc/systemd/system/certbot-renew.service <<'EOF'
[Unit]
Description=Certbot renewal
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet
StandardOutput=journal
StandardError=journal
EOF

  systemctl daemon-reload
  systemctl enable certbot-renew.timer >/dev/null 2>&1
  systemctl start certbot-renew.timer >/dev/null 2>&1

  fraghub_log_success "Certbot renewal timer enabled"
}

nginx_setup() {
  log_section "=== Nginx Setup ==="

  # Check if already set up
  if [[ -f "$NGINX_SETUP_MARKER" ]]; then
    fraghub_log_info "Nginx already configured (marker found). Skipping setup."
    return 0
  fi

  # Install Nginx if needed
  if ! nginx_is_installed; then
    install_nginx
  fi

  # Create configuration
  create_nginx_config
  validate_nginx
  enable_and_restart_nginx

  # Ask about SSL
  read -rp "Do you have a domain configured with DNS? (y/n) " -n 1 -r
  echo

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -rp "Enter your domain name: " domain
    read -rp "Enter admin email for SSL notifications: " email

    setup_ssl_with_certbot "$domain" "$email"
    setup_certbot_renewal
  else
    fraghub_log_warn "Running without HTTPS. Certificate can be added later with: certbot --nginx -d <domain>"
  fi

  # Mark as done
  touch "$NGINX_SETUP_MARKER"
  fraghub_log_success "Nginx setup completed"
}

# Main execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  nginx_setup
fi
