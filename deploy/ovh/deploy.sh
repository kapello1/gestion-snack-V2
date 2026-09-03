#!/usr/bin/env bash
# Script de (re)deploiement a lancer sur le VPS OVH, depuis la racine du repo.
# Usage : ./deploy/ovh/deploy.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="$REPO_DIR/frontend_gestion_snack"
WEB_ROOT="/var/www/gestion-snack/frontend"

cd "$REPO_DIR"

echo "==> git pull"
git pull

echo "==> Backend : build + (re)demarrage du conteneur"
docker compose -f docker-compose.ovh.yml up -d --build

echo "==> Frontend : build"
cd "$FRONTEND_DIR"
npm ci
npm run build

echo "==> Frontend : publication vers $WEB_ROOT"
sudo mkdir -p "$WEB_ROOT"
sudo rsync -a --delete dist/ "$WEB_ROOT/"

echo "==> Rechargement de Nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Termine."
