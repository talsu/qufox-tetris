import { CONST } from "../const/const";
import { BaseScene } from "./baseScene";
import { io, Socket } from "socket.io-client";
import { getSocketUrl, SOCKET_PATH } from "../net/socketUtils";
import { GAME_FONT_FAMILY } from "../ui/uiStyles";
import { ensureGameFontReady } from "../ui/fontLoader";


export class MenuScene extends BaseScene {
    private menuContainer: Phaser.GameObjects.DOMElement;

    constructor() {
        super({
            key: "MenuScene"
        });
    }

    init(): void {
        this.handleResolution();

        this.GAME_WIDTH = 500;
        this.GAME_HEIGHT = 1000;
    }

    preload(): void {
        this.load.spritesheet('blockSheet', '/assets/image/PPTdefaultMinoOnly.png', { frameHeight: CONST.SCREEN.BLOCK_IMAGE_SIZE, frameWidth: CONST.SCREEN.BLOCK_IMAGE_SIZE, margin: 4, spacing: 8 });
    }

    create(): void {
        // Register resize handler
        this.scale.on('resize', this.resize, this);
        this.events.on('shutdown', this.shutdown, this);

        this.createBackground();
        void this.initializeMenuFlow();
    }

    private async initializeMenuFlow(): Promise<void> {
        await ensureGameFontReady();

        // Check for /n-multi/{roomName} URL pattern
        const nMultiMatch = window.location.pathname.match(/^\/n-multi\/(.+)$/);
        if (nMultiMatch) {
            const roomName = decodeURIComponent(nMultiMatch[1]);
            const urlParams = new URLSearchParams(window.location.search);
            const botLevel = parseInt(urlParams.get('bot') || '0', 10);
            this.joinNMultiRoomByUrl(roomName, botLevel);
            return;
        }

        // Check for /multi/{roomName} URL pattern
        const multiMatch = window.location.pathname.match(/^\/multi\/(.+)$/);
        if (multiMatch) {
            const roomName = decodeURIComponent(multiMatch[1]);
            const urlParams = new URLSearchParams(window.location.search);
            const botLevel = parseInt(urlParams.get('bot') || '0', 10);
            this.joinMultiRoomByUrl(roomName, botLevel);
            return;
        }

        this.createDOMUI();

        // Initial resize
        this.resize(window.innerWidth, window.innerHeight);
    }

    private joinNMultiRoomByUrl(roomName: string, botLevel: number = 0): void {
        // Show connecting text
        const connectingText = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, 'Connecting...', {
            fontFamily: GAME_FONT_FAMILY,
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const socket: Socket = io(getSocketUrl(), { path: SOCKET_PATH });

        socket.on('connect', () => {
            socket.emit('nmulti_join_or_create', { roomName });
        });

        socket.on('nmulti_room_joined', (data: any) => {
            connectingText.destroy();
            this.scene.start("NMultiPlayScene", {
                socket,
                roomId: data.roomId,
                playerId: data.playerId,
                playerName: data.playerName,
                initialPlayers: data.players,
                roomName: roomName,
                botLevel: botLevel
            });
        });

        socket.on('nmulti_room_error', (msg: string) => {
            connectingText.destroy();
            socket.disconnect();
            alert('Failed to join room: ' + msg);
            history.replaceState(null, '', '/');
            this.createDOMUI();
            this.resize(window.innerWidth, window.innerHeight);
        });

        socket.on('connect_error', () => {
            connectingText.destroy();
            socket.disconnect();
            alert('Failed to connect to server.');
            history.replaceState(null, '', '/');
            this.createDOMUI();
            this.resize(window.innerWidth, window.innerHeight);
        });
    }

    private joinMultiRoomByUrl(roomName: string, botLevel: number = 0): void {
        const connectingText = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, 'Connecting...', {
            fontFamily: GAME_FONT_FAMILY,
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const socket: Socket = io(getSocketUrl(), { path: SOCKET_PATH });

        socket.on('connect', () => {
            socket.emit('join_or_create', { roomName });
        });

        socket.on('room_joined', (data: any) => {
            connectingText.destroy();
            this.scene.start("PlayScene", {
                mode: 'multi',
                socket,
                roomId: data.roomId,
                isHost: data.isHost,
                roomName: roomName,
                botLevel: botLevel
            });
        });

        socket.on('room_error', (msg: string) => {
            connectingText.destroy();
            socket.disconnect();
            alert('Failed to join room: ' + msg);
            history.replaceState(null, '', '/');
            this.createDOMUI();
            this.resize(window.innerWidth, window.innerHeight);
        });

        socket.on('connect_error', () => {
            connectingText.destroy();
            socket.disconnect();
            alert('Failed to connect to server.');
            history.replaceState(null, '', '/');
            this.createDOMUI();
            this.resize(window.innerWidth, window.innerHeight);
        });
    }

    createDOMUI() {
        const html = `
        <div class="menu-container">
            <div class="main-menu-wrapper">
                <h1 class="game-title">QUFOX<br>TETRIS</h1>
                <button class="puyo-btn accent" id="singleBtn">Single Player</button>
                <button class="puyo-btn" id="multiBtn">Multiplayer</button>
                <button class="puyo-btn green" id="nMultiBtn">N-Multiplay</button>
            </div>
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

        const nMultiBtn = this.menuContainer.getChildByID('nMultiBtn') as HTMLElement;
        if (nMultiBtn) {
            nMultiBtn.addEventListener('click', () => {
                this.scene.start("NMultiLobbyScene");
            });
        }
    }

    resize(gameSize, baseSize?, displaySize?, resolution?) {
        super.resize(gameSize, baseSize, displaySize, resolution);
        if (this.menuContainer) {
            this.menuContainer.setScale(this.cameras.main.zoom);
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
