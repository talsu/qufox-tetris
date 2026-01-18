
import { io, Socket } from "socket.io-client";
import { BaseScene } from "./baseScene";


export class LobbyScene extends BaseScene {
    private socket: Socket;
    private lobbyDOM: Phaser.GameObjects.DOMElement;
    private roomList: any[] = [];
    private isConnected: boolean = false;


    constructor() {
        super({ key: "LobbyScene" });
    }

    init() {
        this.handleResolution();

        this.GAME_WIDTH = 500;
        this.GAME_HEIGHT = 1000;
    }

    preload(): void {
    }

    create(): void {
        // Register resize handler
        this.scale.on('resize', this.resize, this);
        this.createBackground();

        // Create DOM UI
        this.createDOMUI();

        // Connect to socket
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const socketUrl = isLocal ? 'http://localhost:3031' : window.location.origin;

        if (!this.socket || !this.socket.connected) {
            this.socket = io(socketUrl, { path: '/server' });
            this.setupSocketEvents();
        } else {
            // Already connected (returning from game)
            this.socket.emit('get_rooms');
        }

        // Initial resize
        this.resize(window.innerWidth, window.innerHeight);
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.isConnected = true;
            this.socket.emit('get_rooms');
        });

        this.socket.on('room_list', (rooms: any[]) => {
            this.roomList = rooms;
            this.refreshRoomList();
        });

        this.socket.on('room_joined', (data: any) => {
            this.scene.start("PlayScene", { mode: 'multi', socket: this.socket, roomId: data.roomId, isHost: data.isHost });
        });

        this.socket.on('room_error', (msg: string) => {
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
                    <div class="lobby-title">LOBBY</div>
                    <div>
                        <button class="puyo-btn green" style="font-size: 20px; padding: 10px 20px; min-width: auto;" id="createBtn">Create Room</button>
                        <button class="puyo-btn red" style="font-size: 20px; padding: 10px 20px; min-width: auto;" id="backBtn">Back</button>
                    </div>
                </div>
                <div class="room-list" id="roomListContainer">
                    <!-- Room items will be injected here -->
                    <div style="text-align: center; color: #888; margin-top: 50px;">Loading rooms...</div>
                </div>
            </div>
        </div>
        `;

        this.lobbyDOM = this.add.dom(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2).createFromHTML(html);
        this.lobbyDOM.setPerspective(800);

        // Bind static buttons
        const createBtn = this.lobbyDOM.getChildByID('createBtn') as HTMLElement;
        const backBtn = this.lobbyDOM.getChildByID('backBtn') as HTMLElement;

        if (createBtn) {
            createBtn.addEventListener('click', () => {
                const roomName = prompt("Enter room name:", "My Room");
                if (roomName && this.socket) {
                    this.socket.emit('create_room', roomName);
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

        const container = this.lobbyDOM.getChildByID('roomListContainer') as HTMLElement;
        if (!container) return;

        if (this.roomList.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #888; margin-top: 50px;">No rooms found. Create one!</div>';
            // Even if no rooms, update nav to just top buttons
            // Even if no rooms, update nav to just top buttons
            return;
        }

        let listHtml = '';
        this.roomList.forEach((room) => {
            listHtml += `
            <div class="room-item">
                <div class="room-name">${room.name}</div>
                <div style="display: flex; align-items: center;">
                    <div class="room-players">${room.players}/2</div>
                    <button class="join-btn" data-room-id="${room.id}">JOIN</button>
                </div>
            </div>
            `;
        });

        container.innerHTML = listHtml;

        // Re-bind join buttons
        const joinBtns = container.querySelectorAll('.join-btn');
        joinBtns.forEach((btn: HTMLElement) => {
            btn.addEventListener('click', (e) => {
                const roomId = (e.target as HTMLElement).getAttribute('data-room-id');
                if (roomId && this.socket) {
                    this.socket.emit('join_room', roomId);
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
        if (this.lobbyDOM) {
            this.lobbyDOM.setScale(this.cameras.main.zoom);
        }
    }
}

