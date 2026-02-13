# CLAUDE.md

## Project Overview

A web-based Tetris game built with **Phaser 3** and **TypeScript**, implementing the official **2009 Tetris Design Guideline**. Features single-player, 1v1 multiplayer, and N-player free-for-all modes with real-time networking via Socket.io.

## Commands

```bash
npm install              # Install dependencies
npm start                # Dev server at http://localhost:8080 (production mode)
npm run dev              # Dev server at http://localhost:8080 (development mode)
npm test                 # Run Jest unit tests
npm run build            # Production build (output: /build/)
npm run dev-build        # Development build (output: /build/)
npm run server           # Multiplayer server at http://localhost:3031
```

The multiplayer server port defaults to 3031 and is configurable via the `PORT` environment variable.

## Tech Stack

- **Game Engine:** Phaser 3.90.0
- **Language:** TypeScript 5 (target: ES2017, module: CommonJS)
- **Bundler:** Webpack 5 (entry: `src/tetris/game.ts`, output: `/build/`)
- **Tests:** Jest 29 + ts-jest + jsdom (Phaser mocked via `test/mocks/phaserMock.ts`)
- **Multiplayer:** Express 5 + Socket.io 4
- **No linter/formatter configured**

## Architecture

### Directory Structure

```
src/tetris/
  game.ts                    # Entry point: Phaser config, scene registration, Game class
  engine.ts                  # Core game engine: orchestrates PlayField, hold, queue, scoring
  const/
    const.ts                 # All game constants (scoring, SRS kick data, tetromino shapes, timing)
  scenes/
    baseScene.ts             # Base Phaser.Scene with layout mode detection & responsive resize
    menuScene.ts             # Main menu with mode selection (Single, 1v1, N-Multi)
    lobbyScene.ts            # Room lobby (exports LobbyScene for 1v1, NMultiLobbyScene for N-multi)
    playScene.ts             # Single-player & 1v1 multiplayer gameplay scene
    nMultiPlayScene.ts       # N-player multiplayer gameplay scene
  input/
    inputManager.ts          # Keyboard & touch input with DAS (Delayed Auto Shift)
  logic/
    gameRules.ts             # Static SRS kick data lookup & scoring table lookup
    scoreSystem.ts           # Score calculation: T-spins, combos, back-to-back, levels
    garbageGenerator.ts      # Multiplayer garbage line generation
    botManager.ts            # AI logic for automated play via input simulation
  objects/
    objectBase.ts            # Base class (extends Phaser.Events.EventEmitter)
    playField.ts             # Main 10x20 board: spawning, collision, line clears, lock delay
    tetromino.ts             # Piece logic: SRS rotation, wall kicks, ghost piece, drop tracking
    tetrominoBox.ts          # Hold box UI component
    tetrominoBoxQueue.ts     # Next queue (6-piece preview) with 7-bag randomizer
    levelIndicator.ts        # Stats display (standard vertical + compact horizontal for mobile)
    miniPlayField.ts         # Compact opponent board with inline rank + score for N-multiplayer
  net/
    boardCodec.ts            # Board serialization: 200-char string (10x20, one char per cell)
    socketUtils.ts           # Socket.io URL config (localhost:3031 or window.location.origin)
  ui/
    gameLayout.ts            # Layout factory with desktop/mobile-portrait responsive branches
    inGameMenu.ts            # Pause/Game Over DOM overlays
    leaderboardPanel.ts      # N-multiplayer leaderboard (DOM-based, unused — rank now inline in miniPlayField)
    uiStyles.ts              # Shared UI styling utilities
  view/
    playFieldEffects.ts      # Visual effects (line clear animations)
server/
  index.js                   # Express + Socket.io server (1v1 & N-multi room management)
test/
  setup.ts                   # Jest setup (imports Phaser mock)
  mocks/
    phaserMock.ts            # Phaser mock for unit testing without browser
  unit/                      # All unit tests (see Testing section)
```

### Boot Sequence

1. `index.html` loads Webpack bundles (`vendors.bundle.js` + `main.bundle.js`)
2. `game.ts` registers 5 scenes: MenuScene, LobbyScene, PlayScene, NMultiLobbyScene, NMultiPlayScene
3. Phaser starts `MenuScene` (first in array)
4. User navigates to gameplay scenes via menu/lobby

### Key Conventions

- **Input logic** must go through `InputManager`, never directly in scene classes
- **UI elements** (buttons, menus, overlays) belong in `src/tetris/ui/`, not in scene `create()` methods
- **Game rules** follow the 2009 Tetris Design Guideline (SRS rotation, 7-bag randomizer, T-spin detection, back-to-back combos)
- **Pure logic** in `src/tetris/logic/` -- `GameRules` and `GarbageGenerator` are stateless
- **Event-driven** communication between game objects via `Phaser.Events.EventEmitter`
- **Factory pattern** in `gameLayout.ts` avoids duplication between single/multi/n-multi layouts and handles desktop vs mobile-portrait branches
- **Responsive layout** via `LayoutMode` (`desktop` / `mobile-portrait` / `mobile-landscape`) detected in `BaseScene.getLayoutMode()`. Mobile portrait rearranges UI vertically (hold+next above field, compact stats below); mobile landscape uses desktop layout
- **DOM overlays** for menus (outside Phaser scene graph) in `src/tetris/ui/`; CSS media queries in `modern-ui.css` handle phone/tablet sizing
- **Camera zoom** handles responsive scaling; base block size is fixed at 32px
- **Networking** uses compact BoardCodec serialization (single character per cell: I/J/L/O/S/T/Z/G/0)
- **Collaboration language**: Commit messages and PR descriptions must be written in English
- **Response language**: Prefer Korean for assistant responses whenever possible

