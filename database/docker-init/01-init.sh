#!/bin/bash
# =====================================================================
# RMS — first-start setup for the Docker MySQL container.
# Docker runs this ONLY ONCE: when the data volume is brand new and empty.
# It never runs again on later starts, so it can't overwrite existing data.
#   - creates rms_dev (development) and rms_test (automated tests)
#   - applies all migrations to both
#   - loads synthetic seed data into BOTH (tests start from known data)
#   - creates the limited app user `rms_app` (no right to create/drop tables)
# =====================================================================
set -euo pipefail

RMS_DIR="${RMS_DIR:-/rms}"
MYSQL_CMD="${MYSQL_CMD:-mysql -uroot -p${MYSQL_ROOT_PASSWORD}}"

: "${RMS_APP_PASSWORD:?RMS_APP_PASSWORD must be set}"

for db in rms_dev rms_test; do
  echo "[rms-init] creating database $db"
  $MYSQL_CMD -e "CREATE DATABASE IF NOT EXISTS \`$db\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  for f in "$RMS_DIR"/migrations/*.sql; do
    echo "[rms-init]   applying $(basename "$f") to $db"
    $MYSQL_CMD "$db" < "$f"
  done
  echo "[rms-init]   loading synthetic seed into $db"
  $MYSQL_CMD "$db" < "$RMS_DIR/seeds/dev_seed.sql"
done

echo "[rms-init] creating limited application user rms_app"
$MYSQL_CMD -e "
  CREATE USER IF NOT EXISTS 'rms_app'@'%' IDENTIFIED BY '${RMS_APP_PASSWORD}';
  GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON \`rms_dev\`.*  TO 'rms_app'@'%';
  GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON \`rms_test\`.* TO 'rms_app'@'%';
  FLUSH PRIVILEGES;"

echo "[rms-init] done"
