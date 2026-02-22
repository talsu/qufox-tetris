import { io, Socket } from "socket.io-client";
import { BaseScene } from "./baseScene";
import { getSocketUrl, SOCKET_PATH } from "../net/socketUtils";
import { GAME_FONT_FAMILY } from "../ui/uiStyles";
import { PANEL_BG } from "../ui/uiStyles";
import { KENNEY_UI_IMAGE_KEYS, preloadKenneyAssets } from "../ui/kenneyAssets";

interface LobbyConfig {
    sceneKey: string;
    title: string;
    playScene: string;
    maxPlayers: number;
    urlPrefix: string;
    events: {
        getRooms: string;
        roomList: string;
        createRoom: string;
        joinRoom: string;
        roomJoined: string;
        roomError: string;
    };
    buildSceneData: (socket: Socket, data: any) => any;
}

type BtnKind = 'blue' | 'green' | 'red';
type BtnState = 'normal' | 'hover' | 'pressed';

interface UiButton {
    bg: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    hitArea: Phaser.GameObjects.Rectangle;
    kind: BtnKind;
    state: BtnState;
    onClick: () => void;
}

interface RoomUiRow {
    root: Phaser.GameObjects.Container;
    bg: Phaser.GameObjects.Graphics;
    name: Phaser.GameObjects.Text;
    fullName: string;
    players: Phaser.GameObjects.Text;
    joinBtn: UiButton;
}

const MULTI_CONFIG: LobbyConfig = {
    sceneKey: 'LobbyScene',
    title: '1 : 1',
    playScene: 'PlayScene',
    maxPlayers: 2,
    urlPrefix: '/multi',
    events: {
        getRooms: 'get_rooms',
        roomList: 'room_list',
        createRoom: 'create_room',
        joinRoom: 'join_room',
        roomJoined: 'room_joined',
        roomError: 'room_error',
    },
    buildSceneData: (socket, data) => ({
        mode: 'multi',
        socket,
        roomId: data.roomId,
        isHost: data.isHost,
        roomName: data.roomName,
        resumeToken: data.resumeToken,
    }),
};

const NMULTI_CONFIG: LobbyConfig = {
    sceneKey: 'NMultiLobbyScene',
    title: 'Battle Royale',
    playScene: 'NMultiPlayScene',
    maxPlayers: 100,
    urlPrefix: '/n-multi',
    events: {
        getRooms: 'nmulti_get_rooms',
        roomList: 'nmulti_room_list',
        createRoom: 'nmulti_create_room',
        joinRoom: 'nmulti_join_room',
        roomJoined: 'nmulti_room_joined',
        roomError: 'nmulti_room_error',
    },
    buildSceneData: (socket, data) => ({
        socket,
        roomId: data.roomId,
        playerId: data.playerId,
        playerName: data.playerName,
        initialPlayers: data.players,
        roomName: data.roomName,
    }),
};

class BaseLobbyScene extends BaseScene {
    private socket: Socket;
    private roomList: any[] = [];
    protected lobbyConfig: LobbyConfig;

    private root: Phaser.GameObjects.Container | null = null;
    private panelBg: Phaser.GameObjects.Graphics | null = null;
    private panelInner: Phaser.GameObjects.Graphics | null = null;
    private panelBorder: Phaser.GameObjects.Graphics | null = null;
    private titleText: Phaser.GameObjects.Text | null = null;
    private emptyText: Phaser.GameObjects.Text | null = null;
    private createBtn: UiButton | null = null;
    private backBtn: UiButton | null = null;

    private listViewportBg: Phaser.GameObjects.Graphics | null = null;
    private listMaskShape: Phaser.GameObjects.Graphics | null = null;
    private listContainer: Phaser.GameObjects.Container | null = null;
    private listHitArea: Phaser.GameObjects.Rectangle | null = null;
    private roomRows: RoomUiRow[] = [];

