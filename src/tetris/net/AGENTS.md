# NET GUIDE

## OVERVIEW
`src/tetris/net/` owns client-side multiplayer transport helpers.
This includes compact board serialization and socket endpoint utilities.

## WHERE TO LOOK
- `boardCodec.ts`: encode/decode 20x10 board snapshots.
- `socketUtils.ts`: socket URL and path configuration.

## CONVENTIONS
- Keep codec format stable (`200` chars for `20x10`) unless migration is planned.
- Validate decode inputs defensively (length/content guards).
- Keep this layer framework-light and reusable by multiple scenes.
- Coordinate payload changes with `server/index.js` and scene listeners.

## ANTI-PATTERNS
- Embedding scene-specific logic into codec helpers.
- Silent format changes to encoded board strings.
- Duplicating socket endpoint logic in scene files.

## NOTES
- BoardCodec compatibility impacts both 1v1 and n-multi synchronization.
- For protocol updates, run server + scene tests together.
