# VIEW GUIDE

## OVERVIEW
`src/tetris/view/` handles gameplay visual effects.
This layer should render feedback only and must not own gameplay state transitions.

## WHERE TO LOOK
- `playFieldEffects.ts`: hard-drop trails, impact flashes, and line-clear animation timing.

## CONVENTIONS
- Trigger effects from gameplay events emitted by objects/engine.
- Use shared timing metrics from `const.ts` for effect duration alignment.
- Keep effects non-blocking and lightweight.
- Destroy temporary graphics/emitters after animation completes.

## ANTI-PATTERNS
- Applying gameplay mutations inside effect callbacks.
- Re-implementing effect logic directly in scenes or playField.
- Leaving particle/graphics objects undisposed.

## NOTES
- Visual polish should not alter deterministic gameplay behavior.
- Validate effects under both desktop and mobile scaling.
