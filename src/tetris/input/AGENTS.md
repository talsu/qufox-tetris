# INPUT GUIDE

## OVERVIEW
`src/tetris/input/` translates keyboard/touch gestures into normalized game inputs.
This is the only layer that should manage DAS/ARR-style input timing.

## WHERE TO LOOK
- `inputManager.ts`: key mapping, touch gesture handling, DAS charging, and input dispatch.

## CONVENTIONS
- Route gameplay input through `InputManager` callback flow.
- Keep keyboard and touch behavior aligned to shared `InputState` semantics.
- Use constants from `const.ts` for repeat/initial delays.
- Keep input processing fast; this runs every frame.

## ANTI-PATTERNS
- Adding ad-hoc key listeners in scenes for gameplay actions.
- Hardcoding gesture thresholds in multiple files.
- Mutating game state directly inside input translation logic.

## NOTES
- Mobile behavior depends on drag/tap thresholds and camera world coordinates.
- If input behavior changes, validate both desktop and mobile portrait flows.
