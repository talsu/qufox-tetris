# UI GUIDE

## OVERVIEW
`src/tetris/ui/` owns layout calculations, DOM overlays, and shared text/panel/button styling.
Use this directory for presentation logic; keep gameplay rules out.

## WHERE TO LOOK
- `gameLayout.ts`: canonical responsive metrics and placement calculators.
- `uiStyles.ts`: shared text style presets and panel/text helpers.
- `kenneyAssets.ts`: Kenney UI texture key constants.
- `kenneyButton.ts`: reusable Kenney button visual/state helpers.
- `inGameMenu.ts`: pause/game-over DOM overlays and callbacks.
- `gameOverlayControls.ts`: overlay controls used in active gameplay scenes.
- `leaderboardPanel.ts`: n-multi leaderboard DOM rendering.
- `fontLoader.ts`: font readiness utility before text-heavy UI rendering.

## CONVENTIONS
- Reuse `getLayoutMetrics()` and `calc*` helpers for new placements.
- Reuse `createKenneyButtonVisual`/`setKenneyButtonState` instead of duplicating button logic.
- Keep desktop/mobile-portrait branches explicit and testable.
- Build text styles from `uiStyles.ts` presets for visual consistency.
- Prefer DOM APIs with `textContent` for user-provided strings.
- Keep `LayoutMode` handling centralized and consistent with scenes.

## ANTI-PATTERNS
- Reintroducing inline style/button state duplication across UI modules.
- Rendering user input via `innerHTML` without sanitization.
- Hardcoding pixel offsets when block-based metrics already exist.
- Embedding gameplay/network state mutation into UI handlers.

## NOTES
- `gameLayout.ts` is the main responsive authority; update tests when layout constants change.
- If a UI change affects mobile portrait composition, verify in both portrait and desktop flows.
- High-signal tests:
  - `test/unit/ui/gameLayout.metrics.test.ts`
  - `test/unit/ui/leaderboardPanel.test.ts`
  - `test/unit/ui/fontLoader.test.ts`
