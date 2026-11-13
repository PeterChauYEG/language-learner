#!/usr/bin/env bash
set -euo pipefail

# Bumps the version field in package.json to the given value.
# Usage: ./scripts/bump-version.sh <new-version>

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <new-version>" >&2
  exit 1
fi

NEW_VERSION="$1"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE_JSON="${REPO_ROOT}/package.json"

node -e "
const fs = require('fs');
const path = '${PACKAGE_JSON}';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
pkg.version = '${NEW_VERSION}';
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
"

echo "Bumped version to ${NEW_VERSION}"
