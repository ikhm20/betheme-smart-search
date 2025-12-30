#!/usr/bin/env bash
set -euo pipefail

# Timeweb shared hosting install script (atomic swap).
#
# Usage (in Timeweb SSH webconsole):
#   bash scripts/timeweb-install.sh git@github.com:USER/REPO.git main
#
# Notes:
# - Deactivate the plugin in WP Admin before running (recommended).
# - This script clones into a temp folder and swaps atomically.

REMOTE="${1:-}"
BRANCH="${2:-main}"

if [[ -z "${REMOTE}" ]]; then
  echo "Usage: $0 <git-remote-url> [branch]" >&2
  exit 1
fi

PLUGIN_DIR="/home/c/cn30947/wordpress_nb95i/public_html/wp-content/plugins"
PLUGIN_NAME="betheme-smart-search"
WP_PATH="${PLUGIN_DIR%/wp-content/plugins}"

export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

WP_CMD=()
if command -v wp >/dev/null 2>&1; then
  WP_CMD=(wp)
else
  for cand in "${HOME:-/home/c/cn30947}/wp-cli.phar" "/home/c/cn30947/wp-cli.phar"; do
    if [ -f "${cand}" ]; then
      PHP_BIN="$(command -v php || true)"
      if [ -x "/opt/php82/bin/php" ]; then
        PHP_BIN="/opt/php82/bin/php"
      fi
      if [ -n "${PHP_BIN}" ]; then
        WP_CMD=("${PHP_BIN}" "${cand}")
      fi
      break
    fi
  done
fi

cd "${PLUGIN_DIR}"

TMP_DIR="${PLUGIN_NAME}__new_$(date +%F_%H%M%S)"
BAK_DIR="${PLUGIN_NAME}__backup_$(date +%F_%H%M%S)"

echo "Cloning ${REMOTE} (${BRANCH}) into ${TMP_DIR}..."
git clone --depth 1 --branch "${BRANCH}" "${REMOTE}" "${TMP_DIR}"

if [[ ! -f "${TMP_DIR}/betheme-smart-search.php" ]]; then
  echo "ERROR: ${TMP_DIR}/betheme-smart-search.php not found; aborting." >&2
  exit 1
fi

if [[ -d "${PLUGIN_NAME}" ]]; then
  echo "Backing up current ${PLUGIN_NAME} to ${BAK_DIR}..."
  mv "${PLUGIN_NAME}" "${BAK_DIR}"
fi

echo "Activating new folder..."
mv "${TMP_DIR}" "${PLUGIN_NAME}"

if [ ${#WP_CMD[@]} -gt 0 ]; then
  echo "Running WP-CLI post-install maintenance..."
  "${WP_CMD[@]}" --path="${WP_PATH}" cache flush || true
  "${WP_CMD[@]}" --path="${WP_PATH}" transient delete --expired || true
  "${WP_CMD[@]}" --path="${WP_PATH}" transient delete update_plugins || true
else
  echo "WP-CLI not found; skipping cache/transient flush."
fi

echo "Done."
echo "If something breaks, rollback with:"
echo "  cd ${PLUGIN_DIR} && rm -rf ${PLUGIN_NAME} && mv ${BAK_DIR} ${PLUGIN_NAME}"
