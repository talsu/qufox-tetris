import { CONST } from "../const/const";
import { BaseScene } from "./baseScene";


export class MenuScene extends BaseScene {
    private menuContainer: Phaser.GameObjects.DOMElement;

    constructor() {
        super({
            key: "MenuScene"
        });
    }

    init(): void {
        this.handleResolution();
    }

    preload(): void {
        this.load.image('background', 'assets/image/bongtalk-background-default.jpg');
        // Preload game assets to avoid delay in MainScene
        this.load.spritesheet('blockSheet', 'assets/image/PPTdefaultMinoOnly.png', { frameHeight: CONST.SCREEN.BLOCK_IMAGE_SIZE, frameWidth: CONST.SCREEN.BLOCK_IMAGE_SIZE, margin: 4, spacing: 8 });
    }

    create(): void {
        // Register resize handler
        this.scale.on('resize', this.resize, this);
        this.events.on('shutdown', this.shutdown, this);

        // Background
        const bgImg = this.textures.get('background').getSourceImage();
        const scaleX = this.GAME_WIDTH / bgImg.width;
        const scaleY = this.GAME_HEIGHT / bgImg.height;
        const scale = Math.max(scaleX, scaleY);

        this.add.image(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, 'background')
            .setOrigin(0.5)
            .setScale(scale)
            .setScrollFactor(0); // Fixed background

        this.createDOMUI();

        // Initial resize
        this.resize(window.innerWidth, window.innerHeight);
    }

    createDOMUI() {
        const html = `
        <div class="menu-container">
            <h1 class="game-title">QUFOX<br>TETRIS</h1>
            <button class="puyo-btn accent" id="singleBtn">Single Player</button>
            <button class="puyo-btn" id="multiBtn">Multiplayer</button>
        </div>
        `;

        this.menuContainer = this.add.dom(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2).createFromHTML(html);
        this.menuContainer.setPerspective(800);

        const singleBtn = this.menuContainer.getChildByID('singleBtn') as HTMLElement;
        const multiBtn = this.menuContainer.getChildByID('multiBtn') as HTMLElement;

        if (singleBtn) {
            singleBtn.addEventListener('click', () => {
                this.scene.start("PlayScene", { mode: 'single' });
            });
        }

        if (multiBtn) {
            multiBtn.addEventListener('click', () => {
                this.scene.start("LobbyScene");
            });
        }
    }


    update(time: number, delta: number): void {
    }

    shutdown() {
        if (this.menuContainer) {
            this.menuContainer.destroy();
        }
        this.scale.off('resize', this.resize, this);
    }
}