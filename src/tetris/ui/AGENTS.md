# UI GUIDE

## OVERVIEW
`src/tetris/ui/` owns layout calculations and shared text/panel/button styling.
Use this directory for presentation logic; keep gameplay rules out.

## WHERE TO LOOK
- `gameLayout.ts`: canonical responsive metrics and placement calculators.
- `runtimeHudLayout.ts`: shared runtime relayout helper for hold/queue/indicator/hold-zone across scenes.
- `uiStyles.ts`: shared text style presets and panel/text helpers.
- `kenneyAssets.ts`: Kenney UI texture key constants.
- `kenneyButton.ts`: reusable Kenney button visual/state helpers.
- `inGameMenu.ts`: pause/game-over Phaser overlays and callbacks.
- `gameOverlayControls.ts`: overlay controls used in active gameplay scenes.
- `fontLoader.ts`: font readiness utility before text-heavy UI rendering.

## CONVENTIONS
- Reuse `getLayoutMetrics()` and `calc*` helpers for new placements.
- For scene-time HUD repositioning, use `applyRuntimeHudLayout(...)` instead of duplicating placement branches.
- Reuse `createKenneyButtonVisual`/`setKenneyButtonState` instead of duplicating button logic.
- Keep desktop/mobile-portrait branches explicit and testable.
- Build text styles from `uiStyles.ts` presets for visual consistency.
- Prefer Phaser text objects for user-visible strings.
- Keep `LayoutMode` handling centralized and consistent with scenes.

## ANTI-PATTERNS
- Reintroducing inline style/button state duplication across UI modules.
- Rendering user input via `innerHTML` without sanitization.
- Hardcoding pixel offsets when block-based metrics already exist.
- Embedding gameplay/network state mutation into UI handlers.

## NOTES
- `gameLayout.ts` is the main responsive authority; update tests when layout constants change.
- Keep tuning knobs in `LayoutMetrics`; avoid scattering scene-local magic offsets when the value is layout policy.
- If a UI change affects mobile portrait composition, verify in both portrait and desktop flows.
- High-signal tests:
  - `test/unit/ui/gameLayout.metrics.test.ts`
  - `test/unit/ui/runtimeHudLayout.test.ts`
  - `test/unit/ui/fontLoader.test.ts`
