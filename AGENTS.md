# PROJECT KNOWLEDGE BASE

Generated: 2026-02-21 11:06 KST
Commit: e16169d
Branch: opencode-test

## OVERVIEW
Web Tetris game using Phaser 3 + TypeScript with single-player, 1v1 multiplayer, and N-player multiplayer via Socket.io.
Core behavior follows the 2009 Tetris Guideline.

## STRUCTURE
qufox-tetris/
- src/tetris/game.ts: Client entry (scene registration)
- src/tetris/scenes/: Scene orchestration and mode transitions
- src/tetris/objects/: Core board and piece lifecycle
- src/tetris/logic/: Scoring, rules, garbage, bot heuristics
- src/tetris/ui/: Responsive layout + DOM overlays
- server/index.js: Multiplayer server and room state machines
- test/unit/: Unit tests by domain

## WHERE TO LOOK
| Task | Location | Notes |
| --- | --- | --- |
| Boot flow and scene order | `src/tetris/game.ts` | Registers Menu/Lobby/Play scenes |
| Piece movement and lock rules | `src/tetris/objects/playField.ts` | Main board state transitions |
| Rotation/SRS details | `src/tetris/objects/tetromino.ts` | Kick logic and collision |
| Scoring and garbage output | `src/tetris/logic/scoreSystem.ts` | Lock result, combo, B2B, garbage |
| Multiplayer transport | `src/tetris/net/boardCodec.ts`, `server/index.js` | Board serialization + socket events |
| Responsive gameplay layout | `src/tetris/ui/gameLayout.ts` | Desktop/mobile-portrait branches |
| Test setup and Phaser mock | `test/setup.ts`, `test/mocks/phaserMock.ts` | Jest + jsdom harness |

## CONVENTIONS
- Input handling goes through `InputManager`; do not put direct key/touch logic into scene classes.
- UI overlays live in `src/tetris/ui/`; scenes orchestrate, UI modules render.
- `src/tetris/logic/` stays deterministic and framework-light.
- Shared constants come from `src/tetris/const/const.ts`; avoid duplicated magic values.
- Keep commit messages and PR descriptions in English.

## ANTI-PATTERNS (THIS PROJECT)
- Injecting raw user strings via `innerHTML` for room/player UI.
- Mixing multiplayer socket protocol logic into unrelated gameplay files.
- Adding another monolithic scene/object method when a local helper/module split is feasible.
- Changing board dimensions, timings, or scoring semantics without updating matching tests.

## UNIQUE STYLES
- Scene classes act as orchestrators; object classes own board/piece state.
- N-multiplayer uses compact board snapshots and periodic broadcast, not per-frame full sync.
- Mobile portrait layout rearranges hold/next/stats vertically; desktop keeps side panels.

## COMMANDS
```bash
npm install
npm run dev
npm test
npm run build
npm run server
```

## SUBDIRECTORY GUIDES
- `src/tetris/objects/AGENTS.md`
- `src/tetris/scenes/AGENTS.md`
- `src/tetris/ui/AGENTS.md`
- `src/tetris/logic/AGENTS.md`
- `server/AGENTS.md`

## NOTES
- Existing detailed design/architecture guidance is in `CLAUDE.md`; this file is the execution index.
- LSP TypeScript server is not installed in this environment (`typescript-language-server` missing).
