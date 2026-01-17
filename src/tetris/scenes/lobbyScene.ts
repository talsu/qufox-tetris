
import { io, Socket } from "socket.io-client";

export class LobbyScene extends Phaser.Scene {
    private socket: Socket;
    private roomContainer: Phaser.GameObjects.Container;
    private roomList: any[] = [];
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private enterKey: Phaser.Input.Keyboard.Key;
    private navItems: Phaser.GameObjects.Text[] = [];
    private selectedNavIndex: number = 0;
    private createBtn: Phaser.GameObjects.Text;
    private backBtn: Phaser.GameObjects.Text;
    
    // Logical base resolution
    private readonly GAME_WIDTH = 1920;
    private readonly GAME_HEIGHT = 1080;

    constructor() {
        super({ key: "LobbyScene" });
    }

    create(): void {
        // Register resize handler
        this.scale.on('resize', this.resize, this);
        this.events.on('shutdown', this.shutdown, this);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

        // Background
        this.add.rectangle(this.GAME_WIDTH/2, this.GAME_HEIGHT/2, this.GAME_WIDTH, this.GAME_HEIGHT, 0x111111);

        this.add.text(100, 50, "MULTIPLAYER LOBBY", { fontSize: "40px", color: "#ffffff" });

        // Create Room Button
        this.createBtn = this.add.text(100, 120, "CREATE ROOM", {
            fontSize: "30px",
            color: "#ffffff",
            backgroundColor: "#00aa00",
            padding: { x: 10, y: 5 }
        }).setInteractive();

        this.createBtn.on('pointerdown', () => {
            const roomName = prompt("Enter room name:", "My Room");
            if (roomName) {
                this.socket.emit('create_room', roomName);
            }
        });
        
        this.backBtn = this.add.text(100, 200, "BACK", {
             fontSize: "30px",
            color: "#ffffff",
            backgroundColor: "#aa0000",
            padding: { x: 10, y: 5 }
        }).setInteractive();
        
        this.backBtn.on('pointerdown', () => {
             if (this.socket) this.socket.disconnect();
             this.scene.start("MenuScene");
        });

        // Hover effects for static buttons to support mouse
        this.createBtn.on('pointerover', () => {
            this.selectedNavIndex = this.navItems.indexOf(this.createBtn);
            this.updateNavAppearance();
        });
        this.backBtn.on('pointerover', () => {
            this.selectedNavIndex = this.navItems.indexOf(this.backBtn);
            this.updateNavAppearance();
        });

        this.roomContainer = this.add.container(400, 120);

        // Connect to socket
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const socketUrl = isLocal ? 'http://localhost:3031' : window.location.origin;
        this.socket = io(socketUrl, { path: '/server' });

        this.socket.on('connect', () => {
            console.log('Connected to server');
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

        // Initial build of nav items
        this.refreshRoomList();

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
        if (this.navItems.length === 0) return;

        let newIndex = this.selectedNavIndex + change;
        if (newIndex < 0) newIndex = this.navItems.length - 1;
        if (newIndex >= this.navItems.length) newIndex = 0;
        
        this.selectedNavIndex = newIndex;
        this.updateNavAppearance();
    }

    triggerSelection() {
        if (this.navItems.length > 0) {
             const btn = this.navItems[this.selectedNavIndex];
             btn.emit('pointerdown');
        }
    }

    updateNavAppearance() {
        this.navItems.forEach((btn, index) => {
            if (index === this.selectedNavIndex) {
                btn.setStroke('#ffff00', 6);
            } else {
                btn.setStroke('#000000', 0);
            }
        });
    }

    refreshRoomList() {
        this.roomContainer.removeAll(true);
        
        // Reset nav items to static buttons first
        this.navItems = [this.createBtn, this.backBtn];

        let y = 0;
        this.roomList.forEach((room, index) => {
            const bg = this.add.rectangle(0, y, 600, 50, 0x333333).setOrigin(0);
            const text = this.add.text(10, y + 10, `${room.name} (${room.players}/2)`, { fontSize: '24px', color: '#ffffff' });
            
            const joinBtn = this.add.text(500, y + 10, "JOIN", { fontSize: '24px', color: '#00ffff' }).setInteractive();
            
            joinBtn.on('pointerdown', () => {
                this.socket.emit('join_room', room.id);
            });
            
            joinBtn.on('pointerover', () => {
                // Find current index of this join button
                const idx = this.navItems.indexOf(joinBtn);
                if (idx !== -1) {
                    this.selectedNavIndex = idx;
                    this.updateNavAppearance();
                }
            });

            this.roomContainer.add([bg, text, joinBtn]);
            this.navItems.push(joinBtn);
            y += 60;
        });

        // Ensure selection index is valid
        if (this.selectedNavIndex >= this.navItems.length) {
            this.selectedNavIndex = 0;
        }
        this.updateNavAppearance();
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
