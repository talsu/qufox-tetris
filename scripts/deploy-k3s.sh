#!/usr/bin/env bash
# Deploy qufox-tetris to the Pi k3s cluster (same pipeline as qufox's
# scripts/deploy/deploy-k3s.sh): native arm64 build → ghcr.io push →
# kubectl set image → rollout gate with auto-undo.
#
#   scripts/deploy-k3s.sh            # deploy BOTH web and server
#   scripts/deploy-k3s.sh web        # frontend only
#   scripts/deploy-k3s.sh server     # multiplayer server only
#   scripts/deploy-k3s.sh all <sha>  # explicit sha tag override
#
# Prereqs (once per build machine): sudo docker login ghcr.io -u talsu
# Rollback: kubectl -n qufox-tetris rollout undo deploy/qufox-tetris[-server]
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

TARGET="${1:-all}"
SHA="${2:-$(git rev-parse --short HEAD 2>/dev/null || echo manual)}"
NS=qufox-tetris
export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"

log() { printf '[deploy-k3s:%s] %s\n' "$1" "$2"; }

deploy_one() {
  local svc="$1" dockerfile="$2" deploy="$3" container="$4"
  local image="ghcr.io/talsu/qufox-tetris/$svc" tag="sha-$SHA"

  log "$svc" "building $image:$tag (arm64)"
  sudo docker build -f "$dockerfile" -t "$image:$tag" -t "$image:latest" .

  log "$svc" "pushing to ghcr.io"
  sudo docker push "$image:$tag"
  sudo docker push "$image:latest"

  log "$svc" "rolling out"
  kubectl -n "$NS" set image "deploy/$deploy" "$container=$image:$tag"
  if ! kubectl -n "$NS" rollout status "deploy/$deploy" --timeout=180s; then
    log "$svc" "rollout FAILED — undoing to previous release"
    kubectl -n "$NS" rollout undo "deploy/$deploy"
    kubectl -n "$NS" rollout status "deploy/$deploy" --timeout=120s || true
    return 1
  fi
  log "$svc" "deployed $image:$tag"
}

case "$TARGET" in
  web)    deploy_one web Dockerfile.web qufox-tetris web ;;
  server) deploy_one server Dockerfile.server qufox-tetris-server server ;;
  all)
    deploy_one web    Dockerfile.web    qufox-tetris        web
    deploy_one server Dockerfile.server qufox-tetris-server server
    ;;
  *) echo "usage: deploy-k3s.sh [web|server|all] [sha]" >&2; exit 2 ;;
esac
