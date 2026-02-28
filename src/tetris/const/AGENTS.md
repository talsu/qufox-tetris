# CONST GUIDE

## OVERVIEW
`src/tetris/const/` is the single source of truth for shared enums, timing, board metrics, scoring tables, and input direction contracts.
Use these constants instead of hardcoded values in scenes/objects/logic.

## WHERE TO LOOK
- `const.ts`: `CONST` tables, `TetrominoType`, `RotateType`, `InputState`, `InputDirection`, `INPUT_DIRECTIONS`, `isInputDirection()`, `BackgroundTheme`, and `getBlockSize()`.

## CONVENTIONS
- Add shared metrics/timings to `CONST`, not inline literals.
- Keep enum values and keys stable; many modules depend on exact strings.
- Preserve board baseline (`20x10`) unless migration is intentional.
- When adding/removing input actions, update `INPUT_DIRECTIONS` and any dependent payload guards/tests.
- When changing scoring/timing constants, update matching tests in `test/unit/logic/` and `test/unit/ui/`.

## ANTI-PATTERNS
- Duplicating timing/scoring/input-direction literals in other directories.
- Renaming enum members without sweeping all references.
- Changing guideline-sensitive values without regression tests.

## NOTES
- `getBlockSize()` returns fixed base size; scaling is camera/layout-driven.
- `InputDirection`/`isInputDirection()` are shared boundaries for input manager + socket payload validation.
- For guideline work, cross-check `2009 Tetris Design Guideline.md`.
