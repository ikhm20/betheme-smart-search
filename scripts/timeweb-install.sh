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

echo "Done."
echo "If something breaks, rollback with:"
echo "  cd ${PLUGIN_DIR} && rm -rf ${PLUGIN_NAME} && mv ${BAK_DIR} ${PLUGIN_NAME}"
