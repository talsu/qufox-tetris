interface OverlayControlOptions {
    scene: Phaser.Scene;
    onMenuClick: () => void;
}

/**
 * Fixed viewport menu button (DOM-based).
 * - independent from camera zoom / aspect ratio
 * - always visible at top-left
 * - reliable mouse click handling
 */
export class GameOverlayControls {
    private readonly scene: Phaser.Scene;
    private readonly onMenuClick: () => void;

    private menuButton: HTMLButtonElement | null = null;

    constructor(options: OverlayControlOptions) {
        this.scene = options.scene;
        this.onMenuClick = options.onMenuClick;

        this.createMenuButton();
        this.layout();
    }

    public layout() {
        if (!this.menuButton) return;
        // iOS notch/safe-area 대응 + 고정 좌상단 배치
        this.menuButton.style.top = 'max(12px, env(safe-area-inset-top))';
        this.menuButton.style.left = 'max(12px, env(safe-area-inset-left))';
    }

    public destroy() {
        if (!this.menuButton) return;
        this.menuButton.onclick = null;
        if (this.menuButton.parentNode) {
            this.menuButton.parentNode.removeChild(this.menuButton);
        }
        this.menuButton = null;
    }

    private createMenuButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'MENU';
        button.setAttribute('aria-label', 'Open menu');

        // HOLD/NEXT 패널 감성에 맞춘 스타일
        button.style.cssText = `
            position: fixed;
            z-index: 9000;
            width: 108px;
            height: 40px;
            border: 1px solid #eeeeee;
            outline: 1px solid rgba(103, 232, 249, 0.9);
            outline-offset: -3px;
            background: rgba(0, 0, 0, 0.2);
            color: #ffffff;
            font-family: Pretendard, Arial Black, sans-serif;
            font-weight: 700;
            font-size: 18px;
            line-height: 1;
            letter-spacing: 0.5px;
            cursor: pointer;
            user-select: none;
            -webkit-text-stroke: 1px #000000;
            text-shadow: 2px 2px 2px rgba(0,0,0,0.85);
            box-sizing: border-box;
            border-radius: 2px;
            padding: 0;
            touch-action: manipulation;
        `;

        const resetVisual = () => {
            if (!this.menuButton) return;
            this.menuButton.style.background = 'rgba(0, 0, 0, 0.2)';
            this.menuButton.style.transform = 'translateY(0px)';
        };

        button.onpointerdown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            button.style.background = 'rgba(15, 23, 42, 0.45)';
            button.style.transform = 'translateY(1px)';
        };

        button.onpointerup = (e) => {
            e.preventDefault();
            e.stopPropagation();
            resetVisual();
        };

        button.onpointerleave = resetVisual;
        button.onpointercancel = resetVisual;

        // 포인터 이벤트 미지원/차단 환경 대비
        button.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.onMenuClick();
        };

        document.body.appendChild(button);
        this.menuButton = button;
    }
}