### Game Constants (src/tetris/const/const.ts)

| Constant | Value | Description |
|---|---|---|
| Playfield size | 20 rows x 10 cols | Standard Guideline playfield |
| Block size | 32px | Base unit; scaling via camera zoom |
| DAS initial | 183ms | Delayed Auto Shift initial delay |
| DAS repeat | 50ms | Auto-repeat rate |
| Lock delay | 500ms | Time before piece locks after landing |
| ARE | 200ms | Entry delay between pieces |
| Line clear delay | 400ms | Animation time for line clears |

### Scoring Events

Single (100), Double (300), Triple (500), Tetris (800), T-Spin (400), T-Spin Mini (100), T-Spin Single (800), T-Spin Mini Single (200), T-Spin Double (1200), T-Spin Triple (1600). Back-to-back multiplier: 1.5x. Combo bonus: 50 * combo * level.

### Multiplayer Architecture

**1v1 Mode:**
- PlayScene sends board state at 10Hz (100ms interval) via `update_state`
- Garbage exchange via `send_garbage` / `receive_garbage` events
- Server manages rooms with 2-player capacity

**N-Multiplayer Mode:**
- NMultiPlayScene broadcasts snapshots every 500ms
- Server selectively broadcasts (each player gets others' state, not their own)
- Up to 100 players per room
- Rank (`#N`) and score displayed inline on each MiniPlayField (no separate leaderboard panel)
- Players eliminated on game over (overlay shown on mini boards)
- URL-based room joining: `/n-multi/{roomName}`

**Bot Mode (Debug/Testing):**
- Activated via URL query parameter: `?bot={level}` (level: 1-100)
- Works in both 1v1 (`/multi/{roomName}?bot=50`) and N-Multi (`/n-multi/{roomName}?bot=50`)
- Bot simulates human inputs (left, right, rotate, etc.) based on heuristic board evaluation
- Higher levels increase input speed and placement accuracy

**Socket Events (Client -> Server):**
- `create_room`, `join_room`, `player_ready`, `update_state`, `send_garbage`, `game_over`, `request_restart`
- `nmulti_create_room`, `nmulti_join_room`, `nmulti_join_or_create`, `nmulti_update_state`, `nmulti_send_garbage`, `nmulti_game_over`, `nmulti_restart`

## Testing

### Running Tests

```bash
npm test                     # Run all tests
npx jest test/unit/logic/    # Run tests in a specific directory
npx jest --testPathPattern="scoreSystem"  # Run tests matching a pattern
```

### Test Architecture

- **Environment:** jsdom (simulates browser DOM)
- **Phaser mock:** `test/mocks/phaserMock.ts` provides stub implementations so tests run without a browser
- **Module aliases:** `phaser` -> mock, `src/*` -> source files (configured in `jest.config.js`)
- **Setup file:** `test/setup.ts` runs before all test suites

### Test Coverage

Tests cover:
- `logic/gameRules.test.ts` -- SRS rotation kick data
- `logic/scoreSystem.test.ts` -- Scoring (line clears, T-spins, combos, back-to-back, levels)
- `logic/botManager.test.ts` -- Bot AI logic and placement heuristics
- `logic/scoreSystem_garbage.test.ts` -- Garbage count from scoring events
- `logic/garbageGenerator.test.ts` -- Garbage line generation
- `net/boardCodec.test.ts` -- Board serialization/deserialization
- `ui/leaderboardPanel.test.ts` -- Leaderboard rendering
- `server/nMultiServer.test.ts` -- Server-side N-multiplayer logic
- `game_over_conditions.test.ts` -- Game over detection
- `garbage.test.ts`, `garbage_collision.test.ts` -- Garbage mechanics
- `guideline.test.ts` -- Tetris Guideline compliance
- `playField_clear_bug.test.ts`, `playField_complex_clear.test.ts` -- Line clear edge cases
- `playField_delay.test.ts` -- Lock delay mechanics
- `score_stats.test.ts` -- Score and stats tracking
- `tetromino_visual_sync.test.ts` -- Piece visual synchronization
- `visual_effects.test.ts` -- Visual effect animations

### Writing Tests

- Place tests in `test/unit/` mirroring source structure where applicable
- Import game logic directly; Phaser is automatically mocked
- Use `CONST` from `src/tetris/const/const.ts` for game constants in assertions
- Tests for pure logic (`gameRules`, `scoreSystem`, `garbageGenerator`, `boardCodec`) do not need Phaser at all
