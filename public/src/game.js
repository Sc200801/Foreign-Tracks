// 1. Importar las escenas que acabamos de ajustar
import BootScene from './scenes/boot.js';
import HotelScene from './scenes/HotelScene.js';

// 2. Configuración general del motor Phaser
const config = {
    type: Phaser.AUTO, // Detecta automáticamente si usa WebGL o Canvas
    width: 800,
    height: 600,
    parent: 'game-container', // ID del div donde se renderizará el canvas (opcional)
    pixelArt: true, // Evita que los sprites pixel-art se vean borrosos al escalar
    physics: {
        default: 'arcade', // Sistema de física liviano ideal para top-down 2D
        arcade: {
            gravity: { y: 0 }, // Juego en vista superior (top-down), sin gravedad vertical
            debug: true // Cambia a 'false' para quitar los cuadros verdes de colisión cuando termines las pruebas
        }
    },
    // Es vital que BootScene sea la primera en el arreglo para que precargue todo
    scene: [BootScene, HotelScene]
};

// 3. Inicializar el juego
const game = new Phaser.Game(config);

export default game;