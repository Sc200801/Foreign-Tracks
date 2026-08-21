export default class HotelScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HotelScene' });
    }

    create() {
        console.log('🏨 HotelScene: Construyendo el escenario 2D...');

        // 1. Crear el mapa desde el JSON precargado
        const map = this.make.tilemap({ key: 'hotel_map' }); //[cite: 2]

        // IMPORTANTE: El primer parámetro ('tileset') debe coincidir exactamente 
        // con el nombre del Tileset definido dentro de Tiled.
        const tileset = map.addTilesetImage('tileset', 'hotel_tiles'); //[cite: 2]

        // 2. Crear las capas del escenario[cite: 2]
        // Asegúrate de que 'Ground' y 'Walls' coincidan con los nombres de tus capas en Tiled
        const groundLayer = map.createLayer('Ground', tileset, 0, 0); //[cite: 2]
        const wallsLayer = map.createLayer('Walls', tileset, 0, 0); //[cite: 2]

        // 3. Activar colisiones en la capa de paredes[cite: 2]
        wallsLayer.setCollisionByProperty({ collides: true }); //[cite: 2]

        // 4. Instanciar el jugador y agregar física[cite: 2]
        this.player = this.physics.add.sprite(100, 100, 'player'); //[cite: 2]
        this.player.setCollideWorldBounds(true); // Evita que se salga del escenario

        // 5. Configurar colisión entre el personaje y las paredes[cite: 2]
        this.physics.add.collider(this.player, wallsLayer); //[cite: 2]

        // 6. Hacer que la cámara principal siga al jugador
        this.cameras.main.startFollow(this.player);

        console.log('✅ HotelScene: Escenario cargado y colisiones activadas.');
    }
}