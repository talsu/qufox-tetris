# SCENES GUIDE

## OVERVIEW
`src/tetris/scenes/` orchestrates mode flow and wires systems together.
Scenes should compose engine/objects/ui/input/net utilities, not re-implement gameplay logic.

## WHERE TO LOOK
- `baseScene.ts`: shared resolution, zoom, background, layout mode selection.
- `menuScene.ts`: mode selection, URL-based join routing, guarded join recovery.
- `lobbyScene.ts`: room list/create/join flow for multiplayer lobbies.
- `playScene.ts`: single-player and 1v1 authoritative orchestration.
- `nMultiPlayScene.ts`: n-player authoritative orchestration and snapshot-driven opponent panels.
- `multiplayerSyncUtils.ts`: shared authoritative resync/bootstrap/visibility logic.

## CONVENTIONS
- Scene classes are orchestrators; gameplay state lives in engine/objects.
- Input enters through `InputManager`, not ad-hoc key handlers.
- UI overlays and panels should use `src/tetris/ui/` modules.
- Layout positioning should come from `src/tetris/ui/gameLayout.ts` calculators.
- Runtime HUD repositioning (hold/queue/indicator/hold-zone) should use `src/tetris/ui/runtimeHudLayout.ts`.
- Register socket events via `SocketListenerRegistry` and clear listeners on shutdown/transition.
- Keep scene transitions explicit (`this.scene.start(...)`) and mode-aware.
- In authoritative modes, rely on server snapshots for canonical remote state and resync triggers.

## ANTI-PATTERNS
- Adding core scoring/collision logic directly in scene methods.
- Building raw HTML with unsanitized user strings for lobby/game UI.
- Hardcoding mobile/desktop coordinates without layout helpers.
- Duplicating local HUD relayout branches in both `playScene.ts` and `nMultiPlayScene.ts`.
- Duplicating socket event payload shape conversions or listener teardown logic in multiple scenes.

## NOTES
- `playScene.ts` and `nMultiPlayScene.ts` are large; keep new work modular.
- For multiplayer changes, validate both local game flow and socket event ordering.
- High-signal scene tests:
  - `test/unit/scenes/multiplayerSyncUtils.test.ts`
  - `test/unit/scenes/playScene.authoritativeResync.test.ts`
  - `test/unit/scenes/nMultiPlayScene.payloadGuards.test.ts`
  - `test/unit/scenes/menuScene.urlRouting.test.ts`
