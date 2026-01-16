# qufox-tetris
qufox-tetris is a web-based Tetris game built with the Phaser 3 framework. It is driven entirely by HTML5 and TypeScript, providing a seamless gameplay experience without the need for external plugins.

## Original Implementation
Unlike many Tetris clones that fork existing repositories or follow common tutorials, the core engine of **qufox-tetris** was built independently from the ground up. By strictly interpreting the official Tetris Guideline 2009 documentation, all mechanics—including piece movement, the Super Rotation System (SRS), and the scoring engine—are original implementations designed to ensure a clean, unique, and idiomatic codebase.

## Play Online
Live service available at: [https://talsu.github.io/qufox-tetris/](https://talsu.github.io/qufox-tetris/)

## Features
- **Responsive Design:** Automatically adjusts layout and block sizes to fit various screen resolutions and aspect ratios.
- **Guideline 2009 Compliance:** Rigorously follows the Tetris Guideline 2009 standards, including the Super Rotation System (SRS), 7-Bag Random Generator, and Extended Placement (move/rotate lock-down limit).
- **Scoring System:** Supports standard scoring for Single, Double, Triple, and Tetris line clears, as well as T-Spins, Combos, and Back-to-Back bonuses.
- **Enhanced UI:** Features a 6-piece Next Queue with optimized visibility and a Hold box for advanced strategic planning.

## Controls
| Action | Key |
| :--- | :--- |
| **Move Left / Right** | `Left / Right Arrow` |
| **Soft Drop** | `Down Arrow` |
| **Hard Drop** | `Space` |
| **Rotate Clockwise** | `Up Arrow` / `X` |
| **Rotate Anticlockwise** | `Z` / `Ctrl` |
| **Hold** | `C` |
| **Pause / Resume** | `Esc` |

## Installation
```bash
# Clone the repository
git clone https://github.com/talsu/qufox-tetris.git
cd qufox-tetris

# Install dependencies
npm install
```

## Development
To run the development server with Hot Module Replacement (HMR):
```bash
npm start
```

## Build
To generate a production-ready bundle:
```bash
npm run build
```

## Testing
This project uses Jest for unit testing. To run the tests:
```bash
# Run all tests
npx jest

# Run specific test file
npx jest test/unit/engine.test.ts
```

## Technical Specifications
- **Game Engine:** Phaser 3.90.0
- **Language:** TypeScript
- **Bundler:** Webpack 5
- **Rotation System:** Super Rotation System (SRS)
- **Randomization:** 7-Bag Random Generator
- **Lock-down:** Extended Placement (15 manipulations per lowest row)