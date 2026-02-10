export interface LeaderboardEntry {
    playerId: string;
    name: string;
    score: number;
    isAlive: boolean;
}

export class LeaderboardPanel {
    private container: HTMLElement;
    private myPlayerId: string;

    constructor(myPlayerId: string) {
        this.myPlayerId = myPlayerId;

        this.container = document.createElement('div');
        this.container.className = 'nmulti-leaderboard';
        this.container.innerHTML = '<div class="lb-title">LEADERBOARD</div><div class="lb-list"></div>';
        document.body.appendChild(this.container);
    }

    update(entries: LeaderboardEntry[]) {
        const sorted = [...entries].sort((a, b) => b.score - a.score);

        const listEl = this.container.querySelector('.lb-list');
        if (!listEl) return;

        // Find my rank
        const myIndex = sorted.findIndex(e => e.playerId === this.myPlayerId);

        // Show top 10 + self if not in top 10
        const top10 = sorted.slice(0, 10);
        const showSelf = myIndex >= 10;

        let html = '';
        top10.forEach((entry, i) => {
            const rank = i + 1;
            const isMe = entry.playerId === this.myPlayerId;
            const deadClass = entry.isAlive ? '' : ' lb-dead';
            const meClass = isMe ? ' lb-me' : '';
            html += `<div class="lb-row${meClass}${deadClass}">
                <span class="lb-rank">#${rank}</span>
                <span class="lb-name">${entry.name}</span>
                <span class="lb-score">${entry.score}</span>
            </div>`;
        });

        if (showSelf && myIndex >= 0) {
            const myEntry = sorted[myIndex];
            html += `<div class="lb-separator">...</div>`;
            html += `<div class="lb-row lb-me${myEntry.isAlive ? '' : ' lb-dead'}">
                <span class="lb-rank">#${myIndex + 1}</span>
                <span class="lb-name">${myEntry.name}</span>
                <span class="lb-score">${myEntry.score}</span>
            </div>`;
        }

        listEl.innerHTML = html;
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
