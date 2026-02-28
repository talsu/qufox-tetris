# LOGIC GUIDE

## OVERVIEW
`src/tetris/logic/` contains deterministic game rules and evaluation logic.
Keep this layer framework-light and easy to unit test.

## WHERE TO LOOK
- `gameRules.ts`: score/kick lookup tables and rule accessors.
- `scoreSystem.ts`: lock-result scoring, combo/B2B progression, stat aggregation, authoritative stat hydration.
- `garbageGenerator.ts`: garbage-line generation with hole constraints.
- `botManager.ts`: heuristic move search and input queue synthesis.

## CONVENTIONS
- Use explicit typed inputs/outputs for rule and score calculations.
- Preserve deterministic behavior for same input snapshot.
- Keep Phaser/DOM dependencies out of logic classes.
- Treat `scoreSystem.onLock(...)` as the canonical lock-evaluation entry point.
- Treat `ScoreSystem.calculateGarbageAttack(...)` as the single source for multiplayer attack calculation.
- Back new rule behavior with tests under `test/unit/logic/`.

## ANTI-PATTERNS
- Adding scene/UI concerns (alerts, rendering, DOM) in logic modules.
- Duplicating garbage attack formulas across modules.
- Hiding rule changes inside magic numbers without matching test updates.
- Diverging garbage/scoring rules from guideline behavior without regression tests.

## NOTES
- Multiplayer attack output is coupled to score/lock outcomes; review both gameplay and test expectations together.
- Bot heuristics are performance-sensitive; avoid avoidable O(n^2) scans in hot loops.
- `botManager` should reuse score-system attack logic rather than maintaining private scoring variants.
