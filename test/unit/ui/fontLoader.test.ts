describe('fontLoader', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('loads regular and bold Pretendard once and caches the promise', async () => {
    const loadMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { load: loadMock },
    });

    const { ensureGameFontReady } = await import('../../../src/tetris/ui/fontLoader');

    await ensureGameFontReady();
    await ensureGameFontReady();

    expect(loadMock).toHaveBeenCalledTimes(2);
    expect(loadMock).toHaveBeenNthCalledWith(1, '400 16px "Pretendard"');
    expect(loadMock).toHaveBeenNthCalledWith(2, '700 16px "Pretendard"');
  });

  test('returns without error when Font Loading API is unavailable', async () => {
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: undefined,
    });

    const { ensureGameFontReady } = await import('../../../src/tetris/ui/fontLoader');

    await expect(ensureGameFontReady()).resolves.toBeUndefined();
  });
});
