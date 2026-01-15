/**
 * @author       talsu  <talsu84@gmail.com>
 * @copyright    2018 talsu.net
 * @license      MIT
 */

import "phaser";
import {PlayScene} from "./scenes/playScene";
import {MenuScene} from "./scenes/menuScene";
import {LobbyScene} from "./scenes/lobbyScene";
import {CONST, getBlockSize} from "./const/const";

// main game configuration
const config: Phaser.Types.Core.GameConfig = {
    width: '100%',
    height: '100%',
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: "game",
        autoCenter: Phaser.Scale.NO_CENTER
    },
    parent: "game",
    scene: [MenuScene, LobbyScene, PlayScene],
    physics: {
        default: "arcade",
        arcade: {
            gravity: {x: 0, y: 200}
        }
    }
};

// game class
export class Game extends Phaser.Game {
    constructor(config: Phaser.Types.Core.GameConfig) {
        super(config);
    }
}

// when the page is loaded, create our game instance
window.addEventListener('load', () => {
    new Game(config);
});
