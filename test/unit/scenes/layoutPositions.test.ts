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

    expect(opponent.x).toBeCloseTo(149.6, 5);
    expect(opponent.y).toBeCloseTo(982.4, 5);
    expect(opponent.scale).toBeCloseTo(0.265, 5);
    expect(opponent.labelOffset).toBe(20);
  });

  test('keeps play scene multiplayer desktop opponent placement unchanged', () => {
    const dims = calcPlaySceneDimensions('desktop', 'multi');
    const opponent = calcPlaySceneOpponentLayout('desktop', dims.width, dims.height, 0);

    expect(opponent.x).toBe(752);
    expect(opponent.y).toBe(80);
    expect(opponent.scale).toBe(1);
    expect(opponent.labelOffset).toBe(30);
  });

  test('keeps n-multi player anchor unchanged', () => {
    const pos = calcNMultiPlayerPosition(704);
    expect(pos).toEqual({ x: 208, y: 56 });
  });
});
