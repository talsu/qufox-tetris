# AGENTS.md
Guide for coding agents operating in this repository.

## Project Summary
- Tech: TypeScript, Phaser 3, Webpack 5, Jest (ts-jest), Socket.io, Express
- Client entry: `src/tetris/game.ts`
- Server source entry: `server/index.ts` (runtime bootstrap: `server/index.js` -> `dist/server/index.js`)
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
  const/const.ts         Shared constants, enums, and input direction guards
  scenes/                Scene-level orchestration (single/1v1/n-multi)
  objects/               Board/piece/object state and rendering
  logic/                 Deterministic rules (score, garbage, bot)
  input/                 Keyboard/touch translation with DAS behavior
  net/                   Board codec + snapshot/listener transport helpers
  ui/                    Layout calculators + runtime HUD layout + in-game overlays/helpers
  view/                  Gameplay visual effects and popup feedback
server/
  index.ts               Express + Socket.io room state/protocol authority
  roomModePolicy.ts      Shared create/join/lifecycle policy helpers
  botController.ts       Server-side bot input planner
test/unit/
  ...                    Domain-oriented tests + server integration coverage
```

## Gameplay / Networking Baseline
- Rule target: 2009 Tetris Guideline (`2009 Tetris Design Guideline.md`).
- Playfield: 20x10, block size baseline from `getBlockSize()` in `const.ts`.
- Input handling should flow through `InputManager`, not ad-hoc scene key logic.
- 1v1 mode: room pair model (`p1`/`p2`) with authoritative tick snapshots.
- n-multi mode: per-player authoritative sim + delta snapshot broadcast.
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
- `npm run server`: compiles server runtime, then starts multiplayer backend (`http://localhost:3031` by default)

## Build Commands
```bash
npm run dev-build
npm run build
npm run server:build
```
- `dev-build`: development bundle
- `build`: production bundle (output in `build/`)
- `server:build`: compile server TypeScript to `dist/server/`

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
Run server integration flow test:
```bash
npm test -- --runTestsByPath test/unit/server/serverIndex.integration.test.ts
```
Debug helpers:
```bash
npm test -- --listTests
npm test -- --showConfig
```
Notes:
- Use `--` when forwarding options through `npm test`.
- `test/unit/server/serverIndex.integration.test.ts` binds a local TCP port and spawns a node server process.

### E2E Tests (Playwright)

E2E tests run on an **independent port (9090)** — they never reuse an existing dev server.
You can run `npm run dev` (port 8080) simultaneously without conflicts.

```bash
npm run test:e2e             # All E2E tests
npm run test:e2e:headed      # With visible browser
npm run test:e2e:ui          # Playwright UI
npm run test:perf            # Performance tests
npm run test:all             # Unit + E2E
```

E2E tests target `test/e2e/` and `test/performance/` via `playwright.config.ts`.
Unit tests are excluded from Playwright (Jest owns them).

### Important: Game UI is Canvas, not DOM

Most game UI (menu buttons, playfield, HUD) is rendered on **Phaser Canvas**, not as DOM elements.
DOM selectors like `.menu-container` or `#singleBtn` will NOT work in E2E tests.

Use canvas coordinate clicking instead:

```typescript
const canvas = page.locator('#game canvas').first();
await expect(canvas).toBeVisible({ timeout: 15000 });
await page.waitForTimeout(2000); // Wait for menu render

const box = await canvas.boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.42); // Single Player
```

Or use the GameHarness fixture:
```typescript
import { test, expect } from '../../harness/fixtures';

test('feature', async ({ game }) => {
    await game.gotoMenu();
    await game.clickSinglePlayer();
    await game.hardDrop();
});
```

The only DOM-based UI is `InGameMenu` (pause menu) — accessible via `.menu-panel`, `.menu-panel--pause`, etc.

## Lint / Format Status
- ESLint: `.eslintrc.js` (basic TypeScript config)
- Prettier: `.prettierrc.json` (4-space, singleQuote, trailingComma)
- Pre-commit hook: `.husky/pre-commit` → `lint-staged`
  - ESLint `--fix` + Prettier `--write` + related unit tests

