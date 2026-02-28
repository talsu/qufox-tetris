# AGENTS.md
Guide for coding agents operating in this repository.

## Project Summary
- Tech: TypeScript, Phaser 3, Webpack 5, Jest (ts-jest), Socket.io, Express
- Client entry: `src/tetris/game.ts`
- Server entry: `server/index.js`
- Tests: `test/unit/**/*.test.ts`
- Phaser is mocked in tests via `test/mocks/phaserMock.ts`

## Mandatory Context Files
Read these before making non-trivial changes:
1. `AGENTS.md` (this file)
2. Domain guides:
   - `src/tetris/const/AGENTS.md`
   - `src/tetris/input/AGENTS.md`
   - `src/tetris/net/AGENTS.md`
   - `src/tetris/scenes/AGENTS.md`
   - `src/tetris/objects/AGENTS.md`
   - `src/tetris/logic/AGENTS.md`
   - `src/tetris/ui/AGENTS.md`
   - `src/tetris/view/AGENTS.md`
   - `server/AGENTS.md`
   - `test/unit/AGENTS.md`

## Architecture Quick Map
```text
src/tetris/
  game.ts                Client bootstrap + scene registration
  engine.ts              Core orchestration (playfield/hold/queue/indicator)
  const/const.ts         Shared constants (timing, board, scoring tables)
  scenes/                Scene-level orchestration (single/1v1/n-multi)
  objects/               Board/piece/object state and rendering
  logic/                 Deterministic rules (score, garbage, bot)
  input/                 Keyboard/touch translation with DAS behavior
  net/                   Board codec + socket utility
  ui/                    Layout calculators + in-game overlays/helpers
  view/                  Gameplay visual effects
server/
  index.js               Express + Socket.io room state and protocol
test/unit/
  ...                    Domain-oriented unit tests
```

## Gameplay / Networking Baseline
- Rule target: 2009 Tetris Guideline (`2009 Tetris Design Guideline.md`).
- Playfield: 20x10, block size baseline from `getBlockSize()` in `const.ts`.
- Input handling should flow through `InputManager`, not ad-hoc scene key logic.
- 1v1 mode: room pair model (`p1`/`p2`) with board + garbage events.
- n-multi mode: snapshot-based room broadcast (`nMultiPlayScene` + server room snapshots).
- Server port default: `3031` (`PORT` env override supported).

## Cursor/Copilot Rules
- `.cursor/rules/`: not present
- `.cursorrules`: not present
- `.github/copilot-instructions.md`: not present
If these files are later added, treat them as authoritative and update this file.

## Install / Run
```bash
npm install
npm run dev
npm run server
```
- `npm run dev`: webpack dev server
- `npm run server`: multiplayer backend (`http://localhost:3031` by default)

## Build Commands
```bash
npm run dev-build
npm run build
```
- `dev-build`: development bundle
- `build`: production bundle (output in `build/`)

## Test Commands
Run all:
```bash
npm test
```
Run one exact file (preferred):
```bash
npm test -- --runTestsByPath test/unit/logic/scoreSystem.test.ts
```
Run one test by name:
```bash
npm test -- test/unit/logic/scoreSystem.test.ts -t "initial state"
```
Run by file pattern (current repo uses Jest 29):
```bash
npx jest --testPathPattern="scoreSystem"
```
Debug helpers:
```bash
npm test -- --listTests
npm test -- --showConfig
```
Notes:
- Use `--` when forwarding options through `npm test`.
- Jest 30 renamed `--testPathPattern` to `--testPathPatterns`.

## Lint / Format Status
- No ESLint config found.
- No Prettier config found.
- Do not invent lint steps; follow local file style.

## Ownership Boundaries
- `src/tetris/const/`: shared constants, enums, lookup tables
- `src/tetris/input/`: keyboard/touch translation + DAS behavior
- `src/tetris/net/`: board codec and socket helper utilities
- `src/tetris/scenes/`: orchestration and mode flow
- `src/tetris/objects/`: board/piece state and object rendering
- `src/tetris/logic/`: deterministic rule/scoring logic
- `src/tetris/ui/`: layout calculators and UI helpers
- `src/tetris/view/`: visual effects tied to gameplay events
- `server/`: socket protocol and room state
- `test/unit/`: deterministic unit tests by domain
Do not duplicate gameplay logic in scenes/UI when it belongs in logic/objects.

## Code Style Conventions
### Imports
- Use ES imports in TypeScript; CommonJS in server JS.
- Put framework/external imports first, local imports next.
- Prefer named imports.

### Naming
- Classes/interfaces/enums: PascalCase
- Functions/methods/variables: camelCase
- Module constants: UPPER_SNAKE_CASE
- Scene classes end with `Scene`

### Types
- Add explicit types for public function params/returns.
- Use interfaces for option/result/payload objects.
- Use nullable unions where needed (`Foo | null`).
- Avoid `any` unless truly unavoidable.

### Formatting
- Follow nearby file style first (repo is mostly 4-space style).
- Use early returns to reduce nesting.
- Prefer constants/metrics over magic numbers.
- Add comments only for non-obvious reasoning.

### Error Handling
- Validate state/payload before mutation.
- Guard socket emits/updates with room/player checks.
- Avoid empty catches.
- In scene shutdown paths, remove listeners and destroy resources.

## Testing Conventions
- Keep tests under `test/unit/` by domain.
- Keep tests deterministic and isolated.
- Use Phaser mock harness via jest config.
- Update tests when changing metrics, scoring, or socket contracts.
High-signal test files:
- `test/unit/ui/gameLayout.metrics.test.ts`
- `test/unit/scenes/layoutPositions.test.ts`
- `test/unit/logic/scoreSystem.test.ts`
- `test/unit/server/nMultiServer.test.ts`

## Multiplayer Rules
- Keep 1v1 and n-multi flows explicit and separate.
- Update client/server payload handling together.
- Preserve board codec compatibility unless intentionally migrating.
- Keep snapshot/broadcast payloads compact.

### Socket Event Families
- 1v1 core: `create_room`, `join_room`, `player_ready`, `update_state`, `send_garbage`, `game_over`, `request_restart`
- n-multi core: `nmulti_create_room`, `nmulti_join_room`, `nmulti_join_or_create`, `nmulti_update_state`, `nmulti_send_garbage`, `nmulti_game_over`, `nmulti_restart`
- When changing event payloads, update:
  1) server handlers in `server/index.js`
  2) scene handlers in `playScene.ts` / `nMultiPlayScene.ts`
  3) matching tests in `test/unit/server/*` and scene/layout tests

## Asset File Rules
- All files under `assets/` must have git file mode `755` (executable).
- When adding new asset files, run `git update-index --chmod=+x <file>` before committing.

## Security Rules
- Do not inject unsanitized user strings into `innerHTML`.
- Prefer `textContent` or Phaser text objects for user strings.
- Never commit secrets (`.env`, credentials, tokens).

## Agent Execution Checklist
Before edits:
1. Identify owner layer (`scenes`, `objects`, `logic`, `ui`, `server`).
2. Find and mirror an existing pattern nearby.
3. Identify impacted tests.
After edits:
1. Run targeted single-file test(s).
2. Run full suite: `npm test`.
3. Run build: `npm run build`.
4. Verify only intended files changed.

## Quick Command Set
```bash
npm install
npm run dev
npm run server
npm test -- --runTestsByPath test/unit/logic/scoreSystem.test.ts
npm test
npm run build
```
