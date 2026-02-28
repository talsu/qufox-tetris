# NET GUIDE

## OVERVIEW
`src/tetris/net/` owns client-side multiplayer transport helpers.
This includes compact board serialization, snapshot state handling, and socket listener lifecycle utilities.

## WHERE TO LOOK
- `boardCodec.ts`: encode/decode 20x10 board snapshots (string + nibble-packed binary).
- `snapshotManager.ts`: n-multi snapshot merge, validation, and full-sync detection.
- `socketListenerRegistry.ts`: event bind/unbind registry for scene-safe socket listener cleanup.
- `socketUtils.ts`: socket URL and path configuration.

## CONVENTIONS
- Keep codec format stable (`200` chars for `20x10`) unless migration is planned.
- Use `BoardCodec.stringToBinary(...)`/binary helpers on hot paths when possible.
- Validate decode inputs defensively (length/content guards).
- For n-multi snapshots, treat malformed full/delta payload entries as `needsFullSync` conditions.
- Return cloned state from snapshot-accessors to avoid external mutation leaks.
- Use `SocketListenerRegistry` for scene socket listeners and clear on teardown.
- Coordinate payload changes with `server/index.ts` and scene handlers.

## ANTI-PATTERNS
- Embedding scene-specific logic into codec/snapshot helpers.
- Silent format changes to encoded board strings.
- Mutating snapshot-manager internal maps from outside.
- Duplicating socket endpoint/listener cleanup logic in scene files.

## NOTES
- BoardCodec compatibility impacts both 1v1 and n-multi synchronization.
- For protocol updates, run server + scene tests together.
- High-signal tests:
  - `test/unit/net/boardCodec.test.ts`
  - `test/unit/net/snapshotManager.test.ts`
  - `test/unit/net/socketListenerRegistry.test.ts`
