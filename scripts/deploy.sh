#!/usr/bin/env bash
# Atualização de um ambiente na VPS. Uso: scripts/deploy.sh staging|production
# Produção exige confirmação explícita e backup prévio.
set -euo pipefail
ENV="${1:?uso: deploy.sh staging|production}"
case "$ENV" in
  staging)    P=planfest-stg;  F=docker-compose.staging.yml; E=.env.staging ;;
  production) P=planfest-prod; F=docker-compose.prod.yml;    E=.env.production
              read -r -p "Implantar em PRODUÇÃO? Digite 'sim': " ok; [ "$ok" = "sim" ] || exit 1
              ./scripts/backup.sh "$P" ;;
  *) echo "ambiente inválido"; exit 1 ;;
esac
git pull --ff-only
docker compose -p "$P" --env-file "$E" -f docker-compose.yml -f "$F" build
docker compose -p "$P" --env-file "$E" -f docker-compose.yml -f "$F" up -d   # roda 'migrate' antes do 'app'
sleep 5
curl -fsS "http://127.0.0.1:$([ "$ENV" = production ] && echo 3100 || echo 3101)/api/health" && echo " ✓ $ENV no ar"
