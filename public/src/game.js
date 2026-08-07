import Phaser from 'phaser';
import { Boot } from './scenes/Boot.js';

// Configuración general del lienzo (Canvas) e integración de escenas
const config = {
    type: Phaser.AUTO, // Selecciona WebGL o Canvas según disponibilidad
    width: 1024,
    height: 768,
    parent: 'game-container', // ID del contenedor HTML donde se renderiza el lienzo
    backgroundColor: '#1d1d1d',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [Boot] // Lista de escenas registradas en el juego
};

// Inicialización de la instancia principal de Phaser
const game = new Phaser.Game(config);

export default game;