#!/bin/bash
set -e

SRC=/home/ranch/FragHub/services/fraghub-api/src
DST=/opt/fraghub/api/src
WEB_SRC=/home/ranch/FragHub/fraghub-web/dist
WEB_DST=/opt/fraghub/portal/dist

echo "==> Copiando arquivos da API..."
cp "$SRC/config/env.ts"                        "$DST/config/env.ts"
cp "$SRC/index.ts"                             "$DST/index.ts"
cp "$SRC/routes/live.ts"                       "$DST/routes/live.ts"
cp "$SRC/routes/matches.ts"                    "$DST/routes/matches.ts"
cp "$SRC/services/liveMatchService.ts"         "$DST/services/liveMatchService.ts"
cp "$SRC/services/liveStateService.ts"         "$DST/services/liveStateService.ts"
cp "$SRC/services/eloService.ts"               "$DST/services/eloService.ts"

echo "==> Adicionando MATCHZY_BACKUP_PATH ao .env (se não existir)..."
grep -q MATCHZY_BACKUP_PATH /opt/fraghub/api/.env || \
  echo 'MATCHZY_BACKUP_PATH=/home/ranch/fraghub/linuxgsm/serverfiles/game/csgo/MatchZyDataBackup' >> /opt/fraghub/api/.env

echo "==> Build da API..."
cd /opt/fraghub/api && npm run build

echo "==> Reiniciando serviço..."
systemctl restart fraghub-api

echo "==> Copiando frontend..."
cp -r "$WEB_SRC/." "$WEB_DST/"

echo "==> Pronto!"
