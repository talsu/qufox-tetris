import { CONST, getBlockSize } from '../../../src/tetris/const/const';
import {
  calcDesktopHudLayout,
  calcNMultiOpponentArea,
  calcNMultiPlayerPosition,
  calcNMultiSceneDimensions,
  calcPlaySceneDimensions,
  calcPortraitHudLayout,
  calcPortraitPosition,
  getLayoutMetrics,
  getTopNavBarHeight,
} from '../../../src/tetris/ui/gameLayout';

describe('gameLayout metrics', () => {
  test('keeps mobile portrait hold/next HUD inside playfield bounds', () => {
    const block = getBlockSize();
    const dims = calcPlaySceneDimensions('mobile-portrait', 'single');
    const fieldPos = calcPortraitPosition(dims.width);
    const hud = calcPortraitHudLayout(fieldPos.x, fieldPos.y);

    const fieldRight = fieldPos.x + block * CONST.PLAY_FIELD.COL_COUNT;

    expect(hud.holdX).toBe(fieldPos.x);
    expect(hud.holdY).toBeCloseTo(113.6, 5);
    expect(hud.holdX + hud.holdWidth).toBeLessThanOrEqual(fieldRight);

    expect(hud.queueY).toBeCloseTo(89.6, 5);
    expect(hud.queueX + hud.queueWidth).toBeCloseTo(fieldRight, 5);
  });

  test('keeps scene dimension outputs unchanged', () => {
    expect(calcPlaySceneDimensions('mobile-portrait', 'single')).toEqual({ width: 384, height: 883.2 });
    expect(calcPlaySceneDimensions('mobile-portrait', 'multi')).toEqual({ width: 384, height: 1139.2 });
    expect(calcPlaySceneDimensions('desktop', 'single')).toEqual({ width: 896, height: 819.2 });
    expect(calcPlaySceneDimensions('desktop', 'multi')).toEqual({ width: 1248, height: 819.2 });

    expect(calcNMultiSceneDimensions('mobile-portrait')).toEqual({ width: 384, height: 1139.2 });
    expect(calcNMultiSceneDimensions('desktop')).toEqual({ width: 1408, height: 819.2 });
  });

  test('keeps n-multi opponent area bounds unchanged', () => {
    expect(calcNMultiOpponentArea('mobile-portrait', 384, 1139.2)).toEqual({
      x: 16,
      y: 867.2,
      width: 352,
      height: 256,
    });

    expect(calcNMultiOpponentArea('desktop', 1408, 819.2)).toEqual({
      x: 781.6,
      y: 75.2,
      width: 602.4,
      height: 720,
    });
  });

  test('aligns n-multi desktop tactical wall start with queue clearance contract', () => {
    const block = getBlockSize();
    const metrics = getLayoutMetrics();
    const dims = calcNMultiSceneDimensions('desktop');
    const topInset = getTopNavBarHeight('desktop');
    const player = calcNMultiPlayerPosition(dims.height, dims.width, topInset);
    const hud = calcDesktopHudLayout(player.x, player.y, 1, 1);
    const area = calcNMultiOpponentArea('desktop', dims.width, dims.height);

    expect(area.x).toBeCloseTo(
      hud.queueX + hud.queueWidth + block * metrics.duelQueueClearanceBlocks,
      5,
    );
  });
});
