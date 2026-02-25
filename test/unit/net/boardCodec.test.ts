import { BoardCodec } from '../../../src/tetris/net/boardCodec';

describe('BoardCodec', () => {
    describe('encode/decode (Legacy String)', () => {
        test('returns 200-character string of zeros for empty block list', () => {
            const result = BoardCodec.encode([]);
            expect(result).toHaveLength(200);
            expect(result).toBe('0'.repeat(200));
        });

        test('encodes and decodes tetromino types correctly', () => {
            const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'GARBAGE'];
            const blocks = types.map((type, i) => ({ col: i, row: 0, type }));

            const encoded = BoardCodec.encode(blocks);
            const decoded = BoardCodec.decode(encoded);
            
            expect(decoded).toHaveLength(8);
            expect(decoded.map(b => b.type)).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'GARBAGE']);
        });
    });

    describe('Binary Encoding (Skyline Nibble Packing)', () => {
        test('encodeBinary returns only 1 byte for empty board', () => {
            const result = BoardCodec.encodeBinary([]);
            expect(result).toHaveLength(1);
            expect(result[0]).toBe(20); // firstRowIndex = 20
        });

        test('decodeBinary returns empty array for empty board payload', () => {
            const data = new Uint8Array([20]);
            const result = BoardCodec.decodeBinary(data);
            expect(result).toEqual([]);
        });

        test('round-trip preserves a single block at the bottom', () => {
            const original = [{ col: 5, row: 19, type: 'T' }];
            const encoded = BoardCodec.encodeBinary(original);
            
            // Expected size: 1 (header) + 5 (10 cells / 2) = 6 bytes
            expect(encoded).toHaveLength(6);
            expect(encoded[0]).toBe(19); // firstRowIndex = 19
            
            const decoded = BoardCodec.decodeBinary(encoded);
            expect(decoded).toEqual(original);
        });

        test('round-trip preserves a single block at the top', () => {
            const original = [{ col: 0, row: 0, type: 'I' }];
            const encoded = BoardCodec.encodeBinary(original);
            
            // Expected size: 1 (header) + 100 (200 cells / 2) = 101 bytes
            expect(encoded).toHaveLength(101);
            expect(encoded[0]).toBe(0); // firstRowIndex = 0
            
            const decoded = BoardCodec.decodeBinary(encoded);
            expect(decoded).toEqual(original);
        });

        test('round-trip preserves a full garbage row', () => {
            const original = [];
            for (let c = 0; c < 10; c++) {
                if (c !== 3) {
                    original.push({ col: c, row: 19, type: 'GARBAGE' });
                }
            }
            const encoded = BoardCodec.encodeBinary(original);
            const decoded = BoardCodec.decodeBinary(encoded);
            expect(decoded).toEqual(original);
        });

        test('BoardCodec.decode automatically detects Uint8Array', () => {
            const original = [{ col: 2, row: 15, type: 'S' }];
            const encoded = BoardCodec.encodeBinary(original);
            const decoded = BoardCodec.decode(encoded);
            expect(decoded).toEqual(original);
        });

        test('handles multiple blocks across different rows', () => {
            const original = [
                { col: 3, row: 10, type: 'L' },
                { col: 4, row: 10, type: 'O' },
                { col: 0, row: 19, type: 'GARBAGE' }
            ];
            const encoded = BoardCodec.encodeBinary(original);
            expect(encoded[0]).toBe(10); // firstRowIndex = 10
            
            const decoded = BoardCodec.decodeBinary(encoded);
            expect(decoded).toEqual(original);
        });

        test('round-trip preserves a fully filled board', () => {
            const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
            const original = [];
            for (let r = 0; r < 20; r++) {
                for (let c = 0; c < 10; c++) {
                    original.push({ col: c, row: r, type: types[(r * 10 + c) % types.length] });
                }
            }
            const encoded = BoardCodec.encodeBinary(original);
            const decoded = BoardCodec.decodeBinary(encoded);
            expect(decoded).toEqual(original);
        });
    });

    describe('Boundary and Error Cases', () => {
        test('decode handles null and undefined', () => {
            expect(BoardCodec.decode(null as any)).toEqual([]);
            expect(BoardCodec.decode(undefined as any)).toEqual([]);
        });

        test('decodeBinary handles truncated data', () => {
            const data = new Uint8Array([10, 1, 2, 3]); // Claims to start at row 10, but missing data
            const result = BoardCodec.decodeBinary(data);
            // Should not crash and return what it can
            expect(Array.isArray(result)).toBe(true);
        });
    });
});
