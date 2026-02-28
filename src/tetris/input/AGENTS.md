# INPUT GUIDE

## OVERVIEW
`src/tetris/input/` translates keyboard/touch gestures into normalized gameplay input events.
This is the only layer that should manage DAS/ARR timing and touch gesture translation.

## WHERE TO LOOK
- `inputManager.ts`: key mapping, touch gesture handling, DAS charging, and input dispatch.

## CONVENTIONS
- Route gameplay input through `InputManager` callback flow.
- Keep callback types strict: `(direction: InputDirection, state: InputState) => void`.
- Keep keyboard and touch behavior aligned to shared `InputState` semantics.
- Use constants from `const.ts` for repeat/initial delays.
- Always call `inputManager.destroy()` on scene shutdown to remove pointer listeners.
- Keep input processing fast; this runs every frame.

## ANTI-PATTERNS
- Adding ad-hoc key listeners in scenes for gameplay actions.
- Emitting raw string directions that are outside `InputDirection`.
- Hardcoding gesture thresholds in multiple files.
- Mutating gameplay state directly inside input translation logic.

## NOTES
- Mobile behavior depends on drag/tap thresholds and camera world coordinates.
- One-shot semantics (e.g., hard drop, rotate, hold) are enforced in scene/network handling layers.
- If input behavior changes, validate both desktop and mobile portrait flows.
