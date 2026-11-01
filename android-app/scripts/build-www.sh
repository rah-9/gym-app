#!/usr/bin/env bash
# Copy the website into www/ so the Android app runs the same code offline.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf www && mkdir -p www
cp -r ../index.html ../styles.css ../manifest.webmanifest ../icon.svg ../icons ../js www/
echo "www ready: $(find www -type f | wc -l) files"
