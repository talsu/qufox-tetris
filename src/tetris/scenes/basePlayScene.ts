import { BaseScene } from './baseScene';
import { PlayField } from '../objects/playField';
import { Engine } from '../engine';
import { InputManager } from '../input/inputManager';
import { InGameMenu, MenuCallbacks } from '../ui/inGameMenu';
import { GameOverlayControls } from '../ui/gameOverlayControls';
import { BotManager } from '../logic/botManager';
import { CONST, InputState } from '../const/const';
import { GAME_FONT_FAMILY } from '../ui/uiStyles';
import { Socket } from 'socket.io-client';

/**
 * Shared base for play scenes (PlayScene, NMultiPlayScene).
 * Owns common field declarations, UI setup, end-game flow,
 * input routing, and the core update loop.
 */
export abstract class BasePlayScene extends BaseScene {
    protected playField: PlayField;
    protected engine: Engine;
    protected inputManager: InputManager;
    protected inGameMenu: InGameMenu;

    protected isPause: boolean = false;
    protected socket: Socket;
    protected roomId: string;
    protected roomName: string;
    protected statusText: Phaser.GameObjects.Text;
    protected lastUpdateSend: number = 0;
    protected isGameRunning: boolean = false;
    protected isGameEnded: boolean = false;
    protected botLevel: number = 0;
    protected botManager: BotManager;
    protected overlayControls: GameOverlayControls | null = null;

    protected createBaseUI(callbacks: MenuCallbacks): void {
        this.createBackground();

        this.input.keyboard.on('keydown-ESC', () => {
            if (!this.isGameEnded) this.toggleMenu();
        });

        this.scale.on('resize', this.resize, this);
        this.resize(window.innerWidth, window.innerHeight);

        this.statusText = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, '', {
            fontFamily: GAME_FONT_FAMILY,
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        this.inputManager = new InputManager(this, (direction, state) => this.onInput(direction, state));
        this.inGameMenu = new InGameMenu(this, callbacks);

        this.overlayControls = new GameOverlayControls({
            scene: this,
            onMenuClick: () => this.toggleMenu(),
            isMobilePortrait: this.layoutMode === 'mobile-portrait',
        });
    }

    protected toggleMenu(): void {
        this.inGameMenu.togglePauseMenu();
    }

    protected toggleBackground(btn: HTMLElement): void {
        const isVisible = this.backgroundGraphics.visible;
        this.backgroundGraphics.setVisible(!isVisible);
        btn.innerText = `Background: ${!isVisible ? 'ON' : 'OFF'}`;
    }

    protected showEndGameMessage(mainText: string, color: string, score?: number): void {
        this.isGameRunning = false;
        this.isGameEnded = true;
        this.inputManager.isEnabled = false;
        if (this.botManager) this.botManager.stop();
        if (this.playField) this.playField.stop();
        this.inGameMenu.showEndGame(mainText, color, score);
    }

    protected onInput(direction: string, state: InputState): void {
        if (this.engine) this.engine.onInput(direction, state);
    }

    protected shutdownBase(): void {
        this.scale.off('resize', this.resize, this);
        if (this.botManager) this.botManager.stop();
        if (this.inGameMenu) this.inGameMenu.destroy();
        if (this.overlayControls) {
            this.overlayControls.destroy();
            this.overlayControls = null;
        }
    }

    resize(gameSize, baseSize?, displaySize?, resolution?) {
        super.resize(gameSize, baseSize, displaySize, resolution);
        if (this.overlayControls) this.overlayControls.layout();
    }

    update(time: number, delta: number): void {
        if (this.inGameMenu.isMenuOpen || this.isGameEnded) return;
        if (!this.isGameRunning || this.isPause) return;

        if (this.engine) this.engine.update(time, delta);
        if (this.botManager) this.botManager.update(time, delta);

        const softDropSpeed = this.playField
            ? this.playField.autoDropDelay / 20
            : CONST.PLAY_FIELD.AR_MS;
        this.inputManager.updateCustom(time, delta, softDropSpeed, softDropSpeed);

        this.networkUpdate(time);
    }

    protected networkUpdate(_time: number): void {}

    protected abstract exitGame(): void;
    protected abstract restartGame(): void;
    protected abstract startGame(): void;
}
