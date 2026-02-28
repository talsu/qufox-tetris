import { LeaderboardPanel, LeaderboardEntry } from '../../../src/tetris/ui/leaderboardPanel';

describe('LeaderboardPanel', () => {
    let panel: LeaderboardPanel;

    beforeEach(() => {
        document.body.innerHTML = '';
        panel = new LeaderboardPanel('player1');
    });

    afterEach(() => {
        panel.destroy();
    });

    test('creates container element in DOM', () => {
        const container = document.querySelector('.nmulti-leaderboard');
        expect(container).not.toBeNull();
        expect(container!.querySelector('.lb-title')!.textContent).toBe('LEADERBOARD');
        expect(container!.querySelector('.lb-list')).not.toBeNull();
    });

    test('renders entries sorted by score descending', () => {
        const entries: LeaderboardEntry[] = [
            { playerId: 'p1', name: 'Alice', score: 100, isAlive: true },
            { playerId: 'p2', name: 'Bob', score: 300, isAlive: true },
            { playerId: 'p3', name: 'Charlie', score: 200, isAlive: true },
        ];
        panel.update(entries);

        const rows = document.querySelectorAll('.lb-row');
        expect(rows).toHaveLength(3);

        const names = Array.from(rows).map(r => r.querySelector('.lb-name')!.textContent);
        expect(names).toEqual(['Bob', 'Charlie', 'Alice']);

        const ranks = Array.from(rows).map(r => r.querySelector('.lb-rank')!.textContent);
        expect(ranks).toEqual(['#1', '#2', '#3']);
    });

    test('highlights current player with lb-me class', () => {
        const entries: LeaderboardEntry[] = [
            { playerId: 'player1', name: 'Me', score: 500, isAlive: true },
            { playerId: 'p2', name: 'Other', score: 100, isAlive: true },
        ];
        panel.update(entries);

        const meRows = document.querySelectorAll('.lb-me');
        expect(meRows).toHaveLength(1);
        expect(meRows[0].querySelector('.lb-name')!.textContent).toBe('Me');
    });

    test('applies lb-dead class to dead players', () => {
        const entries: LeaderboardEntry[] = [
            { playerId: 'p1', name: 'Alive', score: 100, isAlive: true },
            { playerId: 'p2', name: 'Dead', score: 50, isAlive: false },
        ];
        panel.update(entries);

        const deadRows = document.querySelectorAll('.lb-dead');
        expect(deadRows).toHaveLength(1);
        expect(deadRows[0].querySelector('.lb-name')!.textContent).toBe('Dead');
    });

    test('shows only top 10 entries', () => {
        const entries: LeaderboardEntry[] = [];
        for (let i = 0; i < 15; i++) {
            entries.push({
                playerId: `p${i}`,
                name: `Player${i}`,
                score: (15 - i) * 100,
                isAlive: true,
            });
        }
        panel.update(entries);

        const rows = document.querySelectorAll('.lb-row');
        // Top 10 only (self is p0 ranked #15 which won't match player1)
        expect(rows).toHaveLength(10);
    });

    test('shows self below top 10 with separator when not in top 10', () => {
        const entries: LeaderboardEntry[] = [];
        for (let i = 0; i < 15; i++) {
            entries.push({
                playerId: `p${i}`,
                name: `Player${i}`,
                score: (15 - i) * 100,
                isAlive: true,
            });
        }
        // Add the actual player at a low score
        entries.push({
            playerId: 'player1',
            name: 'Me',
            score: 10,
            isAlive: true,
        });
        panel.update(entries);

        const separator = document.querySelector('.lb-separator');
        expect(separator).not.toBeNull();
        expect(separator!.textContent).toBe('...');

        // Top 10 + self = 11 rows
        const rows = document.querySelectorAll('.lb-row');
        expect(rows).toHaveLength(11);

        // Last row should be self
        const lastRow = rows[rows.length - 1];
        expect(lastRow.classList.contains('lb-me')).toBe(true);
        expect(lastRow.querySelector('.lb-rank')!.textContent).toBe('#16');
    });

    test('does not show separator when self is in top 10', () => {
        const entries: LeaderboardEntry[] = [
            { playerId: 'player1', name: 'Me', score: 999, isAlive: true },
            { playerId: 'p2', name: 'Other', score: 100, isAlive: true },
        ];
        panel.update(entries);

        const separator = document.querySelector('.lb-separator');
        expect(separator).toBeNull();
    });

    test('displays scores correctly', () => {
        const entries: LeaderboardEntry[] = [
            { playerId: 'p1', name: 'Alice', score: 12345, isAlive: true },
        ];
        panel.update(entries);

        const scoreEl = document.querySelector('.lb-score');
        expect(scoreEl!.textContent).toBe('12345');
    });

    test('renders user names as text without HTML injection', () => {
        const entries: LeaderboardEntry[] = [
            { playerId: 'p1', name: '<img src=x onerror=alert(1)>', score: 10, isAlive: true },
        ];
        panel.update(entries);

        const injectedImage = document.querySelector('.lb-name img');
        expect(injectedImage).toBeNull();
        expect(document.querySelector('.lb-name')!.textContent).toBe('<img src=x onerror=alert(1)>');
    });

    test('destroy removes container from DOM', () => {
        expect(document.querySelector('.nmulti-leaderboard')).not.toBeNull();
        panel.destroy();
        expect(document.querySelector('.nmulti-leaderboard')).toBeNull();
    });

    test('updates correctly when called multiple times', () => {
        panel.update([
            { playerId: 'p1', name: 'Alice', score: 100, isAlive: true },
        ]);
        expect(document.querySelectorAll('.lb-row')).toHaveLength(1);

        panel.update([
            { playerId: 'p1', name: 'Alice', score: 200, isAlive: true },
            { playerId: 'p2', name: 'Bob', score: 300, isAlive: false },
        ]);
        expect(document.querySelectorAll('.lb-row')).toHaveLength(2);
        expect(document.querySelector('.lb-row .lb-score')!.textContent).toBe('300');
    });

    test('handles empty entries list', () => {
        panel.update([]);
        const rows = document.querySelectorAll('.lb-row');
        expect(rows).toHaveLength(0);
    });

    test('applies both lb-me and lb-dead when self is dead', () => {
        const entries: LeaderboardEntry[] = [
            { playerId: 'player1', name: 'Me', score: 100, isAlive: false },
        ];
        panel.update(entries);

        const row = document.querySelector('.lb-row');
        expect(row!.classList.contains('lb-me')).toBe(true);
        expect(row!.classList.contains('lb-dead')).toBe(true);
    });
});
