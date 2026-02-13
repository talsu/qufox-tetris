import { GAME_FONT_FAMILY, TextStyles } from '../../../src/tetris/ui/uiStyles';

describe('uiStyles font family', () => {
  test('uses the shared game font family for all text presets', () => {
    expect(TextStyles.header.fontFamily).toBe(GAME_FONT_FAMILY);
    expect(TextStyles.valueLarge.fontFamily).toBe(GAME_FONT_FAMILY);
    expect(TextStyles.label.fontFamily).toBe(GAME_FONT_FAMILY);
    expect(TextStyles.valueSmall.fontFamily).toBe(GAME_FONT_FAMILY);
    expect(TextStyles.action.fontFamily).toBe(GAME_FONT_FAMILY);
    expect(TextStyles.combo.fontFamily).toBe(GAME_FONT_FAMILY);
  });
});
