// Ruta: src/scenes/Boot.js

export default class BootScene extends Phaser.Scene {
    constructor() {
        // Asigna el identificador con el que Phaser reconocerá esta escena
        super('BootScene'); 
    }

    preload() {
        console.log('🔄 BootScene: Precargando recursos multimedia...');

        // Aquí vas a precargar las imágenes guardadas en src/assets/
        // Ejemplo cuando tengan las imágenes lista:
        // this.load.image('fondo_hotel', 'src/assets/hotel.png');
        // this.load.image('jugador', 'src/assets/player.png');
    }

    create() {
        console.log('✅ BootScene: Carga completa. Iniciando HotelScene...');
        
        // Transición automática hacia la escena deseada
        this.scene.start('HotelScene'); 
    }
}