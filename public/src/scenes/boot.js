export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        console.log('🔄 BootScene: Precargando mapa, tileset y sprites...');

        // 1. Cargar el mapa Tiled JSON y la imagen del tileset
        this.load.tilemapTiledJSON('hotel_map', 'assets/maps/hotel.json'); //[cite: 1]
        this.load.image('hotel_tiles', 'assets/maps/tileset.png'); //[cite: 1]

        // 2. Cargar el spritesheet del personaje[cite: 1]
        // Nota: Si tus sprites son de 32x32 cambia frameHeight a 32
        this.load.spritesheet('player', 'assets/images/player.png', { //[cite: 1]
            frameWidth: 32, //[cite: 1]
            frameHeight: 48 //[cite: 1]
        });
    }

    create() {
        console.log('✅ BootScene: Recursos cargados con éxito. Iniciando HotelScene...');
        // Transición directa hacia la escena del Hotel[cite: 1]
        this.scene.start('HotelScene'); //[cite: 1]
    }
}