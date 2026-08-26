// 1. Importación de las Escenas del juego
import BootScene from './scenes/boot.js';
import HotelScene from './scenes/HotelScene.js';

// 2. Objeto de Configuración Principal de Phaser
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    pixelArt: true, // Mantiene nítidos los gráficos Pixel Art
    
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: true
        }
    },

    scene: [BootScene, HotelScene]
};

// 3. Inicialización de la instancia del juego
const game = new Phaser.Game(config);

export default game;