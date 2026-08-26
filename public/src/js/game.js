import * as Phaser from 'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.esm.js';

class HotelScene extends Phaser.Scene {
    constructor() {
        super('HotelScene');

        this.player = null;
        this.cursors = null;
        this.wasd = null;
    }

    preload() {
        this.load.image(
            'hotel_tileset_image',
            'src/assets/tiles/hotel_tileset.png'
        );

        this.load.tilemapTiledJSON(
            'hotelMap',
            'src/assets/maps/hotel.json'
        );
    }

    create() {
        console.log(
            'Renderizando mapa del hotel...'
        );

        const map = this.make.tilemap({
            key: 'hotelMap'
        });

        const tileset = map.addTilesetImage(
            'hotel_tileset',
            'hotel_tileset_image'
        );

        if (!tileset) {
            console.error(
                'No se pudo cargar el tileset del hotel.'
            );
            return;
        }

        // Crear las capas por nombre
        // (map.layers solo contiene capas de tiles;
        // las capas de objetos viven aparte en map.objects)
        map.layers.forEach((layerData) => {
            const layer = map.createLayer(
                layerData.name,
                tileset,
                0,
                0
            );

            if (layer) {
                layer.setDepth(
                    layerData.name ===
                        'Walls'
                        ? 2
                        : 1
                );
            }
        });

        this.cameras.main.setBackgroundColor(
            '#fdf5e6'
        );

        // Área real con arte del piso (el mapa tiene margen
        // vacío alrededor del cuarto dibujado en el tileset).
        const floorBounds = this.getFloorBounds(
            map,
            'Ground'
        );

        // Límites del área caminable
        this.physics.world.setBounds(
            floorBounds.x + 16,
            floorBounds.y + 16,
            floorBounds.width - 32,
            floorBounds.height - 32
        );

        this.createPlayer(
            floorBounds.x + floorBounds.width / 2,
            floorBounds.y + floorBounds.height - 40
        );

        // Acercar la cámara al máximo posible sin deformar
        // la habitación (respeta la relación de aspecto).
        const zoom = Math.min(
            this.scale.width / floorBounds.width,
            this.scale.height / floorBounds.height
        );

        this.cameras.main.setZoom(zoom);

        // Los límites de cámara nunca deben ser más chicos
        // que lo que se ve en pantalla, o la vista se pega
        // a una esquina en vez de quedar centrada.
        const viewWidth = this.scale.width / zoom;
        const viewHeight = this.scale.height / zoom;

        const boundsWidth = Math.max(
            floorBounds.width,
            viewWidth
        );

        const boundsHeight = Math.max(
            floorBounds.height,
            viewHeight
        );

        const floorCenterX =
            floorBounds.x + floorBounds.width / 2;

        const floorCenterY =
            floorBounds.y + floorBounds.height / 2;

        this.cameras.main.setBounds(
            floorCenterX - boundsWidth / 2,
            floorCenterY - boundsHeight / 2,
            boundsWidth,
            boundsHeight
        );

        this.cameras.main.startFollow(
            this.player,
            true,
            0.08,
            0.08
        );

        this.scale.on(
            'resize',
            () => {
                if (this.player) {
                    this.cameras.main.centerOn(
                        this.player.x,
                        this.player.y
                    );
                }
            }
        );

        console.log(
            'Mapa del hotel cargado correctamente.'
        );
    }

    getFloorBounds(map, layerName) {
        const layer = map.getLayer(layerName);

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        layer.data.forEach((row) => {
            row.forEach((tile) => {
                if (tile.index > 0) {
                    minX = Math.min(minX, tile.pixelX);
                    minY = Math.min(minY, tile.pixelY);
                    maxX = Math.max(maxX, tile.pixelX + tile.width);
                    maxY = Math.max(maxY, tile.pixelY + tile.height);
                }
            });
        });

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    createPlayer(x, y) {
        const graphics = this.make.graphics({
            x: 0,
            y: 0,
            add: false
        });

        // Cuerpo del jugador
        graphics.fillStyle(
            0x4f8cff,
            1
        );

        graphics.fillRoundedRect(
            5,
            10,
            22,
            34,
            10
        );

        // Parte inferior
        graphics.fillStyle(
            0x2c5bc4,
            1
        );

        graphics.fillRoundedRect(
            7,
            38,
            18,
            8,
            4
        );

        // Visor
        graphics.fillStyle(
            0xdaf6ff,
            1
        );

        graphics.fillRoundedRect(
            12,
            15,
            15,
            10,
            5
        );

        // Borde
        graphics.lineStyle(
            2,
            0x172448,
            1
        );

        graphics.strokeRoundedRect(
            5,
            10,
            22,
            34,
            10
        );

        graphics.generateTexture(
            'hotel_player',
            32,
            52
        );

        graphics.destroy();

        this.player =
            this.physics.add.sprite(
                x,
                y,
                'hotel_player'
            );

        this.player.setDepth(20);
        this.player.setCollideWorldBounds(
            true
        );

        this.player.body
            .setSize(22, 35)
            .setOffset(5, 12);

        this.player.nameLabel =
            this.add.text(
                x,
                y - 38,
                'Tú',
                {
                    fontFamily: 'Arial',
                    fontSize: '12px',
                    color: '#ffffff',
                    stroke: '#172448',
                    strokeThickness: 3
                }
            );

        this.player.nameLabel
            .setOrigin(0.5)
            .setDepth(21);

        this.cursors =
            this.input.keyboard
                .createCursorKeys();

        this.wasd =
            this.input.keyboard.addKeys(
                'W,A,S,D'
            );
    }

    update() {
        if (
            !this.player ||
            !this.player.body
        ) {
            return;
        }

        const speed = 150;

        let velocityX = 0;
        let velocityY = 0;

        if (
            this.cursors.left.isDown ||
            this.wasd.A.isDown
        ) {
            velocityX = -speed;
        }

        if (
            this.cursors.right.isDown ||
            this.wasd.D.isDown
        ) {
            velocityX = speed;
        }

        if (
            this.cursors.up.isDown ||
            this.wasd.W.isDown
        ) {
            velocityY = -speed;
        }

        if (
            this.cursors.down.isDown ||
            this.wasd.S.isDown
        ) {
            velocityY = speed;
        }

        this.player.setVelocity(
            velocityX,
            velocityY
        );

        // Evita más velocidad diagonal
        if (
            velocityX !== 0 &&
            velocityY !== 0
        ) {
            this.player.body.velocity
                .normalize()
                .scale(speed);
        }

        this.player.nameLabel.setPosition(
            this.player.x,
            this.player.y - 38
        );
    }
}

const config = {
    type: Phaser.AUTO,

    width: 960,
    height: 640,

    parent: 'game-container',

    backgroundColor: '#fdf5e6',

    pixelArt: true,

    scale: {
        mode: Phaser.Scale.FIT,
        // El centrado lo hace el CSS de #game-container (flex);
        // si Phaser también centra, los márgenes se suman y
        // el canvas queda descuadrado.
        autoCenter: Phaser.Scale.NO_CENTER,
        width: 960,
        height: 640
    },

    physics: {
        default: 'arcade',

        arcade: {
            gravity: {
                y: 0
            },
            debug: false
        }
    },

    scene: [
        HotelScene
    ]
};

// Phaser se crea solamente después
// de que el contenedor sea visible.
window.startHotelGame =
    function () {
        if (!window.game) {
            window.game =
                new Phaser.Game(config);

            return;
        }

        window.game.scene.start(
            'HotelScene'
        );
    };