    private listX: number = 0;
    private listY: number = 0;
    private listWidth: number = 0;
    private listHeight: number = 0;
    private listContentHeight: number = 0;
    private scrollOffset: number = 0;
    private draggingList: boolean = false;
    private lastPointerY: number = 0;

    private onSocketConnect: (() => void) | null = null;
    private onRoomList: ((rooms: any[]) => void) | null = null;
    private onRoomJoined: ((data: any) => void) | null = null;
    private onRoomError: ((msg: string) => void) | null = null;
    private onSocketDisconnect: (() => void) | null = null;
    private onWheel: ((pointer: Phaser.Input.Pointer, over: any, dx: number, dy: number) => void) | null = null;

    constructor(config: LobbyConfig) {
        super({ key: config.sceneKey });
        this.lobbyConfig = config;
    }

    init() {
        this.handleResolution();
        this.GAME_WIDTH = 500;
        this.GAME_HEIGHT = 1000;
        this.scrollOffset = 0;
    }

    preload(): void {
        preloadKenneyAssets(this);
    }

    create(): void {
        this.scale.on('resize', this.resize, this);
        this.events.once('shutdown', this.shutdown, this);
        this.createBackground();
        this.createPhaserUI();

        if (!this.socket || !this.socket.connected) {
            this.socket = io(getSocketUrl(), { path: SOCKET_PATH });
            this.setupSocketEvents();
        } else {
            this.setupSocketEvents();
            this.socket.emit(this.lobbyConfig.events.getRooms);
        }

        this.resize(window.innerWidth, window.innerHeight);
    }

