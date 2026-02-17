# Tetris® 2009 Design Guideline - Technical Specification

**Objective:** Develop a Tetris game that strictly adheres to the 2009 Tetris® Design Guideline.
**Target Platform:** [Insert Platform, e.g., Python/Pygame, Unity, Web/JS]

## 1. The Matrix (Playfield)
*   **Dimensions:** The playfield is 10 cells wide and 20 cells high (Visible Area) [1].
*   **Buffer Zone:** There is an invisible area of 20 rows above the visible Skyline (total height 40 rows). This is used for generation and "Lock Out" detection [2].
*   **Coordinates:** The guideline defines (1,1) as the bottom-left. However, for standard implementation, map (0,0) to the top-left of the visible area, handling the negative Y-axis for the Buffer Zone appropriately [3].

## 2. Tetrimino Definitions
Each Tetrimino consists of 4 Minos. The colors and shapes are fixed [4], [5].

| Type | Shape | Color | Hex Code (Approx) |
| :--- | :--- | :--- | :--- |
| **I** | Straight | Light Blue (Cyan) | `#00FFFF` |
| **O** | Square | Yellow | `#FFFF00` |
| **T** | T-Shape | Purple | `#800080` |
| **L** | L-Shape | Orange | `#FFA500` |
| **J** | J-Shape | Dark Blue | `#0000FF` |
| **S** | S-Shape | Green | `#008000` |
| **Z** | Z-Shape | Red | `#FF0000` |

## 3. Generation & Spawning
### 3.1. Random Generator (7-Bag System)
*   Do not use pure random generation. Use the **7-Bag System**.
*   Put one of each of the 7 Tetriminos into a "bag". Shuffle them. Deal them out. When the bag is empty, refill with the 7 pieces and shuffle again [6].

### 3.2. Start Location & Orientation
*   All Tetriminos spawn facing **North** [7].
*   **Spawn Rows:** Rows 21 and 22 (just above the visible Skyline) [7].
*   **Horizontal Centering:**
    *   **I-Tetrimino:** Occupies columns 4, 5, 6, 7 (Center).
    *   **O-Tetrimino:** Occupies columns 5, 6 (Center).
    *   **Others (J, L, S, Z, T):** Occupies columns 4, 5, 6 (3-wide bounding box) [7].
*   **Immediate Drop:** Upon generation, if the space immediately below is empty, the Tetrimino instantly drops one row [8].

## 4. Gameplay Mechanics

### 4.1. Gravity (Fall Speed)
Gravity is determined by the current Level (1-15).
**Formula:** $Speed = (0.8 - ((Level - 1) \times 0.007))^{(Level-1)}$ seconds per line [9].
*   *Level 1:* 1.0 sec/line
*   *Level 15:* 0.007 sec/line

### 4.2. Lock Down (Extended Placement)
*   **Timer:** When a piece lands on a surface, a 0.5-second timer begins [10].
*   **Reset Rule:** Rotating or Moving the piece resets the timer to 0.5s.
*   **Limit:** The timer can be reset up to **15 times** (movements/rotations) for a specific height. If the piece drops to a lower line, the counter resets [10].

### 4.3. Controls
*   **DAS (Delayed Auto Shift):** When holding Left/Right, wait ~0.3s, then move quickly (approx 0.5s to cross the whole matrix) [11], [12].
*   **Soft Drop:** Speed is **20x** the current gravity speed [13].
*   **Hard Drop:** Instantly locks the piece. 0.0001s duration [14].
*   **Ghost Piece:** A visual representation of where the piece will land is **mandatory** [15].
*   **Hold:** Pressing Hold swaps the current piece with the held piece. Allowed once per Lock Down cycle [16], [17].

## 5. Rotation System (SRS)
Implement the **Super Rotation System (SRS)**. Do not use simple grid rotation.
*   **Basic Rotation:** 90 degrees around the center [18].
*   **Wall Kicks:** If a basic rotation is blocked by walls or blocks, the game must sequentially test 5 offset positions (Kicks). If all 5 fail, rotation is ignored [18], [19].
*   *Note to AI:* You must implement the specific Offset Data Tables for "J, L, S, Z, T" pieces and the separate table for the "I" piece [20].

## 6. Scoring System
Score = `Base Points` × `Current Level`.

| Action | Base Points |
| :--- | :--- |
| Single | 100 |
| Double | 300 |
| Triple | 500 |
| Tetris | 800 |
| T-Spin (No lines) | 400 |
| T-Spin Single | 800 |
| T-Spin Double | 1200 |
| T-Spin Triple | 1600 |
| Combo / Back-to-Back | 1.5x Multiplier [21], [22] |

*   **Back-to-Back (B2B):** Awarded for consecutive "Tetris" or "T-Spin Line Clear" actions. The sequence is broken by a standard Single, Double, or Triple [23], [24].
*   **T-Spin Detection:** A T-Spin is valid if at least 3 of the 4 corners around the T-center are occupied by walls or blocks [25], [26].

## 7. Level Up System
*   **Variable Goal:** To advance to the next level, the player must clear lines.
*   **Formula:** `Goal = Current Level * 5`.
*   (e.g., Level 1 needs 5 lines, Level 2 needs 10 lines).
*   Lines are cumulative; usually 600 lines total to complete Level 15 [27].

## 8. Game Over Conditions
1.  **Block Out:** A new piece cannot spawn because existing blocks block its spawn location [28].
2.  **Lock Out:** A piece locks down completely above the Skyline (in the Buffer Zone) [29].

## 9. UI Requirements
*   **Next Queue:** Display 1 to 6 upcoming pieces [30].
*   **Hold Queue:** Display the held piece [16].
*   **Stats:** Score, Level, Lines Cleared [1].