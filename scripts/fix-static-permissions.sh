#!/usr/bin/env bash

set -euo pipefail

TARGET_DIR="${1:-$(pwd)}"
WEB_USER="${WEB_USER:-}"
WEB_GROUP="${WEB_GROUP:-}"
STATIC_DIRS=("$TARGET_DIR/assets" "$TARGET_DIR/styles" "$TARGET_DIR/build")

normalize_tree() {
    local dir="$1"

    if [[ ! -d "$dir" ]]; then
        return 0
    fi

    find "$dir" -type d -exec chmod 755 {} \;
    find "$dir" -type f -exec chmod 644 {} \;
}

for static_dir in "${STATIC_DIRS[@]}"; do
    normalize_tree "$static_dir"
done

if [[ -n "$WEB_USER" && -n "$WEB_GROUP" ]]; then
    existing_dirs=()
    for static_dir in "${STATIC_DIRS[@]}"; do
        if [[ -d "$static_dir" ]]; then
            existing_dirs+=("$static_dir")
        fi
    done

    if [[ ${#existing_dirs[@]} -gt 0 ]]; then
        if ! chown -R "$WEB_USER:$WEB_GROUP" "${existing_dirs[@]}"; then
            printf 'warning: chown failed (try sudo or run as root)\n' >&2
        fi
    fi
fi

printf 'Static permissions normalized under: %s\n' "$TARGET_DIR"
printf ' - directories: 755\n'
printf ' - files: 644\n'
if [[ -n "$WEB_USER" && -n "$WEB_GROUP" ]]; then
    printf ' - ownership requested: %s:%s (best-effort)\n' "$WEB_USER" "$WEB_GROUP"
fi
