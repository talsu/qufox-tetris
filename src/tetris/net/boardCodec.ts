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

    static encode(blocks: BoardBlock[]): string {
        const grid = new Array(200).fill('0');
        for (const b of blocks) {
            if (b.row >= 0 && b.row < 20 && b.col >= 0 && b.col < 10) {
                grid[b.row * 10 + b.col] = this.typeToChar[b.type] || '0';
            }
        }
        return grid.join('');
    }

    static decode(data: string): BoardBlock[] {
        const blocks: BoardBlock[] = [];
        if (!data || data.length !== 200) return blocks;
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
}
