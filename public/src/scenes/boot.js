import * as Phaser from 'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.esm.js';

export default class Boot extends Phaser.Scene {
    constructor() {
        super('Boot'); // Asegúrate de que esta sea la primera escena que inicia tu juego
    }

    preload() {
        // 1. Cargar la imagen del tileset
        this.load.image('hotel_tileset_image', 'src/assets/tiles/hotel_tileset.png');

        // 2. Cargar el JSON del mapa con la clave exacta 'hotelMap'
        this.load.tilemapTiledJSON('hotelMap', 'src/assets/maps/hotel.json');
    }

    create() {
        console.log('✅ Archivos cargados en caché. Entrando a HotelScene...');
        this.scene.start('HotelScene');
    }
}