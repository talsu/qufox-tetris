# OBJECTS GUIDE

## OVERVIEW
`src/tetris/objects/` owns board/piece state and object-level rendering.
Scenes should orchestrate; objects should decide state transitions.

## WHERE TO LOOK
- `playField.ts`: Main board lifecycle (spawn, gravity, lock, clear, garbage).
- `tetromino.ts`: Piece movement, rotation, SRS kick handling, ghost logic.
- `tetrominoBox.ts`: Hold box behavior and rendering.
- `tetrominoBoxQueue.ts`: Next queue + 7-bag generation hooks.
- `levelIndicator.ts`: Score/stats panel updates from engine stats.
- `miniPlayField.ts`: Opponent mini board rendering with pooling.
- `objectBase.ts`: Shared EventEmitter base for game objects.

## CONVENTIONS
- Keep collision and board rules in `playField.ts` and `tetromino.ts` only.
- Emit gameplay events from objects; consume them in `engine.ts` or scenes.
- Use constants from `src/tetris/const/const.ts` for timing/sizes/types.
- Keep object methods deterministic for the same input state.
- For visual effects tied to board events, trigger through `PlayFieldEffects`.

## ANTI-PATTERNS
- Duplicating SRS/collision logic in scenes or UI modules.
- Mixing socket protocol handling directly into object classes.
- Mutating board-size/timing constants inline.
- Recreating heavy display objects each tick when pooling is available.

## NOTES
- `playField.ts` and `tetromino.ts` are complexity hotspots; prefer small helper extractions for new features.
- Keep remote-board rendering paths separate from local authoritative board state.
