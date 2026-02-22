# SERVER GUIDE

## OVERVIEW
`server/` hosts the Socket.io multiplayer backend (1v1 + N-multi room state machines).
This layer is the transport/state authority for room membership and broadcast behavior.

## WHERE TO LOOK
- `index.js`: Express static hosting, socket handlers, room lifecycle, snapshot broadcast.
- `randomNames.js`: Random player-name pool for N-multi joins.

## CONVENTIONS
- Keep 1v1 and N-multi protocol paths explicit; avoid implicit cross-mode behavior.
- Validate room/player existence before state mutation or emits.
- Update room list broadcasts on create/join/leave transitions.
- Keep periodic snapshot broadcast logic incremental where possible.
- Serve client assets from `../build` to match webpack output.

## ANTI-PATTERNS
- Embedding client-only gameplay logic into socket handlers.
- Broadcasting full state every tick when dirty-player deltas suffice.
- Accepting unsanitized room/player strings and reflecting as HTML on clients.
- Mutating room structures without cleanup on disconnect.

## NOTES
- `index.js` is large; isolate new helpers for readability and testability.
- For protocol changes, update matching client scene handlers and server tests together.
