// 1. Importación de las Escenas del juego
import BootScene from './scenes/Boot.js';
import HotelScene from './scenes/HotelScene.js';

// 2. Objeto de Configuración Principal de Phaser
const config = {
    // Renderizado: AUTO elige WebGL si el navegador lo soporta, o Canvas como respaldo.
    type: Phaser.AUTO,

    // Dimensiones del lienzo de prueba/juego (Ancho x Alto en píxeles)
    width: 800,
    height: 600,

    // ID del elemento HTML donde se incrustará el <canvas> generado por Phaser
    parent: 'game-container',
    

    // Configuración de escala y centrado responsivo
    scale: {
        mode: Phaser.Scale.FIT,               // Ajusta el lienzo manteniendo la proporción 800x600
        autoCenter: Phaser.Scale.CENTER_BOTH  // Centra automáticamente el lienzo en el contenedor
    },

    // Configuración del Motor de Física (Arcade Physics)
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 }, // Vista superior (Top-Down): 0 gravedad en X e Y
            debug: true              // Muestra líneas de colisión de color verde (Ponlo en false en producción)
        }
    },

    // Lista de Escenas activas en el juego (El orden define cuál se ejecuta primero)
    // BootScene va primero para precargar los assets antes de iniciar HotelScene
    scene: [BootScene, HotelScene]
};

// 3. Inicialización de la instancia del juego con la configuración dada
const game = new Phaser.Game(config);

export default game;