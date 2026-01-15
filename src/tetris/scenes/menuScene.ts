import { CONST } from "../const/const";

export class MenuScene extends Phaser.Scene {
    private startKey: Phaser.Input.Keyboard.Key;
    private bitmapTexts: Phaser.GameObjects.BitmapText[] = [];
    private backgroundImage: Phaser.GameObjects.Image;
    private buttons: Phaser.GameObjects.Text[] = [];
    private selectedButtonIndex: number = 0;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private enterKey: Phaser.Input.Keyboard.Key;
    
    // Logical base resolution
    private readonly GAME_WIDTH = 1920;
    private readonly GAME_HEIGHT = 1080;

    constructor() {
        super({
            key: "MenuScene"
        });
    }

    init(): void {
        this.startKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.S
        );
        this.startKey.isDown = false;
        this.selectedButtonIndex = 0;
        this.buttons = [];
    }

    preload(): void {
        this.load.image('background', 'assets/image/bongtalk-background-default.jpg');
        // Preload game assets to avoid delay in MainScene
        this.load.spritesheet('blockSheet', 'assets/image/PPTdefaultMinoOnly.png', {frameHeight:CONST.SCREEN.BLOCK_IMAGE_SIZE, frameWidth:CONST.SCREEN.BLOCK_IMAGE_SIZE, margin:4, spacing:8});
    }

    create(): void {
        // Register resize handler
        this.scale.on('resize', this.resize, this);
        this.events.on('shutdown', this.shutdown, this);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

        // Background
        const bgImg = this.textures.get('background').getSourceImage();
        const scaleX = this.GAME_WIDTH / bgImg.width;
        const scaleY = this.GAME_HEIGHT / bgImg.height;
        const scale = Math.max(scaleX, scaleY);
        
        this.backgroundImage = this.add.image(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, 'background')
            .setOrigin(0.5)
            .setScale(scale);

        // Title
        this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 3, "QUFOX TETRIS", {
            fontSize: "80px",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 8
        }).setOrigin(0.5);

        // Buttons
        const singlePlayerBtn = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, "SINGLE PLAYER", {
            fontSize: "40px",
            color: this.selectedButtonIndex === 0 ? "#ffff00" : "#ffffff",
            backgroundColor: "#000000",
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();

        const multiPlayerBtn = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2 + 100, "MULTIPLAYER", {
            fontSize: "40px",
            color: this.selectedButtonIndex === 1 ? "#ffff00" : "#ffffff",
            backgroundColor: "#000000",
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();

        singlePlayerBtn.on('pointerdown', () => {
            this.scene.start("PlayScene", { mode: 'single' });
        });

        multiPlayerBtn.on('pointerdown', () => {
            this.scene.start("LobbyScene");
        });

        singlePlayerBtn.on('pointerover', () => {
            if (this.selectedButtonIndex !== 0) {
                this.selectedButtonIndex = 0;
                this.updateButtonAppearance();
            }
        });

        multiPlayerBtn.on('pointerover', () => {
             if (this.selectedButtonIndex !== 1) {
                this.selectedButtonIndex = 1;
                this.updateButtonAppearance();
            }
        });
        
        this.buttons.push(singlePlayerBtn);
        this.buttons.push(multiPlayerBtn);

        // Initial resize
        this.resize(window.innerWidth, window.innerHeight);
    }

    update(time: number, delta: number): void {
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.changeSelection(-1);
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
            this.changeSelection(1);
        } else if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
            this.triggerSelection();
        }
    }

    changeSelection(change: number) {
        let newIndex = this.selectedButtonIndex + change;
        if (newIndex < 0) newIndex = this.buttons.length - 1;
        if (newIndex >= this.buttons.length) newIndex = 0;
        
        this.selectedButtonIndex = newIndex;
        this.updateButtonAppearance();
    }

    triggerSelection() {
        const btn = this.buttons[this.selectedButtonIndex];
        // Trigger pointerdown event manually or call logic
        btn.emit('pointerdown');
    }

    updateButtonAppearance() {
        this.buttons.forEach((btn, index) => {
            if (index === this.selectedButtonIndex) {
                btn.setStyle({ color: '#ffff00' });
            } else {
                btn.setStyle({ color: '#ffffff' });
            }
        });
    }

    resize (gameSize, baseSize?, displaySize?, resolution?)
    {
        // Check if cameras are available
        if (!this.cameras || !this.cameras.main) {
            return;
        }

        const width = (typeof gameSize === 'number') ? gameSize : gameSize.width;
        const height = (typeof gameSize === 'number') ? baseSize : gameSize.height;

        this.cameras.resize(width, height);

        const zoomX = width / this.GAME_WIDTH;
        const zoomY = height / this.GAME_HEIGHT;
        const zoom = Math.min(zoomX, zoomY);

        this.cameras.main.setZoom(zoom);
        this.cameras.main.centerOn(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2);
    }

    shutdown() {
        this.scale.off('resize', this.resize, this);
    }
}