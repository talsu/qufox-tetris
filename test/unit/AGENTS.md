# UNIT TEST GUIDE

## OVERVIEW
`test/unit/` contains deterministic unit tests organized by domain.
Tests should validate behavior contracts, not incidental rendering details.

## WHERE TO LOOK
- `logic/`: scoring, rules, bot behavior, garbage generation.
- `ui/`: layout metrics and style utility behavior.
- `scenes/`: orchestration/layout interaction tests.
- `server/`: socket protocol and room state handling.
- `net/`: board codec compatibility tests.

## CONVENTIONS
- Keep test names behavior-focused and stable.
- Use exact-file execution during iteration (`--runTestsByPath`).
- Keep fixtures minimal; avoid hidden global state.
- Prefer deterministic assertions over timing-fragile checks.

## ANTI-PATTERNS
- Mixing multiple unrelated features into one test.
- Depending on random outputs without seeding/normalization.
- Editing source logic just to satisfy brittle expectations.

## NOTES
- Phaser is mocked by `test/mocks/phaserMock.ts` via `jest.config.js` mapping.
- If layout constants change, update `ui/gameLayout.metrics.test.ts` and `scenes/layoutPositions.test.ts` together.
