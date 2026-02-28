export interface BoardBlock {
    col: number;
    row: number;
    type: string;
}

export class BoardCodec {
    private static typeToChar: Record<string, string> = {
        'I': 'I', 'J': 'J', 'L': 'L', 'O': 'O',
        'S': 'S', 'T': 'T', 'Z': 'Z', 'GARBAGE': 'G'
    };

    private static charToType: Record<string, string> = {
        'I': 'I', 'J': 'J', 'L': 'L', 'O': 'O',
        'S': 'S', 'T': 'T', 'Z': 'Z', 'G': 'GARBAGE'
    };

    private static typeToNibble: Record<string, number> = {
        '0': 0, 'I': 1, 'J': 2, 'L': 3, 'O': 4, 'S': 5, 'T': 6, 'Z': 7, 'G': 8, 'GARBAGE': 8
    };

    private static nibbleToType: Record<number, string> = {
        0: '0', 1: 'I', 2: 'J', 3: 'L', 4: 'O', 5: 'S', 6: 'T', 7: 'Z', 8: 'GARBAGE'
    };

    static encode(blocks: BoardBlock[]): string {
        const grid = new Array(200).fill('0');
        for (const b of blocks) {
            if (b.row >= 0 && b.row < 20 && b.col >= 0 && b.col < 10) {
                grid[b.row * 10 + b.col] = this.typeToChar[b.type] || '0';
            }
        }
        return grid.join('');
    }

    private static toUint8Array(data: Uint8Array | ArrayBuffer): Uint8Array {
        return data instanceof Uint8Array ? data : new Uint8Array(data);
    }

    static decode(data: string | Uint8Array | ArrayBuffer | null | undefined): BoardBlock[] {
        if (!data) return [];

        if (data instanceof ArrayBuffer) {
            return this.decodeBinary(new Uint8Array(data));
        }
        if (data instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(data))) {
            return this.decodeBinary(new Uint8Array(data));
        }

        const blocks: BoardBlock[] = [];
        if (data.length !== 200) return blocks;
        for (let i = 0; i < 200; i++) {
            const ch = data[i];
            if (ch !== '0') {
                const type = this.charToType[ch];
                if (type) {
                    blocks.push({
                        col: i % 10,
                        row: Math.floor(i / 10),
                        type
                    });
                }
            }
        }
        return blocks;
    }

    /**
     * Directly converts a 200-char encoded board string to nibble-packed binary
     * without allocating an intermediate BoardBlock[]. Use this on hot paths.
     * If the board is already a Uint8Array it is returned as-is.
     */
    static stringToBinary(board: string | Uint8Array): Uint8Array {
        if (board instanceof Uint8Array) return board;
        if (!board || board.length !== 200) return new Uint8Array([20]);

        let firstRow = 20;
        outer: for (let row = 0; row < 20; row++) {
            for (let col = 0; col < 10; col++) {
                if (board[row * 10 + col] !== '0') {
                    firstRow = row;
                    break outer;
                }
            }
        }

        if (firstRow >= 20) return new Uint8Array([20]);

        const cellCount = (20 - firstRow) * 10;
        const payloadSize = Math.ceil(cellCount / 2);
        const result = new Uint8Array(1 + payloadSize);
        result[0] = firstRow;

        for (let i = 0; i < cellCount; i++) {
            const ch = board[firstRow * 10 + i];
            const nibble = this.typeToNibble[ch] || 0;
            const byteIdx = 1 + Math.floor(i / 2);
            if (i % 2 === 0) {
                result[byteIdx] = (nibble << 4);
            } else {
                result[byteIdx] |= (nibble & 0x0F);
            }
        }
        return result;
    }

    static encodeBinary(blocks: BoardBlock[]): Uint8Array {
        return this.stringToBinary(this.encode(blocks));
    }

    static decodeBinary(data: Uint8Array): BoardBlock[] {
        const blocks: BoardBlock[] = [];
        if (data.length < 1) return blocks;
        const firstRow = data[0];
        if (firstRow >= 20) return blocks;

        const cellCount = (20 - firstRow) * 10;
        
        for (let i = 0; i < cellCount; i++) {
            const byteIdx = 1 + Math.floor(i / 2);
            if (byteIdx >= data.length) break;
            
            const byte = data[byteIdx];
            const nibble = (i % 2 === 0) ? (byte >> 4) : (byte & 0x0F);
            
            if (nibble !== 0) {
                const type = this.nibbleToType[nibble];
                if (type) {
                    blocks.push({
                        col: i % 10,
                        row: firstRow + Math.floor(i / 10),
                        type
                    });
                }
            }
        }
        return blocks;
    }

    static areUint8ArraysEqual(a: Uint8Array | ArrayBuffer | string | null, b: Uint8Array | ArrayBuffer | string | null): boolean {
        if (a === b) return true;
        if (!a || !b) return false;
        if (typeof a === 'string' || typeof b === 'string') return a === b;
        const ua = this.toUint8Array(a as Uint8Array | ArrayBuffer);
        const ub = this.toUint8Array(b as Uint8Array | ArrayBuffer);
        if (ua.length !== ub.length) return false;
        for (let i = 0; i < ua.length; i++) {
            if (ua[i] !== ub[i]) return false;
        }
        return true;
    }
}
