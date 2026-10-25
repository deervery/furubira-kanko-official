#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
version=1.27.2
if command -v go >/dev/null 2>&1; then
  export GOTOOLCHAIN="go$version"
  exec go run ./cmd/sitegen
fi
# Vercel generic builds may lack Go. Use the pinned official distribution, with a verified digest.
cache="$PWD/.build-tools"
mkdir -p "$cache"
if [ ! -x "$cache/go/bin/go" ]; then
  archive="$cache/go.tar.gz"
  curl --fail --silent --show-error --location "https://go.dev/dl/go$version.linux-amd64.tar.gz" --output "$archive"
  echo "ecbadb99091a3f46e31f5f934b068b1864eafa7995211b39eaddf76996045fe5  $archive" | sha256sum --check --status
  tar -xzf "$archive" -C "$cache"
fi
export GOTOOLCHAIN="go$version"
exec "$cache/go/bin/go" run ./cmd/sitegen