## Ownership Boundaries
- `src/tetris/const/`: shared constants, enums, lookup tables
- `src/tetris/input/`: keyboard/touch translation + DAS behavior
- `src/tetris/net/`: board codec, snapshot handling, socket listener lifecycle helpers
- `src/tetris/scenes/`: orchestration and mode flow
- `src/tetris/objects/`: board/piece state and object rendering
- `src/tetris/logic/`: deterministic rule/scoring logic
- `src/tetris/ui/`: layout calculators and UI helpers
- `src/tetris/view/`: visual feedback tied to gameplay events
- `server/`: socket protocol and room state authority
- `test/unit/`: deterministic tests and targeted integration tests
Do not duplicate gameplay logic in scenes/UI when it belongs in logic/objects.

## Code Style Conventions
### Imports
- Use ES imports in TypeScript; CommonJS only where existing server JS bootstrap requires it.
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
- Use Phaser mock harness via jest config for browser-side units.
- Prefer production-path tests over test-local logic replicas.
- Update tests when changing metrics, scoring, socket contracts, or payload guards.

### E2E Tests
- Located in `test/e2e/flows/` — user flow scenarios
- Located in `test/e2e/visual/` — visual regression (baseline snapshots exist)
- Located in `test/performance/` — load time, canvas size thresholds
- Use `GameHarness` from `test/harness/gameHarness.ts` for canvas interactions
- E2E runs on independent port 9090 (never reuses dev server)

High-signal test files:
- `test/unit/ui/gameLayout.metrics.test.ts`
- `test/unit/scenes/layoutPositions.test.ts`
- `test/unit/logic/scoreSystem.test.ts`
- `test/unit/server/socketPayloads.test.ts`
- `test/unit/server/serverIndex.integration.test.ts`
- `test/e2e/flows/single-player.spec.ts`

## Multiplayer Rules
- Keep 1v1 and n-multi flows explicit and separate.
- Update client/server payload handling together.
- Preserve board codec compatibility unless intentionally migrating.
- Keep snapshot/broadcast payloads compact.

### Socket Event Families
- 1v1 lobby/core: `create_room`, `join_room`, `join_or_create`, `player_ready`, `request_restart`
- 1v1 authoritative: `auth_input`, `auth_presence`, `resume_auth`, `auth_snapshot`, `auth_receive_garbage`, `auth_round_over`
- 1v1 legacy compatibility: `update_state`, `send_garbage`, `game_over`
- n-multi lobby/core: `nmulti_create_room`, `nmulti_join_room`, `nmulti_join_or_create`, `nmulti_leave_room`, `nmulti_restart`
- n-multi authoritative: `nmulti_auth_input`, `nmulti_presence`, `nmulti_auth_snapshot`, `nmulti_snapshot`, `nmulti_request_full_sync`
- n-multi legacy compatibility: `nmulti_update_state`, `nmulti_send_garbage`, `nmulti_game_over`
- When changing event payloads, update:
  1) server handlers in `server/index.ts`
  2) scene handlers in `playScene.ts` / `nMultiPlayScene.ts` / `menuScene.ts`
  3) matching tests in `test/unit/server/*` and scene payload-guard tests

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
3. Run E2E if UI changed: `npm run test:e2e`.
4. Run build: `npm run build`.
5. Verify only intended files changed.

## Quick Command Set
```bash
npm install
npm run dev                     # Dev server (port 8080)
npm run server                  # Game server (port 3031)
npm test                        # All unit tests
npm test -- --runTestsByPath test/unit/logic/scoreSystem.test.ts
npm test -- --runTestsByPath test/unit/server/serverIndex.integration.test.ts
npm run test:e2e                # E2E tests (independent port 9090)
npm run test:perf               # Performance tests
npm run test:all                # Unit + E2E
npm run build                   # Production bundle
```
