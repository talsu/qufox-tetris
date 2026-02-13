let gameFontReadyPromise: Promise<void> | null = null;

function hasFontApi(): boolean {
    return typeof document !== 'undefined'
        && typeof (document as any).fonts !== 'undefined'
        && typeof (document as any).fonts.load === 'function';
}

export function ensureGameFontReady(timeoutMs: number = 2000): Promise<void> {
    if (gameFontReadyPromise) return gameFontReadyPromise;

    gameFontReadyPromise = (async () => {
        if (!hasFontApi()) return;

        const fonts = (document as any).fonts;
        const loadPromise = Promise.all([
            fonts.load('400 16px "Pretendard"'),
            fonts.load('700 16px "Pretendard"'),
        ]).then(() => undefined);

        const timeoutPromise = new Promise<void>((resolve) => {
            setTimeout(() => resolve(), timeoutMs);
        });

        await Promise.race([loadPromise, timeoutPromise]);
    })();

    return gameFontReadyPromise;
}
