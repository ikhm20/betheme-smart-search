#!/bin/sh
set -eu
# Best-effort pipefail when running under bash (ignored under sh).
( set -o pipefail ) 2>/dev/null || true

# Timeweb cron wrapper for safe auto-update.
#
# Recommended usage (Timeweb panel cron command):
#   bash /home/c/cn30947/wordpress_nb95i/public_html/wp-content/plugins/betheme-smart-search/scripts/timeweb-cron.sh
#
# This wrapper:
# - Runs updates with a simple lock (prevents overlap)
# - Writes logs to /tmp (so you can debug without email spam)

export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

LOG_FILE="/tmp/betheme-smart-search-cron.log"
LOCK_DIR="/tmp/betheme-smart-search-cron.lock"

# Always write all cron output to the log file so Timeweb won't email stdout/stderr.
exec >>"${LOG_FILE}" 2>&1

# Resolve plugin directory relative to this script so it works on any Timeweb account/path.
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
PLUGIN_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd -P)"

# Allow override (useful for testing)
PLUGIN_DIR="${BETHEME_SMART_SEARCH_PLUGIN_DIR:-${PLUGIN_DIR}}"

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
}
