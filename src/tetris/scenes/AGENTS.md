# SCENES GUIDE

## OVERVIEW
`src/tetris/scenes/` orchestrates mode flow and wires systems together.
Scenes should compose engine/objects/ui/input, not re-implement their logic.

## WHERE TO LOOK
- `baseScene.ts`: Shared resolution, zoom, background, layout mode selection.
- `menuScene.ts`: Mode selection and startup routing.
- `lobbyScene.ts`: Room list/create/join flow for multiplayer lobbies.
- `playScene.ts`: Single-player and 1v1 orchestration.
- `nMultiPlayScene.ts`: N-player orchestration and snapshot-driven opponent panels.

## CONVENTIONS
- Scene classes are orchestrators; gameplay state lives in engine/objects.
- Input enters through `InputManager`, not ad-hoc key handlers.
- UI overlays and panels should use `src/tetris/ui/` modules.
- Layout positioning should come from `src/tetris/ui/gameLayout.ts` calculators.
- Keep scene transitions explicit (`this.scene.start(...)`) and mode-aware.

## ANTI-PATTERNS
- Adding core scoring/collision logic directly in scene methods.
- Building raw HTML with unsanitized user strings for lobby/game UI.
- Hardcoding mobile/desktop coordinates without layout helpers.
- Duplicating socket event payload shape conversions in multiple scenes.

## NOTES
- `playScene.ts` and `nMultiPlayScene.ts` are large; keep new work modular.
- For multiplayer changes, validate both local game flow and socket event ordering.
