import { CONST, getBlockSize } from '../../../src/tetris/const/const';
import {
  calcNMultiOpponentArea,
  calcNMultiSceneDimensions,
  calcPlaySceneDimensions,
  calcPortraitHudLayout,
  calcPortraitPosition,
} from '../../../src/tetris/ui/gameLayout';

describe('gameLayout metrics', () => {
  test('keeps mobile portrait hold/next HUD inside playfield bounds', () => {
    const block = getBlockSize();
    const dims = calcPlaySceneDimensions('mobile-portrait', 'single');
    const fieldPos = calcPortraitPosition(dims.width);
    const hud = calcPortraitHudLayout(fieldPos.x, fieldPos.y);

    const fieldRight = fieldPos.x + block * CONST.PLAY_FIELD.COL_COUNT;

    expect(hud.holdX).toBe(fieldPos.x);
    expect(hud.holdY).toBeCloseTo(94.4, 5);
    expect(hud.holdX + hud.holdWidth).toBeLessThanOrEqual(fieldRight);

    expect(hud.queueY).toBeCloseTo(70.4, 5);
    expect(hud.queueX + hud.queueWidth).toBeCloseTo(fieldRight, 5);
  });

  test('keeps scene dimension outputs unchanged', () => {
    expect(calcPlaySceneDimensions('mobile-portrait', 'single')).toEqual({ width: 384, height: 896 });
    expect(calcPlaySceneDimensions('mobile-portrait', 'multi')).toEqual({ width: 384, height: 1152 });
    expect(calcPlaySceneDimensions('desktop', 'single')).toEqual({ width: 704, height: 752 });
    expect(calcPlaySceneDimensions('desktop', 'multi')).toEqual({ width: 1088, height: 752 });

    expect(calcNMultiSceneDimensions('mobile-portrait')).toEqual({ width: 384, height: 1152 });
    expect(calcNMultiSceneDimensions('desktop')).toEqual({ width: 1152, height: 752 });
  });

  test('keeps n-multi opponent area bounds unchanged', () => {
    expect(calcNMultiOpponentArea('mobile-portrait', 384, 1152)).toEqual({
      x: 16,
      y: 944,
      width: 352,
      height: 192,
    });

    expect(calcNMultiOpponentArea('desktop', 1152, 752)).toEqual({
      x: 752,
      y: 80,
      width: 384,
      height: 608,
    });
  });
});
