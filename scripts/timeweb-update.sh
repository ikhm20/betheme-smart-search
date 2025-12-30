#!/usr/bin/env bash
set -euo pipefail

# Timeweb shared hosting update script (git pull).
#
# Usage (in Timeweb SSH webconsole):
#   bash scripts/timeweb-update.sh

PLUGIN_DIR="/home/c/cn30947/wordpress_nb95i/public_html/wp-content/plugins/betheme-smart-search"
WP_PATH="${PLUGIN_DIR%/wp-content/plugins/*}"

cd "${PLUGIN_DIR}"

echo "Updating $(pwd)..."
git status -sb || true
git pull --ff-only

if command -v wp >/dev/null 2>&1; then
  echo "Running WP-CLI post-update maintenance..."
  wp --path="${WP_PATH}" cache flush || true
  wp --path="${WP_PATH}" transient delete --expired || true
  wp --path="${WP_PATH}" transient delete update_plugins || true
else
  echo "WP-CLI not found; skipping cache/transient flush."
fi

echo "Done."
