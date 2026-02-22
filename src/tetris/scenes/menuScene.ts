import { CONST } from "../const/const";
import { BaseScene } from "./baseScene";
import { io, type Socket } from "socket.io-client";
import { getSocketUrl, SOCKET_PATH } from "../net/socketUtils";
import { GAME_FONT_FAMILY, PANEL_BG } from "../ui/uiStyles";
import { ensureGameFontReady } from "../ui/fontLoader";
import { KENNEY_UI_IMAGE_KEYS, preloadKenneyAssets } from "../ui/kenneyAssets";
import {
    extractSocketErrorMessage,
    isNMultiRoomJoinedPayload,
    isOneVsOneRoomJoinedPayload,
} from "../../shared/types/socketPayloads";

type MenuButtonKind = 'blue' | 'green' | 'red';
type MenuButtonState = 'normal' | 'hover' | 'pressed';

interface MenuButton {
    key: string;
    kind: MenuButtonKind;
    state: MenuButtonState;
    background: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    hitArea: Phaser.GameObjects.Rectangle;
    onClick: () => void;
}

export class MenuScene extends BaseScene {
    private root: Phaser.GameObjects.Container | null = null;
    private logo: Phaser.GameObjects.Image | null = null;
    private logoCaption: Phaser.GameObjects.Text | null = null;
    private panelBg: Phaser.GameObjects.Graphics | null = null;
    private panelInner: Phaser.GameObjects.Graphics | null = null;
    private panelBorder: Phaser.GameObjects.Graphics | null = null;
    private buttons: MenuButton[] = [];
    private selectedIndex: number = 0;
    private connectingText: Phaser.GameObjects.Text | null = null;
    private keyUpHandler: (() => void) | null = null;
    private keyDownHandler: (() => void) | null = null;
    private keyEnterHandler: (() => void) | null = null;
    private isShuttingDown: boolean = false;

    constructor() {
        super({ key: "MenuScene" });
    }

    init(): void {
        this.handleResolution();
        this.GAME_WIDTH = 500;
        this.GAME_HEIGHT = 1000;
        this.selectedIndex = 0;
        this.isShuttingDown = false;
    }

    preload(): void {
        this.load.spritesheet('blockSheet', '/assets/image/PPTdefaultMinoOnly.png', {
            frameHeight: CONST.SCREEN.BLOCK_IMAGE_SIZE,
            frameWidth: CONST.SCREEN.BLOCK_IMAGE_SIZE,
            margin: 4,
            spacing: 8,
        });
        this.load.image('menuTetrisLogo', '/assets/image/800px-The_Tetris_Company_logo_2019.png');
        preloadKenneyAssets(this);
    }

    create(): void {
        this.scale.on('resize', this.resize, this);
        this.events.once('shutdown', this.shutdown, this);
        this.createBackground();
        void this.initializeMenuFlow();
    }

    private async initializeMenuFlow(): Promise<void> {
        await ensureGameFontReady();
        if (this.isShuttingDown || !this.sys.isActive()) return;

        const nMultiMatch = window.location.pathname.match(/^\/n-multi\/(.+)$/);
        if (nMultiMatch) {
            const roomName = decodeURIComponent(nMultiMatch[1]);
            const urlParams = new URLSearchParams(window.location.search);
            const botLevel = parseInt(urlParams.get('bot') || '0', 10);
            this.joinNMultiRoomByUrl(roomName, botLevel);
            return;
        }

        const multiMatch = window.location.pathname.match(/^\/multi\/(.+)$/);
        if (multiMatch) {
            const roomName = decodeURIComponent(multiMatch[1]);
            const urlParams = new URLSearchParams(window.location.search);
            const botLevel = parseInt(urlParams.get('bot') || '0', 10);
            this.joinMultiRoomByUrl(roomName, botLevel);
            return;
        }

        this.createPhaserUI();
        this.resize(window.innerWidth, window.innerHeight);
    }

