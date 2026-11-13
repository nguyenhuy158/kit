#!/usr/bin/env bash
# Installs bws (Bitwarden Secrets Manager CLI) and cf (Cloudflare CLI, beta).
# Linux x86_64 / arm64 and macOS. Idempotent: skips tools already installed.
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
NODE_MIN_MAJOR=22
NODE_MIN_MINOR=18

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64)  BWS_TARGET="x86_64-unknown-linux-gnu" ;;
  Linux-aarch64) BWS_TARGET="aarch64-unknown-linux-gnu" ;;
  Darwin-arm64)  BWS_TARGET="aarch64-apple-darwin" ;;
  Darwin-x86_64) BWS_TARGET="x86_64-apple-darwin" ;;
  *) echo "Unsupported platform: $(uname -s)-$(uname -m)" >&2; exit 1 ;;
esac

SUDO=""
[ -w "$INSTALL_DIR" ] || SUDO="sudo"

install_bws() {
  if command -v bws >/dev/null 2>&1; then
    echo "bws already installed: $(bws --version)"
    return
  fi
  local version workdir
  version="$(curl -fsSL -H 'User-Agent: install-tools' https://crates.io/api/v1/crates/bws \
    | python3 -c 'import sys,json;print(json.load(sys.stdin)["crate"]["max_stable_version"])')"
  workdir="$(mktemp -d)"
  trap 'rm -rf "$workdir"' RETURN
  curl -fsSL -o "$workdir/bws.zip" \
    "https://github.com/bitwarden/sdk-sm/releases/download/bws-v${version}/bws-${BWS_TARGET}-${version}.zip"
  python3 -I -c 'import sys,zipfile;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])' \
    "$workdir/bws.zip" "$workdir"
  $SUDO install -m 755 "$workdir/bws" "$INSTALL_DIR/bws"
  echo "bws installed: $(bws --version)"
}

install_cf() {
  if command -v cf >/dev/null 2>&1 && cf --version 2>/dev/null | grep -qi cloudflare; then
    echo "cf already installed: $(cf --version)"
    return
  fi
  command -v npm >/dev/null 2>&1 || { echo "npm not found; install Node >= ${NODE_MIN_MAJOR}.${NODE_MIN_MINOR}" >&2; exit 1; }
  local node_major node_minor
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  node_minor="$(node -p 'process.versions.node.split(".")[1]')"
  if [ "$node_major" -lt "$NODE_MIN_MAJOR" ] || { [ "$node_major" -eq "$NODE_MIN_MAJOR" ] && [ "$node_minor" -lt "$NODE_MIN_MINOR" ]; }; then
    echo "cf needs Node >= ${NODE_MIN_MAJOR}.${NODE_MIN_MINOR}, found $(node --version)" >&2
    exit 1
  fi
  npm install --global cf
  echo "cf installed: $(cf --version)"
  echo "Tip: if another 'cf' (Cloud Foundry) is on PATH, use 'cloudflare' instead."
}

install_bws
install_cf
