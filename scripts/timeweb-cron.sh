#!/usr/bin/env bash
set -euo pipefail

# Timeweb cron wrapper for safe auto-update.
#
# Recommended usage (Timeweb panel cron command):
#   bash /home/c/cn30947/wordpress_nb95i/public_html/wp-content/plugins/betheme-smart-search/scripts/timeweb-cron.sh
#
# This wrapper:
# - Runs updates with a simple lock (prevents overlap)
# - Writes logs to /tmp (so you can debug without email spam)

export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

PLUGIN_DIR="/home/c/cn30947/wordpress_nb95i/public_html/wp-content/plugins/betheme-smart-search"
LOG_FILE="/tmp/betheme-smart-search-cron.log"
LOCK_DIR="/tmp/betheme-smart-search-cron.lock"

if ! mkdir "${LOCK_DIR}" 2>/dev/null; then
  # Another run is in progress. Exit silently.
  exit 0
fi

cleanup() {
  rmdir "${LOCK_DIR}" 2>/dev/null || true
}
trap cleanup EXIT

{
  echo "-----"
  echo "[$(date -Is)] Cron run start"
  cd "${PLUGIN_DIR}"
  bash "${PLUGIN_DIR}/scripts/timeweb-update.sh"
  echo "[$(date -Is)] Cron run end"
} >> "${LOG_FILE}" 2>&1