    private createPhaserUI(): void {
        this.destroyPhaserUI();

        this.root = this.add.container(0, 0).setDepth(100);
        this.panelBg = this.add.graphics();
        this.panelInner = this.add.graphics();
        this.panelBorder = this.add.graphics();

        this.logo = this.add.image(0, 0, 'menuTetrisLogo').setOrigin(0.5);
        this.logoCaption = this.add.text(0, 0, 'Qufox', {
            fontFamily: 'Connection, Pretendard, sans-serif',
            color: '#dcecff',
            fontStyle: 'bold',
            align: 'center',
        }).setOrigin(0.5);
        this.logoCaption.setStroke('#1f3d79', 6);
        this.logoCaption.setShadow(0, 2, '#0f2753', 0.45, true, true);

        this.buttons = [
            this.createButton('single', 'Single Player', 'red', () => this.scene.start('PlayScene', { mode: 'single' })),
            this.createButton('multi', '1 : 1', 'blue', () => this.scene.start('LobbyScene')),
            this.createButton('nmulti', 'Battle Royale', 'green', () => this.scene.start('NMultiLobbyScene')),
        ];

        this.root.add([
            this.panelBg,
            this.panelInner,
            this.panelBorder,
            this.logo,
            this.logoCaption,
            ...this.buttons.flatMap((button) => [button.background, button.hitArea, button.label]),
        ]);

        this.bindKeyboard();
        this.refreshSelectionVisuals();
        this.layoutUI();
    }

    private bindKeyboard(): void {
        this.unbindKeyboard();
        this.keyUpHandler = () => {
            if (!this.buttons.length) return;
            this.selectedIndex = (this.selectedIndex - 1 + this.buttons.length) % this.buttons.length;
            this.refreshSelectionVisuals();
        };
        this.keyDownHandler = () => {
            if (!this.buttons.length) return;
            this.selectedIndex = (this.selectedIndex + 1) % this.buttons.length;
            this.refreshSelectionVisuals();
        };
        this.keyEnterHandler = () => {
            const selected = this.buttons[this.selectedIndex];
            if (!selected) return;
            this.setButtonState(selected, 'pressed');
            this.time.delayedCall(80, () => {
                selected.onClick();
            });
        };
        this.input.keyboard.on('keydown-UP', this.keyUpHandler);
        this.input.keyboard.on('keydown-DOWN', this.keyDownHandler);
        this.input.keyboard.on('keydown-ENTER', this.keyEnterHandler);
    }

    private createButton(key: string, text: string, kind: MenuButtonKind, onClick: () => void): MenuButton {
        const button: MenuButton = {
            key,
            kind,
            state: 'normal',
            background: this.add.image(0, 0, this.resolveButtonTexture(kind, 'normal')).setOrigin(0.5),
            label: this.add.text(0, 0, text, {
                fontFamily: GAME_FONT_FAMILY,
                color: '#ffffff',
                fontStyle: 'bold',
                align: 'center',
            }).setOrigin(0.5),
            hitArea: this.add.rectangle(0, 0, 1, 1, 0x000000, 0.001).setOrigin(0.5),
            onClick,
        };

        button.label.setStroke('#163670', 4);
        button.hitArea.setInteractive({ useHandCursor: true });
        button.hitArea.on('pointerover', () => {
            this.selectedIndex = this.buttons.findIndex((item) => item.key === button.key);
            this.refreshSelectionVisuals();
        });
        button.hitArea.on('pointerout', () => {
            const isSelected = this.buttons[this.selectedIndex]?.key === button.key;
            this.setButtonState(button, isSelected ? 'hover' : 'normal');
        });
        button.hitArea.on('pointerdown', () => {
            this.setButtonState(button, 'pressed');
        });
        button.hitArea.on('pointerup', () => {
            this.selectedIndex = this.buttons.findIndex((item) => item.key === button.key);
            this.refreshSelectionVisuals();
            onClick();
        });

        return button;
    }

    private resolveButtonTexture(kind: MenuButtonKind, state: MenuButtonState): string {
        if (kind === 'green') {
            if (state === 'hover') return KENNEY_UI_IMAGE_KEYS.buttonGreenHover;
            if (state === 'pressed') return KENNEY_UI_IMAGE_KEYS.buttonGreenPressed;
            return KENNEY_UI_IMAGE_KEYS.buttonGreenNormal;
        }
        if (kind === 'red') {
            if (state === 'hover') return KENNEY_UI_IMAGE_KEYS.buttonRedHover;
            if (state === 'pressed') return KENNEY_UI_IMAGE_KEYS.buttonRedPressed;
            return KENNEY_UI_IMAGE_KEYS.buttonRedNormal;
        }
        if (state === 'hover') return KENNEY_UI_IMAGE_KEYS.buttonBlueHover;
        if (state === 'pressed') return KENNEY_UI_IMAGE_KEYS.buttonBluePressed;
        return KENNEY_UI_IMAGE_KEYS.buttonBlueNormal;
    }

