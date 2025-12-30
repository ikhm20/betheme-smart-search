#!/usr/bin/env bash
set -euo pipefail

# Timeweb shared hosting update script (git pull).
#
# Usage (in Timeweb SSH webconsole):
#   bash scripts/timeweb-update.sh

PLUGIN_DIR="/home/c/cn30947/wordpress_nb95i/public_html/wp-content/plugins/betheme-smart-search"

cd "${PLUGIN_DIR}"

echo "Updating $(pwd)..."
git status -sb || true
git pull --ff-only
echo "Done."
