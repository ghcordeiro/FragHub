#!/bin/bash
set -e

SRC=/home/ranch/FragHub/services/fraghub-api/src
DST=/opt/fraghub/api/src
WEB_SRC=/home/ranch/FragHub/fraghub-web
WEB_DST=/opt/fraghub/portal/dist

echo "==> Sincronizando fonte da API (todos os arquivos)..."
rsync -a --no-o --no-g --exclude="*.test.ts" "$SRC/" "$DST/"

echo "==> Verificando .env..."
grep -q MATCHZY_BACKUP_PATH /opt/fraghub/api/.env || \
  echo 'MATCHZY_BACKUP_PATH=/home/ranch/fraghub/linuxgsm/serverfiles/game/csgo/MatchZyDataBackup' >> /opt/fraghub/api/.env

echo "==> Build da API..."
cd /opt/fraghub/api && npm run build

echo "==> Reiniciando serviço..."
systemctl restart fraghub-api

echo "==> Build do frontend..."
cd "$WEB_SRC" && npm run build

echo "==> Copiando frontend..."
rsync -a --no-o --no-g --delete "$WEB_SRC/dist/" "$WEB_DST/"

echo "==> Pronto!"