    private setButtonState(button: MenuButton, state: MenuButtonState): void {
        button.state = state;
        button.background.setTexture(this.resolveButtonTexture(button.kind, state));
        button.label.setScale(state === 'pressed' ? 0.98 : 1);
    }

    private refreshSelectionVisuals(): void {
        this.buttons.forEach((button, index) => {
            const state = index === this.selectedIndex ? 'hover' : 'normal';
            this.setButtonState(button, state);
        });
    }

    private layoutUI(): void {
        if (!this.root || !this.panelBg || !this.panelInner || !this.panelBorder || !this.logo || !this.logoCaption) return;

        const cam = this.cameras.main;
        cam.preRender();
        const worldPerPixel = 1 / (cam.zoom || 1);
        const viewX = cam.worldView.x;
        const viewY = cam.worldView.y;
        const viewWidth = cam.width * worldPerPixel;
        const viewHeight = cam.height * worldPerPixel;
        const isPortrait = cam.height > cam.width;

        this.root.setPosition(viewX, viewY);

        const panelWidth = Math.min(viewWidth * (isPortrait ? 0.92 : 0.76), 760 * worldPerPixel);
        const panelHeight = Math.min(viewHeight * (isPortrait ? 0.7 : 0.72), 700 * worldPerPixel);
        const panelX = (viewWidth - panelWidth) / 2;
        const panelY = (viewHeight - panelHeight) / 2;
        const compactMobile = isPortrait && panelWidth < 430 * worldPerPixel;

        this.panelBg.clear();
        this.panelInner.clear();
        this.panelBorder.clear();

        this.panelBg.fillStyle(PANEL_BG.fillColor, PANEL_BG.fillAlpha);
        this.panelBg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);

        this.panelBorder.lineStyle(PANEL_BG.lineWidth, PANEL_BG.strokeColor, PANEL_BG.strokeAlpha);
        this.panelBorder.strokeRoundedRect(panelX, panelY, Math.max(1, panelWidth), Math.max(1, panelHeight), 10);

        const logoSource = this.logo.texture.getSourceImage() as { width?: number; height?: number };
        const logoAspect = (logoSource?.width && logoSource?.height)
            ? logoSource.width / logoSource.height
            : this.logo.width / Math.max(1, this.logo.height);
        const logoScale = 1.05;
        const baseLogoMaxWidth = Math.min(panelWidth * (compactMobile ? 0.64 : 0.62), 420 * worldPerPixel);
        const logoMaxWidth = baseLogoMaxWidth * logoScale;
        let logoWidth = logoMaxWidth;
        let logoHeight = logoWidth / Math.max(0.1, logoAspect);
        const maxLogoHeightByTop = Math.max(72 * worldPerPixel, (panelY - 8 * worldPerPixel) * 3.4);
        if (logoHeight > maxLogoHeightByTop) {
            logoHeight = maxLogoHeightByTop;
            logoWidth = logoHeight * logoAspect;
        }

        const logoX = panelX + panelWidth / 2;
        const logoY = panelY + logoHeight * 0.18;
        this.logo.setPosition(logoX, logoY);
        this.logo.setDisplaySize(logoWidth, logoHeight);

        const captionMaxWidth = logoWidth * 0.58;
        const captionPreferredSize = Math.round(Math.max(18 * worldPerPixel, logoHeight * 0.18));
        const captionMinSize = Math.round(Math.max(11 * worldPerPixel, logoHeight * 0.11));
        this.logoCaption.setPosition(logoX, logoY + logoHeight * 0.24);
        this.applyFittedFontSize(this.logoCaption, captionPreferredSize, captionMinSize, captionMaxWidth);
        this.logoCaption.setStroke('#1f3d79', Math.max(2, Math.round(5 * worldPerPixel)));
        this.logoCaption.setShadow(0, Math.max(1, Math.round(2 * worldPerPixel)), '#0f2753', 0.45, true, true);

        const buttonCount = this.buttons.length;
        const sidePadding = compactMobile ? 18 * worldPerPixel : 40 * worldPerPixel;
        const buttonWidth = Math.min(panelWidth - sidePadding * 2, 520 * worldPerPixel);

        const headerBottom = logoY + logoHeight / 2;
        const topGap = compactMobile
            ? Math.max(4 * worldPerPixel, panelHeight * 0.008)
            : Math.max(6 * worldPerPixel, panelHeight * 0.013);
        const buttonAreaTop = headerBottom + topGap;
        const buttonAreaBottom = panelY + panelHeight - Math.max(8 * worldPerPixel, panelHeight * 0.022);
        const buttonAreaHeight = Math.max(1, buttonAreaBottom - buttonAreaTop);

