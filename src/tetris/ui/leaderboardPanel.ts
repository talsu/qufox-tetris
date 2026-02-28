export interface LeaderboardEntry {
    playerId: string;
    name: string;
    score: number;
    isAlive: boolean;
}

export class LeaderboardPanel {
    private container: HTMLElement;
    private listElement: HTMLElement;
    private myPlayerId: string;

    constructor(myPlayerId: string, layoutMode?: string) {
        this.myPlayerId = myPlayerId;

        this.container = document.createElement('div');
        this.container.className = 'nmulti-leaderboard';
        if (layoutMode === 'mobile-portrait') {
            this.container.classList.add('nmulti-leaderboard--portrait');
        }

        const title = document.createElement('div');
        title.className = 'lb-title';
        title.textContent = 'LEADERBOARD';
        this.container.appendChild(title);

        this.listElement = document.createElement('div');
        this.listElement.className = 'lb-list';
        this.container.appendChild(this.listElement);

        document.body.appendChild(this.container);
    }

    update(entries: LeaderboardEntry[]) {
        const sorted = [...entries].sort((a, b) => b.score - a.score);

        // Find my rank
        const myIndex = sorted.findIndex(e => e.playerId === this.myPlayerId);

        // Show top 10 + self if not in top 10
        const top10 = sorted.slice(0, 10);
        const showSelf = myIndex >= 10;

        this.listElement.replaceChildren();
        const fragment = document.createDocumentFragment();

        top10.forEach((entry, i) => {
            const rank = i + 1;
            const isMe = entry.playerId === this.myPlayerId;
            fragment.appendChild(this.createRow(rank, entry, isMe));
        });

        if (showSelf && myIndex >= 0) {
            const myEntry = sorted[myIndex];
            const separator = document.createElement('div');
            separator.className = 'lb-separator';
            separator.textContent = '...';
            fragment.appendChild(separator);
            fragment.appendChild(this.createRow(myIndex + 1, myEntry, true));
        }

        this.listElement.appendChild(fragment);
    }

    private createRow(rank: number, entry: LeaderboardEntry, isMe: boolean): HTMLDivElement {
        const row = document.createElement('div');
        row.className = 'lb-row';
        if (isMe) {
            row.classList.add('lb-me');
        }
        if (!entry.isAlive) {
            row.classList.add('lb-dead');
        }

        const rankElement = document.createElement('span');
        rankElement.className = 'lb-rank';
        rankElement.textContent = `#${rank}`;
        row.appendChild(rankElement);

        const nameElement = document.createElement('span');
        nameElement.className = 'lb-name';
        nameElement.textContent = entry.name;
        row.appendChild(nameElement);

        const scoreElement = document.createElement('span');
        scoreElement.className = 'lb-score';
        scoreElement.textContent = `${entry.score}`;
        row.appendChild(scoreElement);

        return row;
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
