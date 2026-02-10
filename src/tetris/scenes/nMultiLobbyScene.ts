import { io, Socket } from "socket.io-client";
import { BaseScene } from "./baseScene";

export class NMultiLobbyScene extends BaseScene {
    private socket: Socket;
    private lobbyDOM: Phaser.GameObjects.DOMElement;
    private roomList: any[] = [];
    private isConnected: boolean = false;

    constructor() {
        super({ key: "NMultiLobbyScene" });
    }

    init() {
        this.handleResolution();

        this.GAME_WIDTH = 500;
        this.GAME_HEIGHT = 1000;
    }

    preload(): void {
    }

    create(): void {
        this.scale.on('resize', this.resize, this);
        this.createBackground();
        this.createDOMUI();

        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const socketUrl = isLocal ? 'http://localhost:3031' : window.location.origin;

        if (!this.socket || !this.socket.connected) {
            this.socket = io(socketUrl, { path: '/server' });
            this.setupSocketEvents();
        } else {
            this.socket.emit('nmulti_get_rooms');
        }

        this.resize(window.innerWidth, window.innerHeight);
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.socket.emit('nmulti_get_rooms');
        });

        this.socket.on('nmulti_room_list', (rooms: any[]) => {
            this.roomList = rooms;
            this.refreshRoomList();
        });

        this.socket.on('nmulti_room_joined', (data: any) => {
            this.scene.start("NMultiPlayScene", {
                socket: this.socket,
                roomId: data.roomId,
                playerId: data.playerId,
                playerName: data.playerName,
                initialPlayers: data.players
            });
        });

        this.socket.on('nmulti_room_error', (msg: string) => {
            alert(msg);
        });

        this.socket.on('disconnect', () => {
            this.isConnected = false;
        });
    }

    createDOMUI() {
        const html = `
        <div class="menu-container">
            <div class="lobby-container">
                <div class="lobby-header">
                    <div class="lobby-title">N-MULTI</div>
                    <div>
                        <button class="puyo-btn green" style="font-size: 20px; padding: 10px 20px; min-width: auto;" id="nmCreateBtn">Create Room</button>
                        <button class="puyo-btn red" style="font-size: 20px; padding: 10px 20px; min-width: auto;" id="nmBackBtn">Back</button>
                    </div>
                </div>
                <div class="room-list" id="nmRoomListContainer">
                    <div style="text-align: center; color: #888; margin-top: 50px;">Loading rooms...</div>
                </div>
            </div>
        </div>
        `;

        this.lobbyDOM = this.add.dom(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2).createFromHTML(html);
        this.lobbyDOM.setPerspective(800);

        const createBtn = this.lobbyDOM.getChildByID('nmCreateBtn') as HTMLElement;
        const backBtn = this.lobbyDOM.getChildByID('nmBackBtn') as HTMLElement;

        if (createBtn) {
            createBtn.addEventListener('click', () => {
                const roomName = prompt("Enter room name:", "My Room");
                if (roomName && this.socket) {
                    this.socket.emit('nmulti_create_room', { roomName });
                }
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (this.socket) {
                    this.socket.disconnect();
                }
                this.scene.start("MenuScene");
            });
        }
    }

    refreshRoomList() {
        if (!this.lobbyDOM) return;

        const container = this.lobbyDOM.getChildByID('nmRoomListContainer') as HTMLElement;
        if (!container) return;

        if (this.roomList.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #888; margin-top: 50px;">No rooms found. Create one!</div>';
            return;
        }

        let listHtml = '';
        this.roomList.forEach((room) => {
            listHtml += `
            <div class="room-item">
                <div class="room-name">${room.name}</div>
                <div style="display: flex; align-items: center;">
                    <div class="room-players">${room.playerCount}/100</div>
                    <button class="join-btn" data-room-id="${room.id}">JOIN</button>
                </div>
            </div>
            `;
        });

        container.innerHTML = listHtml;

        const joinBtns = container.querySelectorAll('.join-btn');
        joinBtns.forEach((btn: HTMLElement) => {
            btn.addEventListener('click', (e) => {
                const roomId = (e.target as HTMLElement).getAttribute('data-room-id');
                if (roomId && this.socket) {
                    this.socket.emit('nmulti_join_room', { roomId });
                }
            });
        });
    }

    update(time: number, delta: number): void {
    }

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
