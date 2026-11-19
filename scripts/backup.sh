#!/usr/bin/env bash
# Backup diário do PostgreSQL de um ambiente. Agende no cron do host:
#   15 3 * * * /opt/planfest/scripts/backup.sh planfest-prod >> /var/log/planfest-backup.log 2>&1
# Retém 14 diários localmente. Copie para armazenamento externo (S3/B2/Drive) com rclone — ver docs/ARQUITETURA_TECNICA.md.
set -euo pipefail
PROJECT="${1:?uso: backup.sh <projeto-compose>}"
DIR="/opt/planfest/backups/${PROJECT}"
mkdir -p "$DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
docker compose -p "$PROJECT" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$DIR/${STAMP}.dump"
find "$DIR" -name '*.dump' -mtime +14 -delete
echo "[$(date -Is)] backup ok: $DIR/${STAMP}.dump ($(du -h "$DIR/${STAMP}.dump" | cut -f1))"
# Restaurar (em homologação, nunca direto em produção sem autorização):
#   docker compose -p planfest-stg exec -T db pg_restore -U planfest -d planfest --clean < arquivo.dump
