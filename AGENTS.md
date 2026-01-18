# AGENTS.md

## Codebase Architecture (Refactored)

This codebase has been refactored to separate concerns into logical modules. Please adhere to this structure for future changes.

### Key Directories
- `src/tetris/scenes/`: Contains Phaser Scenes. `PlayScene` is the main entry point but delegates logic.
- `src/tetris/input/`: Contains input handling (Keyboard/Touch). See `InputManager.ts`.
- `src/tetris/ui/`: Contains UI overlays (Menus). See `InGameMenu.ts`.
- `src/tetris/logic/`: Contains pure game logic (Rules, Scoring, Generators).
- `src/tetris/objects/`: Contains Phaser Game Objects (PlayField, Tetromino).

### Input Handling
- **Do NOT** add input logic directly to `PlayScene`.
- Use `InputManager` to map hardware events (keys, touch) to logical events (`onInput` callback).
- `InputManager` handles DAS (Delayed Auto Shift) and Touch gestures.

### UI
- **Do NOT** add UI elements (Buttons, Menus) directly to `PlayScene` `create()` method.
- Use `InGameMenu` for the Pause/Game Over screens.
- Create new UI classes in `src/tetris/ui/` for new interfaces.

### Game Logic
- `PlayField` manages the visual board state and `Tetromino` list.
- `GameRules` manages static rules (SRS Kick Tables, Scoring).
- `GarbageGenerator` manages garbage line creation data.
