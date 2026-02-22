const { AuthoritativeMatch } = require('../../../server/authoritativeSim');
const { nextLcg, normalizeSeed } = require('../../../src/shared/core/random');

function generateClientStyleSequence(seed: number, count: number): string[] {
    const bagTemplate = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    const sequence = [];
    const queue = [];
    let bag = [];
    let seedState = normalizeSeed(seed);

    const nextRandom = () => {
        const next = nextLcg(seedState);
        seedState = next.state;
        return next.value;
    };

    while (sequence.length < count) {
        while (queue.length < 5) {
            if (!bag.length) {
                bag = bagTemplate.slice();
            }
            const pickIndex = Math.floor(nextRandom() * bag.length);
            const [type] = bag.splice(pickIndex, 1);
            queue.push(type);
        }
        sequence.push(queue.shift());
    }

    return sequence;
}

function collectServerSequence(seed: number, count: number): Array<string | null> {
    const match = new AuthoritativeMatch('A', 'B', seed, 99991);
    const sequence = [];

    for (let i = 0; i < count; i += 1) {
        const active = match.players.p1.active;
        sequence.push(active ? active.type : null);
        match.enqueue('p1', 'hardDrop', 'press', i + 1);
        match.step();
    }

    return sequence;
}

describe('AuthoritativeMatch', () => {
    test('continues simulation without inputs', () => {
        const match = new AuthoritativeMatch('A', 'B');
        const before = match.getSnapshotFor('p1').self.board;

        for (let i = 0; i < 60; i += 1) {
            match.step();
        }

        const after = match.getSnapshotFor('p1').self.board;
        expect(match.tick).toBeGreaterThan(0);
        expect(after).not.toBe(before);
    });

    test('accepts input with increasing sequence and ignores duplicate sequence', () => {
        const match = new AuthoritativeMatch('A', 'B');
        const beforeTick = match.tick;

        match.enqueue('p1', 'left', 'press', 1);
        match.enqueue('p1', 'left', 'press', 1);
        match.step();

        const snapshot = match.getSnapshotFor('p1');
        expect(match.tick).toBe(beforeTick + 1);
        expect(snapshot.self.isAlive).toBe(true);
    });

    test('applies pending garbage on next tick', () => {
        const match = new AuthoritativeMatch('A', 'B');
        match.applyGarbageTo('p1', 2);
        match.step();

        const snapshot = match.getSnapshotFor('p1').self;
        expect(snapshot.board.includes('G')).toBe(true);
    });

    test('step returns delivered garbage counters', () => {
        const match = new AuthoritativeMatch('A', 'B');
        const stepResult = match.step();

        expect(stepResult).toEqual({
            toP1: expect.any(Number),
            toP2: expect.any(Number),
        });
        expect(stepResult.toP1).toBeGreaterThanOrEqual(0);
        expect(stepResult.toP2).toBeGreaterThanOrEqual(0);
    });

    test('uses deterministic bag sequence with same seeds', () => {
        const matchA = new AuthoritativeMatch('A', 'B', 12345, 98765);
        const matchB = new AuthoritativeMatch('A', 'B', 12345, 98765);

        for (let i = 0; i < 50; i += 1) {
            matchA.step();
            matchB.step();
        }

        expect(matchA.getSnapshotFor('p1')).toEqual(matchB.getSnapshotFor('p1'));
        expect(matchA.getSnapshotFor('p2')).toEqual(matchB.getSnapshotFor('p2'));
    });

    test('matches client 7-bag sequence for same seed', () => {
        const seed = 123456789;
        const count = 6;

        const serverSeq = collectServerSequence(seed, count);
        const clientSeq = generateClientStyleSequence(seed, count);

        expect(serverSeq).toEqual(clientSeq);
        expect(serverSeq.every((piece) => piece !== null)).toBe(true);
    });

    test('ignores hardDrop hold state to avoid duplicate drops in same tick', () => {
        const seed = 4321;

        const pressOnly = new AuthoritativeMatch('A', 'B', seed, 99991);
        pressOnly.enqueue('p1', 'hardDrop', 'press', 1);
        pressOnly.step();
        const pressSnapshot = pressOnly.getSnapshotFor('p1').self;

        const pressAndHold = new AuthoritativeMatch('A', 'B', seed, 99991);
        pressAndHold.enqueue('p1', 'hardDrop', 'press', 1);
        pressAndHold.enqueue('p1', 'hardDrop', 'hold', 2);
        pressAndHold.step();
        const pressAndHoldSnapshot = pressAndHold.getSnapshotFor('p1').self;

        expect(pressAndHoldSnapshot).toEqual(pressSnapshot);
    });

    test('ignores one-shot hold states for rotate and hold actions', () => {
        const seed = 24680;
        const pressOnly = new AuthoritativeMatch('A', 'B', seed, 99991);
        pressOnly.enqueue('p1', 'clockwise', 'press', 1);
        pressOnly.step();
        const pressSnapshot = pressOnly.getSnapshotFor('p1').self;

        const pressAndHeld = new AuthoritativeMatch('A', 'B', seed, 99991);
        pressAndHeld.enqueue('p1', 'clockwise', 'press', 1);
        pressAndHeld.enqueue('p1', 'clockwise', 'hold', 2);
        pressAndHeld.enqueue('p1', 'hold', 'hold', 3);
        pressAndHeld.step();
        const pressAndHeldSnapshot = pressAndHeld.getSnapshotFor('p1').self;

        expect(pressAndHeldSnapshot).toEqual(pressSnapshot);
    });
});
