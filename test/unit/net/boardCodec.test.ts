import { BoardCodec } from '../../../src/tetris/net/boardCodec';

describe('BoardCodec', () => {
    describe('encode', () => {
        test('returns 200-character string of zeros for empty block list', () => {
            const result = BoardCodec.encode([]);
            expect(result).toHaveLength(200);
            expect(result).toBe('0'.repeat(200));
        });

        test('encodes a single block at (0,0)', () => {
            const blocks = [{ col: 0, row: 0, type: 'I' }];
            const result = BoardCodec.encode(blocks);
            expect(result[0]).toBe('I');
            expect(result.slice(1)).toBe('0'.repeat(199));
        });

        test('encodes a block at last position (col=9, row=19)', () => {
            const blocks = [{ col: 9, row: 19, type: 'T' }];
            const result = BoardCodec.encode(blocks);
            expect(result[199]).toBe('T');
            expect(result.slice(0, 199)).toBe('0'.repeat(199));
        });

        test('encodes all tetromino types correctly', () => {
            const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'GARBAGE'];
            const expectedChars = ['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'G'];
            const blocks = types.map((type, i) => ({ col: i, row: 0, type }));

            const result = BoardCodec.encode(blocks);
            for (let i = 0; i < expectedChars.length; i++) {
                expect(result[i]).toBe(expectedChars[i]);
            }
        });

        test('encodes multiple blocks on the same row', () => {
            const blocks = [
                { col: 0, row: 5, type: 'I' },
                { col: 1, row: 5, type: 'I' },
                { col: 2, row: 5, type: 'I' },
                { col: 3, row: 5, type: 'I' },
            ];
            const result = BoardCodec.encode(blocks);
            // Row 5 starts at index 50
            expect(result.slice(50, 54)).toBe('IIII');
        });

        test('ignores blocks outside grid boundaries', () => {
            const blocks = [
                { col: -1, row: 0, type: 'I' },
                { col: 10, row: 0, type: 'I' },
                { col: 0, row: -1, type: 'I' },
                { col: 0, row: 20, type: 'I' },
            ];
            const result = BoardCodec.encode(blocks);
            expect(result).toBe('0'.repeat(200));
        });

        test('encodes unknown type as 0', () => {
            const blocks = [{ col: 0, row: 0, type: 'UNKNOWN' }];
            const result = BoardCodec.encode(blocks);
            expect(result[0]).toBe('0');
        });
    });

    describe('decode', () => {
        test('returns empty array for null data', () => {
            const result = BoardCodec.decode(null as any);
            expect(result).toEqual([]);
        });

        test('returns empty array for empty string', () => {
            const result = BoardCodec.decode('');
            expect(result).toEqual([]);
        });

        test('returns empty array for string with wrong length', () => {
            const result = BoardCodec.decode('IIII');
            expect(result).toEqual([]);
        });

        test('returns empty array for all-zeros string', () => {
            const result = BoardCodec.decode('0'.repeat(200));
            expect(result).toEqual([]);
        });

        test('decodes a single block at position (0,0)', () => {
            const data = 'I' + '0'.repeat(199);
            const result = BoardCodec.decode(data);
            expect(result).toEqual([{ col: 0, row: 0, type: 'I' }]);
        });

        test('decodes a block at last position (col=9, row=19)', () => {
            const data = '0'.repeat(199) + 'T';
            const result = BoardCodec.decode(data);
            expect(result).toEqual([{ col: 9, row: 19, type: 'T' }]);
        });

        test('decodes GARBAGE type from G character', () => {
            const data = 'G' + '0'.repeat(199);
            const result = BoardCodec.decode(data);
            expect(result).toEqual([{ col: 0, row: 0, type: 'GARBAGE' }]);
        });

        test('ignores unknown characters', () => {
            const data = 'X' + '0'.repeat(199);
            const result = BoardCodec.decode(data);
            expect(result).toEqual([]);
        });

        test('decodes all tetromino types', () => {
            const chars = 'IJLOSTZG';
            const data = chars + '0'.repeat(200 - chars.length);
            const result = BoardCodec.decode(data);
            expect(result).toHaveLength(8);
            expect(result.map(b => b.type)).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'GARBAGE']);
        });

        test('computes correct row and col from index', () => {
            // Place a block at index 53 -> row=5, col=3
            const arr = new Array(200).fill('0');
            arr[53] = 'S';
            const result = BoardCodec.decode(arr.join(''));
            expect(result).toEqual([{ col: 3, row: 5, type: 'S' }]);
        });
    });

    describe('encode/decode round-trip', () => {
        test('round-trip preserves single block', () => {
            const original = [{ col: 5, row: 10, type: 'T' }];
            const encoded = BoardCodec.encode(original);
            const decoded = BoardCodec.decode(encoded);
            expect(decoded).toEqual(original);
        });

        test('round-trip preserves multiple blocks', () => {
            const original = [
                { col: 0, row: 0, type: 'I' },
                { col: 5, row: 10, type: 'T' },
                { col: 9, row: 19, type: 'GARBAGE' },
            ];
            const encoded = BoardCodec.encode(original);
            const decoded = BoardCodec.decode(encoded);
            expect(decoded).toEqual(original);
        });

        test('round-trip preserves a full garbage row', () => {
            const original: { col: number; row: number; type: string }[] = [];
            for (let c = 0; c < 10; c++) {
                if (c !== 5) {
                    original.push({ col: c, row: 19, type: 'GARBAGE' });
                }
            }
            const encoded = BoardCodec.encode(original);
            const decoded = BoardCodec.decode(encoded);
            expect(decoded).toEqual(original);
        });

        test('round-trip preserves a fully filled board', () => {
            const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
            const original: { col: number; row: number; type: string }[] = [];
            for (let r = 0; r < 20; r++) {
                for (let c = 0; c < 10; c++) {
                    original.push({ col: c, row: r, type: types[(r * 10 + c) % types.length] });
                }
            }
            const encoded = BoardCodec.encode(original);
            const decoded = BoardCodec.decode(encoded);
            expect(decoded).toEqual(original);
        });
    });
});
