# CLAUDE.md

## Project Overview

A web-based Tetris game built with **Phaser 3** and **TypeScript**, implementing the official **2009 Tetris Design Guideline**. Features single-player and multiplayer modes with real-time networking via Socket.io.

## Commands

```bash
npm install              # Install dependencies
npm start                # Dev server at http://localhost:8080
npm test                 # Run Jest unit tests
npm run build            # Production build (output: /build/)
npm run server           # Multiplayer server at http://localhost:3000
```

## Architecture

### Directory Structure

- `src/tetris/scenes/` - Phaser Scenes (`PlayScene`, `MenuScene`, `LobbyScene`, etc.)
- `src/tetris/input/` - Input handling (`InputManager` for keyboard/touch with DAS)
- `src/tetris/ui/` - UI overlays (`InGameMenu`, `LeaderboardPanel`)
- `src/tetris/logic/` - Pure game logic (`GameRules`, `ScoreSystem`, `GarbageGenerator`)
- `src/tetris/objects/` - Phaser Game Objects (`PlayField`, `Tetromino`, etc.)
- `src/tetris/net/` - Networking (`BoardCodec`)
- `src/tetris/view/` - Visual effects (`PlayFieldEffects`)
- `src/tetris/const/` - Game constants
- `src/tetris/engine.ts` - Core game engine
- `src/tetris/game.ts` - Entry point (Phaser configuration)
- `server/index.js` - Express + Socket.io multiplayer server
- `test/unit/` - Jest unit tests

### Key Conventions

- **Input logic** must go through `InputManager`, never directly in `PlayScene`
- **UI elements** (buttons, menus) belong in `src/tetris/ui/`, not in scene `create()` methods
- **Game rules** follow the 2009 Tetris Design Guideline (SRS rotation, 7-bag randomizer, T-spin detection, back-to-back combos)
- `PlayField` manages the visual board and `Tetromino` list
- `GameRules` manages static rules (SRS kick tables, scoring)

## Tech Stack

- **Game Engine:** Phaser 3.90.0
- **Language:** TypeScript 5 (target: ES2017)
- **Bundler:** Webpack 5
- **Tests:** Jest 29 + ts-jest + jsdom
- **Multiplayer:** Express 5 + Socket.io 4
- **No linter/formatter configured**
