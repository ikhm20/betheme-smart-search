#!/usr/bin/env bash
set -euo pipefail

# Timeweb shared hosting update script (git pull).
#
# Usage (in Timeweb SSH webconsole):
#   bash scripts/timeweb-update.sh

# Resolve plugin dir relative to this script (portable across Timeweb accounts/paths)
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
PLUGIN_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd -P)"

# Allow override (useful for testing)
PLUGIN_DIR="${BETHEME_SMART_SEARCH_PLUGIN_DIR:-${PLUGIN_DIR}}"

# Infer WP path from plugin path: /.../wp-content/plugins/<plugin>
WP_PATH="${PLUGIN_DIR%/wp-content/plugins/*}"

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

echo "Updating $(pwd)..."
git status -sb || true
git pull --ff-only

if [ ${#WP_CMD[@]} -gt 0 ]; then
  echo "Running WP-CLI post-update maintenance..."
  "${WP_CMD[@]}" --path="${WP_PATH}" cache flush || true
  "${WP_CMD[@]}" --path="${WP_PATH}" transient delete --expired || true
  "${WP_CMD[@]}" --path="${WP_PATH}" transient delete update_plugins || true
else
  echo "WP-CLI not found; skipping cache/transient flush."
fi

echo "Done."
