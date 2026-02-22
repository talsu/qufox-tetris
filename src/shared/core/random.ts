export function normalizeSeed(seed: number): number {
    return (Math.floor(seed) >>> 0) || 1;
}

export function nextLcg(state: number): { state: number; value: number } {
    const nextState = ((state * 1664525) + 1013904223) >>> 0;
    return {
        state: nextState,
        value: nextState / 0x100000000,
    };
}

export function createSeededRandom(seed: number): () => number {
    let state = normalizeSeed(seed);
    return () => {
        const next = nextLcg(state);
        state = next.state;
        return next.value;
    };
}
