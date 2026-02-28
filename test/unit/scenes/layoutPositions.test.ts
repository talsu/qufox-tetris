import {
  calcNMultiPlayerPosition,
  calcPlaySceneDimensions,
  calcPlaySceneOpponentLayout,
  calcPortraitPosition,
} from '../../../src/tetris/ui/gameLayout';

describe('scene layout positions', () => {
  test('keeps play scene multiplayer portrait opponent placement unchanged', () => {
    const dims = calcPlaySceneDimensions('mobile-portrait', 'multi');
    const playerPos = calcPortraitPosition(dims.width);
    const opponent = calcPlaySceneOpponentLayout('mobile-portrait', dims.width, dims.height, playerPos.y);

    expect(opponent.x).toBeCloseTo(133.6, 5);
    expect(opponent.y).toBeCloseTo(889.6, 5);
    expect(opponent.scale).toBeCloseTo(0.365, 5);
    expect(opponent.labelOffset).toBe(20);
  });

  test('keeps play scene multiplayer desktop opponent placement unchanged', () => {
    const dims = calcPlaySceneDimensions('desktop', 'multi');
    const opponent = calcPlaySceneOpponentLayout('desktop', dims.width, dims.height, 0);

    expect(opponent.x).toBeCloseTo(769.6, 5);
    expect(opponent.y).toBeCloseTo(115.2, 5);
    expect(opponent.scale).toBe(1);
    expect(opponent.labelOffset).toBe(24);
  });

  test('keeps n-multi player anchor unchanged', () => {
    const pos = calcNMultiPlayerPosition(704);
    expect(pos.x).toBe(212);
    expect(pos.y).toBeCloseTo(57.6, 5);
  });
});
