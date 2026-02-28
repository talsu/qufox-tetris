# UNIT TEST GUIDE

## OVERVIEW
`test/unit/` contains deterministic tests organized by domain.
The suite includes both classic unit tests and targeted server integration tests.
Tests should validate behavior contracts through production code paths.

## WHERE TO LOOK
- `logic/`: scoring, rules, bot behavior, garbage generation.
- `ui/`: layout metrics, safe DOM rendering, style/font helpers.
- `scenes/`: orchestration/layout/authoritative sync interaction tests.
- `net/`: board codec, snapshot merge behavior, listener lifecycle helpers.
- `server/`: payload guards, policy helpers, authoritative simulation, real socket integration (`serverIndex.integration.test.ts`).

## CONVENTIONS
- Keep test names behavior-focused and stable.
- Use exact-file execution during iteration (`--runTestsByPath`).
- Keep fixtures minimal; avoid hidden global state.
- Prefer deterministic assertions over timing-fragile checks.
- Prefer tests against real modules/handlers over test-local logic replicas.

## ANTI-PATTERNS
- Mixing multiple unrelated features into one test.
- Depending on random outputs without seeding/normalization.
- Duplicating server room logic inside tests instead of exercising actual server handlers.
- Editing source logic just to satisfy brittle expectations.

## NOTES
- Phaser is mocked by `test/mocks/phaserMock.ts` via `jest.config.js` mapping.
- `test/unit/server/serverIndex.integration.test.ts` runs in node environment, compiles server TS, spawns a real server process, and binds a local port.
- If layout constants change, update `ui/gameLayout.metrics.test.ts` and `scenes/layoutPositions.test.ts` together.
- If runtime HUD placement behavior changes, also update `ui/runtimeHudLayout.test.ts`.
