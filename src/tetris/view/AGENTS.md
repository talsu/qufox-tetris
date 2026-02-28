# VIEW GUIDE

## OVERVIEW
`src/tetris/view/` handles gameplay visual effects and popup feedback.
This layer should render feedback only and must not own gameplay state transitions.

## WHERE TO LOOK
- `playFieldEffects.ts`: hard-drop trails, impact flashes, and line-clear animation timing.
- `playFieldPopup.ts`: action/combo popup tiering, shake, glow, rainbow, and particle feedback.

## CONVENTIONS
- Trigger effects from gameplay events emitted by objects/engine.
- Use shared timing metrics from `const.ts` for effect duration alignment.
- Keep effects non-blocking and lightweight.
- Destroy temporary graphics/emitters and timers after animation completes.
- Keep effect display layers aligned with playfield popup/container layering.

## ANTI-PATTERNS
- Applying gameplay mutations inside effect callbacks.
- Re-implementing effect logic directly in scenes or playField.
- Leaving particle/graphics/timer objects undisposed.

## NOTES
- Visual polish should not alter deterministic gameplay behavior.
- Validate effects under both desktop and mobile scaling.
