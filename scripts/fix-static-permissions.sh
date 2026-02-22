#!/usr/bin/env bash

set -euo pipefail

TARGET_DIR="${1:-$(pwd)}"
ASSETS_DIR="$TARGET_DIR/assets"
WEB_USER="${WEB_USER:-}"
WEB_GROUP="${WEB_GROUP:-}"

if [[ ! -d "$ASSETS_DIR" ]]; then
    printf 'warning: assets directory not found: %s\n' "$ASSETS_DIR" >&2
else
    chmod -R 755 "$ASSETS_DIR"
fi

if [[ -n "$WEB_USER" && -n "$WEB_GROUP" ]]; then
    if [[ -d "$ASSETS_DIR" ]]; then
        if ! chown -R "$WEB_USER:$WEB_GROUP" "$ASSETS_DIR"; then
            printf 'warning: chown failed (try sudo or run as root)\n' >&2
        fi
    fi
fi

printf 'Asset permissions normalized under: %s\n' "$ASSETS_DIR"
printf ' - recursive mode: 755\n'
if [[ -n "$WEB_USER" && -n "$WEB_GROUP" ]]; then
    printf ' - ownership requested: %s:%s (best-effort)\n' "$WEB_USER" "$WEB_GROUP"
fi