        const minButtonHeight = compactMobile
            ? Math.max(22 * worldPerPixel, panelHeight * 0.038)
            : Math.max(28 * worldPerPixel, panelHeight * 0.05);
        let buttonGap = compactMobile
            ? Math.max(5 * worldPerPixel, panelHeight * 0.009)
            : Math.max(8 * worldPerPixel, panelHeight * 0.015);
        let buttonHeight = (buttonAreaHeight - buttonGap * Math.max(0, buttonCount - 1)) / Math.max(1, buttonCount);

        if (buttonCount > 1 && buttonHeight < minButtonHeight) {
            const fittedGap = (buttonAreaHeight - minButtonHeight * buttonCount) / (buttonCount - 1);
            buttonGap = Math.max(4 * worldPerPixel, fittedGap);
            buttonHeight = (buttonAreaHeight - buttonGap * (buttonCount - 1)) / buttonCount;
        }

        const absoluteMinHeight = compactMobile ? 18 * worldPerPixel : 24 * worldPerPixel;
        buttonHeight = Math.max(absoluteMinHeight, buttonHeight);
        const compressedButtonHeight = Math.max(absoluteMinHeight, buttonHeight * 0.52);
        buttonHeight = compressedButtonHeight;

        const totalButtonsHeight = buttonHeight * buttonCount + buttonGap * Math.max(0, buttonCount - 1);
        const freeVerticalSpace = Math.max(0, buttonAreaHeight - totalButtonsHeight);
        const buttonStartY = buttonAreaTop + freeVerticalSpace * 0.2 + buttonHeight / 2;