    private createPhaserUI(): void {
        this.destroyPhaserUI();

        this.root = this.add.container(0, 0).setDepth(100);
        this.panelBg = this.add.graphics();
        this.panelInner = this.add.graphics();
        this.panelBorder = this.add.graphics();

        this.titleText = this.add.text(0, 0, this.lobbyConfig.title, {
            fontFamily: 'Connection, Pretendard, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center',
        }).setOrigin(0, 0.5);
        this.titleText.setStroke('#3559a5', 7);

        this.createBtn = this.createButton('Create Room', 'green', () => this.handleCreateRoom());
        this.backBtn = this.createButton('Back', 'red', () => this.handleBack());

        this.listViewportBg = this.add.graphics();
        this.listMaskShape = this.make.graphics();
        this.listContainer = this.add.container(0, 0);
        this.listHitArea = this.add.rectangle(0, 0, 1, 1, 0x000000, 0.001).setOrigin(0);
        this.listHitArea.setInteractive({ useHandCursor: true, draggable: true });

        this.emptyText = this.add.text(0, 0, 'Loading rooms...', {
            fontFamily: GAME_FONT_FAMILY,
            fontSize: '26px',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center',
        }).setOrigin(0.5);
        this.emptyText.setStroke('#000000', 4);

        const mask = this.listMaskShape.createGeometryMask();
        this.listContainer.setMask(mask);

        this.root.add([
            this.panelBg,
            this.panelInner,
            this.panelBorder,
            this.titleText,
            this.createBtn.bg,
            this.createBtn.hitArea,
            this.createBtn.label,
            this.backBtn.bg,
            this.backBtn.hitArea,
            this.backBtn.label,
            this.listViewportBg,
            this.listHitArea,
            this.listContainer,
            this.emptyText,
        ]);

        this.listHitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.draggingList = true;
            this.lastPointerY = pointer.y;
        });
        this.listHitArea.on('pointerup', () => {
            this.draggingList = false;
        });
        this.listHitArea.on('pointerout', () => {
            this.draggingList = false;
        });
        this.listHitArea.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!this.draggingList) return;
            const delta = pointer.y - this.lastPointerY;
            this.lastPointerY = pointer.y;
            this.applyScroll(this.scrollOffset - delta / (this.cameras.main.zoom || 1));
        });

        this.onWheel = (pointer: Phaser.Input.Pointer, _over: any, _dx: number, dy: number) => {
            if (!this.isPointInsideList(pointer.x, pointer.y)) return;
            this.applyScroll(this.scrollOffset + dy / (this.cameras.main.zoom || 1));
        };
        this.input.on('wheel', this.onWheel);
    }

    private setupSocketEvents() {
        const { events } = this.lobbyConfig;

        this.onSocketConnect = () => {
            this.socket.emit(events.getRooms);
        };

        this.onRoomList = (rooms: any[]) => {
            this.roomList = rooms;
            this.refreshRoomList();
        };

        this.onRoomJoined = (data: any) => {
            if (data.roomName) {
                history.replaceState(null, '', this.lobbyConfig.urlPrefix + '/' + encodeURIComponent(data.roomName));
            }
            this.scene.start(this.lobbyConfig.playScene, this.lobbyConfig.buildSceneData(this.socket, data));
        };

        this.onRoomError = (msg: string) => {
            alert(msg);
        };

        this.onSocketDisconnect = () => {
        };

        this.socket.on('connect', this.onSocketConnect);
        this.socket.on(events.roomList, this.onRoomList);
        this.socket.on(events.roomJoined, this.onRoomJoined);
        this.socket.on(events.roomError, this.onRoomError);
        this.socket.on('disconnect', this.onSocketDisconnect);
    }

    private handleCreateRoom(): void {
        const roomName = prompt('Enter room name:', 'My Room');
        if (!roomName || !this.socket) return;
        const payload = this.lobbyConfig.maxPlayers > 2 ? { roomName } : roomName;
        this.socket.emit(this.lobbyConfig.events.createRoom, payload);
    }

    private handleBack(): void {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.scene.start('MenuScene');
    }

    private createButton(text: string, kind: BtnKind, onClick: () => void): UiButton {
        const button: UiButton = {
            bg: this.add.image(0, 0, this.resolveButtonTexture(kind, 'normal')).setOrigin(0.5),
            label: this.add.text(0, 0, text, {
                fontFamily: GAME_FONT_FAMILY,
                color: '#ffffff',
                fontStyle: 'bold',
                align: 'center',
            }).setOrigin(0.5),
            hitArea: this.add.rectangle(0, 0, 1, 1, 0x000000, 0.001).setOrigin(0.5),
            kind,
            state: 'normal',
            onClick,
        };

        button.label.setStroke('#163670', 4);
        button.hitArea.setInteractive({ useHandCursor: true });
        button.hitArea.on('pointerover', () => this.setButtonState(button, 'hover'));
        button.hitArea.on('pointerout', () => this.setButtonState(button, 'normal'));
        button.hitArea.on('pointerdown', () => this.setButtonState(button, 'pressed'));
        button.hitArea.on('pointerup', () => {
            this.setButtonState(button, 'hover');
            button.onClick();
        });

        return button;
    }

    private resolveButtonTexture(kind: BtnKind, state: BtnState): string {
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

    private setButtonState(button: UiButton, state: BtnState): void {
        button.state = state;
        button.bg.setTexture(this.resolveButtonTexture(button.kind, state));
        button.label.setScale(state === 'pressed' ? 0.985 : 1);
    }

    private refreshRoomList() {
        if (!this.listContainer || !this.emptyText) return;

        this.roomRows.forEach((row) => {
            row.joinBtn.bg.destroy();
            row.joinBtn.label.destroy();
            row.joinBtn.hitArea.destroy();
            row.bg.destroy();
            row.name.destroy();
            row.players.destroy();
            row.root.destroy();
        });
        this.roomRows = [];
        this.listContainer.removeAll(false);

        if (this.roomList.length === 0) {
            this.emptyText.setText('No rooms found. Create One!');
            this.emptyText.setVisible(true);
            this.listContentHeight = 0;
            this.applyScroll(0);
            return;
        }

        this.emptyText.setVisible(false);
        const maxPlayers = this.lobbyConfig.maxPlayers;
        const rowHeight = 98;
        const rowGap = 14;

        this.roomList.forEach((room, idx) => {
            const playerCount = room.playerCount ?? room.players ?? 0;
            const rowRoot = this.add.container(0, 0);
            const bg = this.add.graphics();
            const name = this.add.text(0, 0, String(room.name ?? 'Room'), {
                fontFamily: GAME_FONT_FAMILY,
                fontSize: '28px',
                fontStyle: 'bold',
                color: '#ffffff',
            }).setOrigin(0, 0.5);
            const players = this.add.text(0, 0, `${playerCount}/${maxPlayers}`, {
                fontFamily: GAME_FONT_FAMILY,
                fontSize: '20px',
                fontStyle: 'bold',
                color: '#ff9f1a',
            }).setOrigin(1, 0.5);
            name.setStroke('#000000', 4);
            players.setStroke('#000000', 4);
            const joinBtn = this.createButton('JOIN', 'blue', () => {
                if (!this.socket) return;
                const payload = this.lobbyConfig.maxPlayers > 2 ? { roomId: room.id } : room.id;
                this.socket.emit(this.lobbyConfig.events.joinRoom, payload);
            });

            rowRoot.add([bg, name, players, joinBtn.bg, joinBtn.hitArea, joinBtn.label]);
            this.listContainer.add(rowRoot);
            this.roomRows.push({ root: rowRoot, bg, name, fullName: String(room.name ?? 'Room'), players, joinBtn });

            rowRoot.setPosition(0, idx * (rowHeight + rowGap));
        });

        this.listContentHeight = this.roomRows.length * (rowHeight + rowGap) - rowGap;
        this.layoutRoomRows();
        this.applyScroll(this.scrollOffset);
    }

    private layoutRoomRows(): void {
        if (!this.roomRows.length) return;
        const rowHeight = Math.max(72, Math.round(this.listHeight * 0.16));
        const rowGap = Math.max(10, Math.round(this.listHeight * 0.02));

        this.roomRows.forEach((row, idx) => {
            const y = idx * (rowHeight + rowGap);
            row.root.setPosition(0, y);

            row.bg.clear();
            row.bg.fillStyle(PANEL_BG.fillColor, PANEL_BG.fillAlpha);
            row.bg.fillRoundedRect(0, 0, this.listWidth, rowHeight, 10);
            row.bg.lineStyle(PANEL_BG.lineWidth, PANEL_BG.strokeColor, PANEL_BG.strokeAlpha);
            row.bg.strokeRoundedRect(0, 0, this.listWidth, rowHeight, 10);

            const leftPad = Math.max(12, Math.round(this.listWidth * 0.03));
            const joinBtnWidth = Math.max(84, Math.round(this.listWidth * 0.22));
            const joinBtnHeight = Math.max(44, Math.round(rowHeight * 0.62));
            const joinBtnRight = Math.max(8, Math.round(this.listWidth * 0.02));
            const playersRight = this.listWidth - joinBtnWidth - joinBtnRight - Math.max(8, Math.round(this.listWidth * 0.02));
            const nameMaxWidth = Math.max(42, playersRight - leftPad - 8);

            row.name.setFontSize(Math.round(Math.max(18, rowHeight * 0.32)));
            row.name.setText(this.fitTextToWidth(row.name, row.fullName, nameMaxWidth));
            row.name.setPosition(leftPad, rowHeight / 2);

            row.players.setFontSize(Math.round(Math.max(14, rowHeight * 0.24)));
            row.players.setPosition(playersRight, rowHeight / 2);

            row.joinBtn.bg.setPosition(this.listWidth - joinBtnWidth / 2 - joinBtnRight, rowHeight / 2);
            row.joinBtn.bg.setDisplaySize(joinBtnWidth, joinBtnHeight);
            row.joinBtn.hitArea.setPosition(this.listWidth - joinBtnWidth / 2 - joinBtnRight, rowHeight / 2);
            row.joinBtn.hitArea.setSize(joinBtnWidth, joinBtnHeight);
            row.joinBtn.label.setPosition(this.listWidth - joinBtnWidth / 2 - joinBtnRight, rowHeight / 2);
            row.joinBtn.label.setFontSize(Math.round(Math.max(14, joinBtnHeight * 0.42)));
        });

        this.listContentHeight = this.roomRows.length * (rowHeight + rowGap) - rowGap;
    }

    private applyScroll(next: number): void {
        if (!this.listContainer) return;
        const maxScroll = Math.max(0, this.listContentHeight - this.listHeight);
        this.scrollOffset = Phaser.Math.Clamp(next, 0, maxScroll);
        this.listContainer.setPosition(this.listX, this.listY - this.scrollOffset);
    }

    private isPointInsideList(screenX: number, screenY: number): boolean {
        const cam = this.cameras.main;
        const worldPoint = cam.getWorldPoint(screenX, screenY);
        const listWorldX = cam.worldView.x + this.listX;
        const listWorldY = cam.worldView.y + this.listY;
        return worldPoint.x >= listWorldX
            && worldPoint.x <= listWorldX + this.listWidth
            && worldPoint.y >= listWorldY
            && worldPoint.y <= listWorldY + this.listHeight;
    }

    private layoutUI(): void {
        if (!this.root || !this.panelBg || !this.panelInner || !this.panelBorder || !this.titleText || !this.createBtn || !this.backBtn || !this.listViewportBg || !this.listMaskShape || !this.listContainer || !this.listHitArea || !this.emptyText) {
            return;
        }

        const cam = this.cameras.main;
        cam.preRender();
        const worldPerPixel = 1 / (cam.zoom || 1);
        const viewX = cam.worldView.x;
        const viewY = cam.worldView.y;
        const viewWidth = cam.width * worldPerPixel;
        const viewHeight = cam.height * worldPerPixel;
        const isPortrait = cam.height > cam.width;

        this.root.setPosition(viewX, viewY);

        const panelWidth = Math.min(viewWidth * (isPortrait ? 0.94 : 0.86), 860 * worldPerPixel);
        const panelHeight = Math.min(viewHeight * (isPortrait ? 0.9 : 0.88), 860 * worldPerPixel);
        const panelX = (viewWidth - panelWidth) / 2;
        const panelY = (viewHeight - panelHeight) / 2;

        this.panelBg.clear();
        this.panelInner.clear();
        this.panelBorder.clear();

        this.panelBg.fillStyle(PANEL_BG.fillColor, PANEL_BG.fillAlpha);
        this.panelBg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);

        this.panelBorder.lineStyle(PANEL_BG.lineWidth, PANEL_BG.strokeColor, PANEL_BG.strokeAlpha);
        this.panelBorder.strokeRoundedRect(panelX, panelY, Math.max(1, panelWidth), Math.max(1, panelHeight), 10);

        const compactHeader = isPortrait && panelWidth < 430 * worldPerPixel;
        let headerHeight = compactHeader
            ? Math.max(146 * worldPerPixel, panelHeight * 0.18)
            : Math.max(108 * worldPerPixel, panelHeight * 0.18);

        const titlePreferredSize = Math.round((compactHeader ? 44 : isPortrait ? 52 : 64) * worldPerPixel);
        const titleMinSize = Math.round(Math.max(16 * worldPerPixel, titlePreferredSize * 0.55));

        let actionBtnWidth: number;
        let actionBtnHeight: number;
        const actionGap = Math.max(8 * worldPerPixel, panelWidth * 0.02);
        let actionY: number;
        let backX: number;
        let createX: number;
        let titleMaxWidth: number;

        if (compactHeader) {
            const centerX = panelX + panelWidth / 2;
            const actionAreaWidth = panelWidth - 36 * worldPerPixel;
            actionBtnWidth = Math.max(88 * worldPerPixel, Math.min(150 * worldPerPixel, (actionAreaWidth - actionGap) / 2));
            actionBtnHeight = Math.max(42 * worldPerPixel, headerHeight * 0.26);
            actionY = panelY + headerHeight / 2;
            createX = centerX - (actionBtnWidth / 2 + actionGap / 2);
            backX = centerX + (actionBtnWidth / 2 + actionGap / 2);

            this.titleText.setOrigin(0.5, 0.5);
            this.titleText.setPosition(centerX, panelY + 44 * worldPerPixel);
            titleMaxWidth = panelWidth - 36 * worldPerPixel;
        } else {
            actionBtnWidth = Math.min(178 * worldPerPixel, panelWidth * 0.24);
            actionBtnHeight = Math.max(52 * worldPerPixel, headerHeight * 0.48);
            actionY = panelY + headerHeight / 2;
            backX = panelX + panelWidth - actionBtnWidth / 2 - 18 * worldPerPixel;
            createX = backX - actionBtnWidth - actionGap;

            this.titleText.setOrigin(0, 0.5);
            this.titleText.setPosition(panelX + 20 * worldPerPixel, panelY + headerHeight / 2);
            titleMaxWidth = Math.max(80 * worldPerPixel, createX - actionBtnWidth / 2 - (panelX + 20 * worldPerPixel));
        }

        this.applyFittedFontSize(this.titleText, titlePreferredSize, titleMinSize, titleMaxWidth);
        this.titleText.setStroke('#3559a5', Math.max(2, Math.round(7 * worldPerPixel)));

        if (compactHeader) {
            const compactTitleButtonGap = Math.max(8 * worldPerPixel, panelHeight * 0.008);
            actionY = this.titleText.y + this.titleText.height / 2 + compactTitleButtonGap + actionBtnHeight / 2;
            const compactHeaderBottomPadding = Math.max(8 * worldPerPixel, panelHeight * 0.008);
            headerHeight = Math.max(headerHeight, actionY + actionBtnHeight / 2 + compactHeaderBottomPadding - panelY);
        }

        this.layoutButton(this.createBtn, createX, actionY, actionBtnWidth, actionBtnHeight);
        this.layoutButton(this.backBtn, backX, actionY, actionBtnWidth, actionBtnHeight);

        this.listX = panelX + 20 * worldPerPixel;
        this.listY = panelY + headerHeight + 10 * worldPerPixel;
        this.listWidth = panelWidth - 40 * worldPerPixel;
        this.listHeight = Math.max(140 * worldPerPixel, panelHeight - headerHeight - 24 * worldPerPixel);

        this.listViewportBg.clear();
        this.listViewportBg.fillStyle(PANEL_BG.fillColor, PANEL_BG.fillAlpha);
        this.listViewportBg.fillRoundedRect(this.listX, this.listY, this.listWidth, this.listHeight, 8);

        this.listMaskShape.clear();
        this.listMaskShape.fillStyle(0xffffff, 1);
        this.listMaskShape.fillRect(viewX + this.listX, viewY + this.listY, this.listWidth, this.listHeight);

        this.listHitArea.setPosition(this.listX, this.listY);
        this.listHitArea.setSize(this.listWidth, this.listHeight);

        this.emptyText.setFontSize(Math.round(Math.max(14 * worldPerPixel, this.listHeight * 0.06)));
        this.emptyText.setWordWrapWidth(Math.max(24 * worldPerPixel, this.listWidth - 24 * worldPerPixel), true);
        this.emptyText.setPosition(this.listX + this.listWidth / 2, this.listY + this.listHeight / 2);

        this.layoutRoomRows();
        this.applyScroll(this.scrollOffset);
    }

    private layoutButton(button: UiButton, x: number, y: number, width: number, height: number): void {
        button.bg.setPosition(x, y);
        button.bg.setDisplaySize(width, height);
        button.hitArea.setPosition(x, y);
        button.hitArea.setSize(width, height);
        button.label.setPosition(x, y + (button.state === 'pressed' ? 2 : 0));
        const preferredSize = Math.round(Math.max(14, height * 0.34));
        const minSize = Math.round(Math.max(10, height * 0.24));
        const maxLabelWidth = Math.max(24, width - 16);
        button.label.setWordWrapWidth(maxLabelWidth, true);
        this.applyFittedFontSize(button.label, preferredSize, minSize, maxLabelWidth);
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

    private fitTextToWidth(text: Phaser.GameObjects.Text, source: string, maxWidth: number): string {
        if (maxWidth <= 0) return '';

        text.setText(source);
        if (text.width <= maxWidth) return source;

        const ellipsis = '...';
        let low = 0;
        let high = source.length;
        let best = ellipsis;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const candidate = `${source.slice(0, mid).trimEnd()}${ellipsis}`;
            text.setText(candidate);
            if (text.width <= maxWidth) {
                best = candidate;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        return best;
    }

    private unbindSocketEvents(): void {
        if (!this.socket) return;
        const { events } = this.lobbyConfig;
        if (this.onSocketConnect) this.socket.off('connect', this.onSocketConnect);
        if (this.onRoomList) this.socket.off(events.roomList, this.onRoomList);
        if (this.onRoomJoined) this.socket.off(events.roomJoined, this.onRoomJoined);
        if (this.onRoomError) this.socket.off(events.roomError, this.onRoomError);
        if (this.onSocketDisconnect) this.socket.off('disconnect', this.onSocketDisconnect);
        this.onSocketConnect = null;
        this.onRoomList = null;
        this.onRoomJoined = null;
        this.onRoomError = null;
        this.onSocketDisconnect = null;
    }

    private destroyPhaserUI(): void {
        this.roomRows.forEach((row) => {
            row.joinBtn.bg.destroy();
            row.joinBtn.label.destroy();
            row.joinBtn.hitArea.destroy();
            row.bg.destroy();
            row.name.destroy();
            row.players.destroy();
            row.root.destroy();
        });
        this.roomRows = [];

        if (this.createBtn) {
            this.createBtn.bg.destroy();
            this.createBtn.label.destroy();
            this.createBtn.hitArea.destroy();
            this.createBtn = null;
        }
        if (this.backBtn) {
            this.backBtn.bg.destroy();
            this.backBtn.label.destroy();
            this.backBtn.hitArea.destroy();
            this.backBtn = null;
        }

        if (this.emptyText) this.emptyText.destroy();
        if (this.listViewportBg) this.listViewportBg.destroy();
        if (this.listMaskShape) this.listMaskShape.destroy();
        if (this.listContainer) this.listContainer.destroy();
        if (this.listHitArea) this.listHitArea.destroy();
        if (this.titleText) this.titleText.destroy();
        if (this.panelBg) this.panelBg.destroy();
        if (this.panelInner) this.panelInner.destroy();
        if (this.panelBorder) this.panelBorder.destroy();
        if (this.root) this.root.destroy();

        this.emptyText = null;
        this.listViewportBg = null;
        this.listMaskShape = null;
        this.listContainer = null;
        this.listHitArea = null;
        this.titleText = null;
        this.panelBg = null;
        this.panelInner = null;
        this.panelBorder = null;
        this.root = null;
    }

    update(_time: number, delta: number): void {
        this.updateBackgroundAnimation(delta);
    }

    shutdown() {
        this.unbindSocketEvents();
        if (this.onWheel) {
            this.input.off('wheel', this.onWheel);
            this.onWheel = null;
        }
        this.destroyPhaserUI();
        this.scale.off('resize', this.resize, this);
    }

    resize(gameSize, baseSize?, displaySize?, resolution?) {
        super.resize(gameSize, baseSize, displaySize, resolution);
        this.layoutUI();
    }
}

export class LobbyScene extends BaseLobbyScene {
    constructor() {
        super(MULTI_CONFIG);
    }
}

export class NMultiLobbyScene extends BaseLobbyScene {
    constructor() {
        super(NMULTI_CONFIG);
    }
}
