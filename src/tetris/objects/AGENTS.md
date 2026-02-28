# OBJECTS GUIDE

## OVERVIEW
`src/tetris/objects/` owns board/piece state and object-level rendering.
Scenes should orchestrate; objects should decide state transitions.

## WHERE TO LOOK
- `playField.ts`: main board lifecycle (spawn, gravity, lock, clear, garbage, authoritative apply).
- `tetromino.ts`: piece movement, rotation, SRS kick handling, ghost logic.
- `tetrominoBox.ts`: hold box behavior and rendering.
- `tetrominoBoxQueue.ts`: next queue + 7-bag generation hooks.
- `levelIndicator.ts`: score/stats panel updates from engine stats.
- `miniPlayField.ts`: opponent mini board rendering with pooling.
- `objectBase.ts`: shared EventEmitter base for game objects.

## CONVENTIONS
- Keep collision and board rules in `playField.ts` and `tetromino.ts` only.
- Emit gameplay events from objects; consume them in `engine.ts` or scenes.
- Use constants from `src/tetris/const/const.ts` for timing/sizes/types.
- Keep object methods deterministic for the same input state.
- Keep board serialization boundaries explicit via `BoardCodec` (`serializeEncoded` / `deserializeEncoded`).
- For visual effects tied to board events, trigger through `PlayFieldEffects` / popup helpers.

## ANTI-PATTERNS
- Duplicating SRS/collision logic in scenes or UI modules.
- Mixing socket protocol handling directly into object classes.
- Mutating board-size/timing constants inline.
- Recreating heavy display objects each tick when pooling is available.

## NOTES
- `playField.ts` and `tetromino.ts` are complexity hotspots; prefer small helper extractions for new features.
- Keep remote-board rendering paths separate from local authoritative board state.
- After garbage insertion, active-piece blocked-position/ghost refresh must stay in sync.
