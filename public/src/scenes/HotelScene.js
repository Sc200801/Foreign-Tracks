export default class HotelScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HotelScene' });
    }

    create() {
        console.log('🏨 HotelScene: Construyendo el escenario 2D...');

        // Guardar referencia de la escena activa para el chat
        window.currentScene = this;

        // 🟢 Usar la función global expuesta desde chat.js
        if (typeof window.mostrarChatUI === 'function') {
            window.mostrarChatUI();
        } else {
            // Respaldar remoción manual en caso de que chat.js no haya cargado
            const chatToggleBtn = document.getElementById('chat-toggle-btn');
            if (chatToggleBtn) chatToggleBtn.classList.remove('oculto');
        }

        // 1. Crear el mapa desde el JSON precargado
        const map = this.make.tilemap({ key: 'hotel_map' });

        // IMPORTANTE: El primer parámetro ('tileset') debe coincidir exactamente 
        // con el nombre del Tileset definido dentro de Tiled.
        const tileset = map.addTilesetImage('tileset', 'hotel_tiles');

        // 2. Crear las capas del escenario
        const groundLayer = map.createLayer('Ground', tileset, 0, 0);
        const wallsLayer = map.createLayer('Walls', tileset, 0, 0);

        // 3. Activar colisiones en la capa de paredes
        wallsLayer.setCollisionByProperty({ collides: true });

        // 4. Instanciar el jugador y agregar física
        this.player = this.physics.add.sprite(100, 100, 'player');
        this.player.setCollideWorldBounds(true); // Evita que se salga del escenario

        // 5. Configurar colisión entre el personaje y las paredes
        this.physics.add.collider(this.player, wallsLayer);

        // 6. Hacer que la cámara principal siga al jugador
        this.cameras.main.startFollow(this.player);

        // 7. Ocultar la burbuja automáticamente si el jugador sale de la escena al menú
        this.events.once('shutdown', () => {
            const chatToggleBtn = document.getElementById('chat-toggle-btn');
            const chatModal = document.getElementById('chat-modal');
            if (chatToggleBtn) chatToggleBtn.classList.add('oculto');
            if (chatModal) chatModal.classList.add('oculto');
        });

        console.log('✅ HotelScene: Escenario cargado y colisiones activadas.');
    }
}