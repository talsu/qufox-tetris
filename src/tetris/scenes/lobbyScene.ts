import { io, Socket } from "socket.io-client";
import { BaseScene } from "./baseScene";
import { getSocketUrl, SOCKET_PATH } from "../net/socketUtils";

// ─── Lobby Configuration ────────────────────────────────────────────
// Each lobby mode defines its socket events, display text, and target scene.

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

const MULTI_CONFIG: LobbyConfig = {
    sceneKey: 'LobbyScene',
    title: 'LOBBY',
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
    }),
};

const NMULTI_CONFIG: LobbyConfig = {
    sceneKey: 'NMultiLobbyScene',
    title: 'N-MULTI',
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

// ─── Base Lobby Scene ───────────────────────────────────────────────

class BaseLobbyScene extends BaseScene {
    private socket: Socket;
    private lobbyDOM: Phaser.GameObjects.DOMElement;
    private roomList: any[] = [];
    private isConnected: boolean = false;
    protected lobbyConfig: LobbyConfig;

    constructor(config: LobbyConfig) {
        super({ key: config.sceneKey });
        this.lobbyConfig = config;
    }

    init() {
        this.handleResolution();
        this.GAME_WIDTH = 500;
        this.GAME_HEIGHT = 1000;
    }

    preload(): void { }

    create(): void {
        this.scale.on('resize', this.resize, this);
        this.createBackground();
        this.createDOMUI();

        if (!this.socket || !this.socket.connected) {
            this.socket = io(getSocketUrl(), { path: SOCKET_PATH });
            this.setupSocketEvents();
        } else {
            this.socket.emit(this.lobbyConfig.events.getRooms);
        }

        this.resize(window.innerWidth, window.innerHeight);
    }

    private setupSocketEvents() {
        const { events } = this.lobbyConfig;

        this.socket.on('connect', () => {
            this.isConnected = true;
            this.socket.emit(events.getRooms);
        });

        this.socket.on(events.roomList, (rooms: any[]) => {
            this.roomList = rooms;
            this.refreshRoomList();
        });

        this.socket.on(events.roomJoined, (data: any) => {
            if (data.roomName) {
                history.replaceState(null, '', this.lobbyConfig.urlPrefix + '/' + encodeURIComponent(data.roomName));
            }
            this.scene.start(this.lobbyConfig.playScene, this.lobbyConfig.buildSceneData(this.socket, data));
        });

        this.socket.on(events.roomError, (msg: string) => {
            alert(msg);
        });

        this.socket.on('disconnect', () => {
            this.isConnected = false;
        });
    }

    private createDOMUI() {
        const { title, events } = this.lobbyConfig;

        const html = `
        <div class="menu-container">
            <div class="lobby-container">
                <div class="lobby-header">
                    <div class="lobby-title">${title}</div>
                    <div>
                        <button class="puyo-btn green" style="font-size: 20px; padding: 10px 20px; min-width: auto;" id="createBtn">Create Room</button>
                        <button class="puyo-btn red" style="font-size: 20px; padding: 10px 20px; min-width: auto;" id="backBtn">Back</button>
                    </div>
                </div>
                <div class="room-list" id="roomListContainer">
                    <div style="text-align: center; color: #888; margin-top: 50px;">Loading rooms...</div>
                </div>
            </div>
        </div>
        `;

        this.lobbyDOM = this.add.dom(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2).createFromHTML(html);
        this.lobbyDOM.setPerspective(800);

        const createBtn = this.lobbyDOM.getChildByID('createBtn') as HTMLElement;
        const backBtn = this.lobbyDOM.getChildByID('backBtn') as HTMLElement;

        if (createBtn) {
            createBtn.addEventListener('click', () => {
                const roomName = prompt('Enter room name:', 'My Room');
                if (roomName && this.socket) {
                    const payload = this.lobbyConfig.maxPlayers > 2 ? { roomName } : roomName;
                    this.socket.emit(events.createRoom, payload);
                }
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (this.socket) {
                    this.socket.disconnect();
                }
                this.scene.start('MenuScene');
            });
        }
    }

    private refreshRoomList() {
        if (!this.lobbyDOM) return;

        const container = this.lobbyDOM.getChildByID('roomListContainer') as HTMLElement;
        if (!container) return;

        if (this.roomList.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #888; margin-top: 50px;">No rooms found. Create one!</div>';
            return;
        }

        const maxPlayers = this.lobbyConfig.maxPlayers;
        container.innerHTML = '';

        this.roomList.forEach((room) => {
            const playerCount = room.playerCount ?? room.players ?? 0;

            const item = document.createElement('div');
            item.className = 'room-item';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'room-name';
            nameDiv.textContent = room.name;

            const rightDiv = document.createElement('div');
            rightDiv.style.cssText = 'display: flex; align-items: center;';

            const playersDiv = document.createElement('div');
            playersDiv.className = 'room-players';
            playersDiv.textContent = `${playerCount}/${maxPlayers}`;

            const joinBtn = document.createElement('button');
            joinBtn.className = 'join-btn';
            joinBtn.textContent = 'JOIN';
            joinBtn.addEventListener('click', () => {
                if (this.socket) {
                    const payload = this.lobbyConfig.maxPlayers > 2 ? { roomId: room.id } : room.id;
                    this.socket.emit(this.lobbyConfig.events.joinRoom, payload);
                }
            });

            rightDiv.append(playersDiv, joinBtn);
            item.append(nameDiv, rightDiv);
            container.appendChild(item);
        });
    }

    update(time: number, delta: number): void { }

    shutdown() {
        if (this.lobbyDOM) {
            this.lobbyDOM.destroy();
        }
        this.scale.off('resize', this.resize, this);
    }

    resize(gameSize, baseSize?, displaySize?, resolution?) {
        super.resize(gameSize, baseSize, displaySize, resolution);
        if (this.lobbyDOM && this.cameras && this.cameras.main) {
            this.lobbyDOM.setScale(this.cameras.main.zoom);
        }
    }
}

// ─── Exported Scene Variants ────────────────────────────────────────

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