        this.buttons.forEach((button, idx) => {
            const x = panelX + panelWidth / 2;
            const y = buttonStartY + idx * (buttonHeight + buttonGap);

            button.background.setPosition(x, y);
            button.background.setDisplaySize(buttonWidth, buttonHeight);

            button.hitArea.setPosition(x, y);
            button.hitArea.setSize(buttonWidth, buttonHeight);

            button.label.setPosition(x, y + (button.state === 'pressed' ? Math.max(1, Math.round(2 * worldPerPixel)) : 0));
            const labelPreferredSize = Math.round(Math.max(13 * worldPerPixel, buttonHeight * 0.42));
            const labelMinSize = Math.round(Math.max(10 * worldPerPixel, buttonHeight * 0.28));
            const labelMaxWidth = Math.max(24, buttonWidth - 18 * worldPerPixel);
            this.applyFittedFontSize(button.label, labelPreferredSize, labelMinSize, labelMaxWidth);
        });
    }

    private applyFittedFontSize(text: Phaser.GameObjects.Text, preferredSize: number, minSize: number, maxWidth: number): void {
        const safeMin = Math.max(1, Math.floor(minSize));
        const safePreferred = Math.max(safeMin, Math.floor(preferredSize));

        if (maxWidth <= 0) {
            text.setFontSize(safeMin);
            return;
        }

        let low = safeMin;
        let high = safePreferred;
        let best = safeMin;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            text.setFontSize(mid);
            if (text.width <= maxWidth) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        text.setFontSize(best);
    }

    private createConnectingText(): Phaser.GameObjects.Text {
        if (this.connectingText) {
            this.connectingText.destroy();
        }
        this.connectingText = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, 'Connecting...', {
            fontFamily: GAME_FONT_FAMILY,
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);
        return this.connectingText;
    }

    private joinNMultiRoomByUrl(roomName: string, botLevel: number = 0): void {
        const connectingText = this.createConnectingText();
        const socket: Socket = io(getSocketUrl(), { path: SOCKET_PATH });

        socket.on('connect', () => {
            socket.emit('nmulti_join_or_create', { roomName, botLevel });
        });

        socket.on('nmulti_room_joined', (data: unknown) => {
            if (!isNMultiRoomJoinedPayload(data)) {
                connectingText.destroy();
                this.connectingText = null;
                socket.disconnect();
                alert('Failed to join room: invalid room payload.');
                history.replaceState(null, '', '/');
                this.createPhaserUI();
                this.resize(window.innerWidth, window.innerHeight);
                return;
            }
            connectingText.destroy();
            this.connectingText = null;
            this.scene.start("NMultiPlayScene", {
                socket,
                roomId: data.roomId,
                playerId: data.playerId,
                playerName: data.playerName,
                initialPlayers: data.players,
                roomName,
                botLevel,
                authSeed: data.authSeed,
                authSnapshot: data.authSnapshot,
            });
        });

        socket.on('nmulti_room_error', (payload: unknown) => {
            connectingText.destroy();
            this.connectingText = null;
            socket.disconnect();
            const message = extractSocketErrorMessage(payload, 'Failed to join room.');
            alert(`Failed to join room: ${message}`);
            history.replaceState(null, '', '/');
            this.createPhaserUI();
            this.resize(window.innerWidth, window.innerHeight);
        });

        socket.on('connect_error', () => {
            connectingText.destroy();
            this.connectingText = null;
            socket.disconnect();
            alert('Failed to connect to server.');
            history.replaceState(null, '', '/');
            this.createPhaserUI();
            this.resize(window.innerWidth, window.innerHeight);
        });
    }

    private joinMultiRoomByUrl(roomName: string, botLevel: number = 0): void {
        const connectingText = this.createConnectingText();
        const socket: Socket = io(getSocketUrl(), { path: SOCKET_PATH });

        socket.on('connect', () => {
            socket.emit('join_or_create', { roomName, botLevel });
        });

        socket.on('room_joined', (data: unknown) => {
            if (!isOneVsOneRoomJoinedPayload(data)) {
                connectingText.destroy();
                this.connectingText = null;
                socket.disconnect();
                alert('Failed to join room: invalid room payload.');
                history.replaceState(null, '', '/');
                this.createPhaserUI();
                this.resize(window.innerWidth, window.innerHeight);
                return;
            }
            connectingText.destroy();
            this.connectingText = null;
            this.scene.start("PlayScene", {
                mode: 'multi',
                socket,
                roomId: data.roomId,
                isHost: data.isHost,
                roomName,
                resumeToken: data.resumeToken,
                botLevel,
                authQueueSeed: data.authSeed,
                authSnapshot: data.authSnapshot,
            });
        });

        socket.on('room_error', (payload: unknown) => {
            connectingText.destroy();
            this.connectingText = null;
            socket.disconnect();
            const message = extractSocketErrorMessage(payload, 'Failed to join room.');
            alert(`Failed to join room: ${message}`);
            history.replaceState(null, '', '/');
            this.createPhaserUI();
            this.resize(window.innerWidth, window.innerHeight);
        });

        socket.on('connect_error', () => {
            connectingText.destroy();
            this.connectingText = null;
            socket.disconnect();
            alert('Failed to connect to server.');
            history.replaceState(null, '', '/');
            this.createPhaserUI();
            this.resize(window.innerWidth, window.innerHeight);
        });
    }

    resize(gameSize, baseSize?, displaySize?, resolution?) {
        super.resize(gameSize, baseSize, displaySize, resolution);
        this.layoutUI();
    }

    update(_time: number, delta: number): void {
        this.updateBackgroundAnimation(delta);
    }

    private destroyPhaserUI(): void {
        this.buttons.forEach((button) => {
            button.background.destroy();
            button.label.destroy();
            button.hitArea.destroy();
        });
        this.buttons = [];
        if (this.logo) this.logo.destroy();
        if (this.logoCaption) this.logoCaption.destroy();
        if (this.panelBg) this.panelBg.destroy();
        if (this.panelInner) this.panelInner.destroy();
        if (this.panelBorder) this.panelBorder.destroy();
        if (this.root) this.root.destroy();
        this.logo = null;
        this.logoCaption = null;
        this.panelBg = null;
        this.panelInner = null;
        this.panelBorder = null;
        this.root = null;
    }

    private unbindKeyboard(): void {
        if (this.keyUpHandler) this.input.keyboard.off('keydown-UP', this.keyUpHandler);
        if (this.keyDownHandler) this.input.keyboard.off('keydown-DOWN', this.keyDownHandler);
        if (this.keyEnterHandler) this.input.keyboard.off('keydown-ENTER', this.keyEnterHandler);
        this.keyUpHandler = null;
        this.keyDownHandler = null;
        this.keyEnterHandler = null;
    }

    shutdown() {
        this.isShuttingDown = true;
        this.unbindKeyboard();
        if (this.connectingText) {
            this.connectingText.destroy();
            this.connectingText = null;
        }
        this.destroyPhaserUI();
        this.scale.off('resize', this.resize, this);
    }
}
