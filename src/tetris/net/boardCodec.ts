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

    static decode(data: string | Uint8Array): BoardBlock[] {
        if (!data) return [];
        
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

    static encodeBinary(blocks: BoardBlock[]): Uint8Array {
        const grid = new Uint8Array(200);
        let firstRow = 20;
        for (const b of blocks) {
            if (b.row >= 0 && b.row < 20 && b.col >= 0 && b.col < 10) {
                const nibble = this.typeToNibble[b.type] || 0;
                grid[b.row * 10 + b.col] = nibble;
                if (nibble !== 0 && b.row < firstRow) {
                    firstRow = b.row;
                }
            }
        }

        const rowCountToEncode = 20 - firstRow;
        if (rowCountToEncode <= 0) {
            return new Uint8Array([20]);
        }

        const cellCount = rowCountToEncode * 10;
        const payloadSize = Math.ceil(cellCount / 2);
        const result = new Uint8Array(1 + payloadSize);
        result[0] = firstRow;

        for (let i = 0; i < cellCount; i++) {
            const cellIdx = firstRow * 10 + i;
            const nibble = grid[cellIdx];
            const byteIdx = 1 + Math.floor(i / 2);
            if (i % 2 === 0) {
                result[byteIdx] = (nibble << 4);
            } else {
                result[byteIdx] |= (nibble & 0x0F);
            }
        }
        return result;
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
}
