import Phaser from 'phaser';

export class Boot extends Phaser.Scene {
    constructor() {
        super({ key: 'Boot' });
    }

    preload() {
        // Muestra un texto básico o barra de carga mientras se obtienen los assets
        const loadingText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'Cargando recursos...',
            { font: '20px Arial', fill: '#ffffff' }
        );
        loadingText.setOrigin(0.5, 0.5);

        // Aquí agregas la carga de assets iniciales de tu proyecto
        // Ejemplo:
        // this.load.image('logo', 'assets/logo.png');
    }

    create() {
        // Transición a la siguiente escena una vez finalizada la precarga
        // (Reemplaza 'MainMenu' o la escena que corresponda según su flujo)
        console.log('Escena Boot completada');
        // this.scene.start('MainMenu');
    }
}