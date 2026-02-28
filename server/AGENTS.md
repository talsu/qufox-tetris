# SERVER GUIDE

## OVERVIEW
`server/` hosts the Socket.io multiplayer backend (1v1 + n-multi room state machines).
`server/index.ts` is authoritative for simulation, snapshots, room membership, and restart/resume flow.

## WHERE TO LOOK
- `index.ts`: Express static hosting, socket handlers, authoritative loops, room lifecycle.
- `index.js`: runtime bootstrap that loads compiled `dist/server/index.js`.
- `roomModePolicy.ts`: shared create/join/lifecycle/token policy helpers.
- `botController.ts`: server-side bot input planner for authoritative matches.
- `randomNames.js`: random player-name pool for n-multi joins.
- `src/shared/core/authoritativeMatch.ts`: deterministic simulation core used by server loops.

## CONVENTIONS
- Keep 1v1 and n-multi protocol paths explicit; avoid implicit cross-mode behavior.
- Validate payloads with shared guards from `src/shared/types/socketPayloads.ts` before mutation/emits.
- Keep server-authoritative ownership for gameplay state; client-side authoritative claims are compatibility/no-op paths.
- Update room list broadcasts on create/join/leave transitions.
- Maintain `bySocket`/player mappings and cleanup paths consistently on disconnect.
- Serve client assets from `../build` to match webpack output.

## ANTI-PATTERNS
- Embedding client-only rendering/gameplay logic inside socket handlers.
- Broadcasting full state every tick when dirty-player deltas suffice.
- Accepting unsanitized room/player strings and reflecting as HTML on clients.
- Mutating room structures without corresponding cleanup in disconnect/restart flows.
- Writing server tests that re-implement room logic instead of exercising real handlers.

## NOTES
- `index.ts` is large; isolate helpers when adding new protocol behavior.
- For protocol changes, update matching client scene handlers and server tests together.
- High-signal server tests:
  - `test/unit/server/socketPayloads.test.ts`
  - `test/unit/server/roomModePolicy.test.ts`
  - `test/unit/server/serverIndex.integration.test.ts`
