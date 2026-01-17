import { GameRules } from "../../../src/tetris/logic/gameRules";
import { TetrominoType } from "../../../src/tetris/const/const";

describe('GameRules', () => {
    test('getKickData returns correct data', () => {
        expect(GameRules.getKickData(TetrominoType.O, "0>R")).toEqual([]);
        expect(GameRules.getKickData(TetrominoType.I, "0>R").length).toBeGreaterThan(0);
        expect(GameRules.getKickData(TetrominoType.T, "0>R").length).toBeGreaterThan(0);
    });

    test('getBaseScore returns correct scores', () => {
        expect(GameRules.getBaseScore('Single')).toBe(100);
        expect(GameRules.getBaseScore('Tetris')).toBe(800);
        expect(GameRules.getBaseScore('Unknown')).toBe(0);
    });

    test('getLineCount returns correct lines', () => {
        expect(GameRules.getLineCount('Single')).toBe(1);
        expect(GameRules.getLineCount('Tetris')).toBe(8);
    });
});
