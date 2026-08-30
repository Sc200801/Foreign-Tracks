import * as Phaser from 'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.esm.js';

// Hojas de sprites exportadas de reSprite: 32x32 por frame.
// Los índices de frame no son uniformes entre personajes
// (cada uno tiene su propia cantidad de frames por animación).
const CHARACTERS = {
    rubi: {
        file: 'src/assets/characters/rubi.png',
        walkFrames: [0, 1, 2, 3, 4, 5, 6],
        correctFrames: [7],
        incorrectFrames: [8]
    },
    luba: {
        file: 'src/assets/characters/luba.png',
        walkFrames: [4, 5, 6, 7],
        correctFrames: [2],
        incorrectFrames: [3]
    },
    tuby: {
        file: 'src/assets/characters/tuby.png',
        walkFrames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        // Tuby todavía no tiene frames dedicados de
        // correcto/incorrecto en su hoja de sprites.
        correctFrames: [],
        incorrectFrames: []
    },
    Yoongui: {
        file: 'src/assets/characters/Yoongui.png',
        walkFrames: [0, 1, 2, 3, 4, 5, 6, 9, 11, 12, 13, 14, 15, 16],
        correctFrames: [7, 8],
        incorrectFrames: [10]
    }
};

const FRAME_SIZE = 32;
const DEFAULT_CHARACTER = 'rubi';

// Recepcionista fijo del mostrador: solo tiene expresiones de
// cara (no camina), en una sola tira de 5 frames.
const RECEPCIONISTA = {
    file: 'src/assets/characters/npc/recepcionista.png',
    neutralFrame: 0,
    correctFrames: [3],
    incorrectFrames: [4]
};

// Personajes que ya aparecen en el carrusel de selección pero
// aún no tienen su propia hoja de sprites de caminata: mientras
// tanto usan la animación de otro personaje como respaldo.
// Cuando llegue su hoja real, solo hay que agregarlos a
// CHARACTERS arriba y quitarlos de aquí.
const CHARACTER_SPRITE_FALLBACK = {
    vera: 'rubi',
    aethel: 'Yoongui'
};

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

        Object.entries(CHARACTERS).forEach(
            ([key, cfg]) => {
                this.load.spritesheet(
                    `char-${key}`,
                    cfg.file,
                    {
                        frameWidth: FRAME_SIZE,
                        frameHeight: FRAME_SIZE
                    }
                );
            }
        );

        this.load.spritesheet(
            'char-recepcionista',
            RECEPCIONISTA.file,
            {
                frameWidth: FRAME_SIZE,
                frameHeight: FRAME_SIZE
            }
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

        this.createCharacterAnimations();

        this.createPlayer(
            floorBounds.x + floorBounds.width / 2,
            floorBounds.y + floorBounds.height - 40
        );

        this.createMostrador(floorBounds);

        this.configurarMultijugador();

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

    // Crea las animaciones (caminar/correcto/incorrecto) de
    // todos los personajes disponibles a partir de CHARACTERS.
    createCharacterAnimations() {
        Object.entries(CHARACTERS).forEach(
            ([key, cfg]) => {
                const textureKey = `char-${key}`;

                this.anims.create({
                    key: `${key}-walk`,
                    frames: this.anims.generateFrameNumbers(
                        textureKey,
                        { frames: cfg.walkFrames }
                    ),
                    frameRate: 8,
                    repeat: -1
                });

                if (cfg.correctFrames.length > 0) {
                    this.anims.create({
                        key: `${key}-correct`,
                        frames: this.anims.generateFrameNumbers(
                            textureKey,
                            { frames: cfg.correctFrames }
                        ),
                        frameRate: 6,
                        repeat: 0
                    });
                }

                if (cfg.incorrectFrames.length > 0) {
                    this.anims.create({
                        key: `${key}-incorrect`,
                        frames: this.anims.generateFrameNumbers(
                            textureKey,
                            { frames: cfg.incorrectFrames }
                        ),
                        frameRate: 6,
                        repeat: 0
                    });
                }
            }
        );

        this.anims.create({
            key: 'recepcionista-correct',
            frames: this.anims.generateFrameNumbers(
                'char-recepcionista',
                { frames: RECEPCIONISTA.correctFrames }
            ),
            frameRate: 6,
            repeat: 0
        });

        this.anims.create({
            key: 'recepcionista-incorrect',
            frames: this.anims.generateFrameNumbers(
                'char-recepcionista',
                { frames: RECEPCIONISTA.incorrectFrames }
            ),
            frameRate: 6,
            repeat: 0
        });
    }

    // El personaje se elige en la sala de espera y se
    // guarda en localStorage (ver index.html).
    getSelectedCharacter() {
        return this.resolveCharacterKey(
            window.localStorage.getItem('selectedCharacter')
        );
    }

    // Convierte cualquier clave de personaje (propia o la que
    // llega de otro jugador por socket) en una clave que sí
    // tiene hoja de sprites cargada.
    resolveCharacterKey(character) {
        if (CHARACTERS[character]) {
            return character;
        }

        // Personaje elegido pero sin hoja de sprites propia
        // todavía (ver CHARACTER_SPRITE_FALLBACK).
        if (CHARACTER_SPRITE_FALLBACK[character]) {
            return CHARACTER_SPRITE_FALLBACK[character];
        }

        return DEFAULT_CHARACTER;
    }

    createPlayer(x, y) {
        this.characterKey = this.getSelectedCharacter();

        const textureKey = `char-${this.characterKey}`;

        this.player = this.physics.add.sprite(
            x,
            y,
            textureKey,
            0
        );

        this.player.setDepth(20);
        this.player.setCollideWorldBounds(
            true
        );

        // Hitbox ajustada a un frame de 32x32
        // (un poco más angosta que el sprite completo).
        this.player.body
            .setSize(20, 26)
            .setOffset(6, 6);

        this.player.nameLabel =
            this.add.text(
                x,
                y - 26,
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

    // Multijugador: que cada quien vea a los demás compañeros
    // de la sala moviéndose en la misma escena. Se apoya en el
    // socket que ya abre room.js (window.socket) y en el código
    // de sala guardado en localStorage.
    configurarMultijugador() {
        this.otrosJugadores = {};
        this.roomCode = null;

        if (!window.socket) {
            return;
        }

        try {
            const currentRoom = JSON.parse(
                window.localStorage.getItem('currentRoom') || '{}'
            );

            this.roomCode = currentRoom.code || null;
        } catch (e) {
            this.roomCode = null;
        }

        if (!this.roomCode) {
            return;
        }

        // Si la escena se reinicia (ej. al volver a entrar),
        // quitar los listeners de la vez anterior antes de
        // agregar los nuevos, para no duplicarlos.
        if (this._onPlayerMoveHandler) {
            window.socket.off(
                'room:player_move',
                this._onPlayerMoveHandler
            );
        }

        if (this._onRoomUpdateHandler) {
            window.socket.off(
                'room:update',
                this._onRoomUpdateHandler
            );
        }

        this._onPlayerMoveHandler = (data) => {
            this.actualizarOtroJugador(data);
        };

        this._onRoomUpdateHandler = (room) => {
            this.sincronizarJugadoresConSala(room);
        };

        window.socket.on(
            'room:player_move',
            this._onPlayerMoveHandler
        );

        window.socket.on(
            'room:update',
            this._onRoomUpdateHandler
        );
    }

    // Crea (la primera vez) o mueve el sprite de otro jugador
    // de la sala según lo que llega por socket.
    actualizarOtroJugador(data) {
        if (!data || !window.socket) {
            return;
        }

        // Nunca crear un sprite para uno mismo.
        if (data.playerId === window.socket.id) {
            return;
        }

        let otro = this.otrosJugadores[data.playerId];

        if (!otro) {
            const characterKey = this.resolveCharacterKey(
                data.character
            );

            const sprite = this.add.sprite(
                data.x,
                data.y,
                `char-${characterKey}`,
                0
            );

            sprite.setDepth(19);

            const label = this.add.text(
                data.x,
                data.y - 26,
                data.name || 'Jugador',
                {
                    fontFamily: 'Arial',
                    fontSize: '12px',
                    color: '#ffffff',
                    stroke: '#172448',
                    strokeThickness: 3
                }
            )
                .setOrigin(0.5)
                .setDepth(19);

            otro = {
                sprite,
                label,
                characterKey
            };

            this.otrosJugadores[data.playerId] = otro;
        }

        otro.sprite.setPosition(data.x, data.y);
        otro.label.setPosition(data.x, data.y - 26);

        if (data.moving) {
            otro.sprite.anims.play(
                `${otro.characterKey}-walk`,
                true
            );
        } else {
            otro.sprite.anims.stop();
            otro.sprite.setFrame(0);
        }

        if (data.direction === 'left') {
            otro.sprite.setFlipX(true);
        } else if (data.direction === 'right') {
            otro.sprite.setFlipX(false);
        }
    }

    // Quita el sprite de cualquier jugador que ya no esté en la
    // sala (se fue o se desconectó), usando la misma lista de
    // jugadores que ya actualiza la sala de espera.
    sincronizarJugadoresConSala(room) {
        if (!room || !Array.isArray(room.players)) {
            return;
        }

        const idsActuales = room.players.map((p) => p.id);

        Object.keys(this.otrosJugadores).forEach((id) => {
            if (idsActuales.includes(id)) {
                return;
            }

            const otro = this.otrosJugadores[id];
            otro.sprite.destroy();
            otro.label.destroy();
            delete this.otrosJugadores[id];
        });
    }

    // Manda la posición propia a los demás jugadores de la
    // sala, unas 20 veces por segundo como máximo (no en cada
    // frame, para no saturar el socket).
    emitirPosicionPropia(estaCaminando, velocityX) {
        if (!window.socket || !this.roomCode || !this.player) {
            return;
        }

        const ahora = this.time.now;

        if (
            this._ultimoEnvioPosicion &&
            ahora - this._ultimoEnvioPosicion < 50
        ) {
            return;
        }

        this._ultimoEnvioPosicion = ahora;

        if (velocityX < 0) {
            this._ultimaDireccion = 'left';
        } else if (velocityX > 0) {
            this._ultimaDireccion = 'right';
        }

        window.socket.emit('room:player_move', {
            roomId: this.roomCode,
            x: this.player.x,
            y: this.player.y,
            character: this.characterKey,
            direction: this._ultimaDireccion || 'right',
            moving: estaCaminando
        });
    }

    // Mostrador de recepción: bloquea el paso (filas 4-5 del
    // mapa, donde está dibujado el mostrador) y ahí mismo se
    // ubica el recepcionista, fijo, mirando hacia el jugador.
    createMostrador(floorBounds) {
        const MOSTRADOR_FILA_INICIO = 4;
        const MOSTRADOR_FILA_FIN = 6; // la fila 6 es el tapete de entrada, sí caminable

        const mostradorY =
            MOSTRADOR_FILA_INICIO * FRAME_SIZE;

        const mostradorAltura =
            (MOSTRADOR_FILA_FIN - MOSTRADOR_FILA_INICIO) *
            FRAME_SIZE;

        const bloqueoZona = this.add.zone(
            floorBounds.x + floorBounds.width / 2,
            mostradorY + mostradorAltura / 2,
            floorBounds.width,
            mostradorAltura
        );

        this.physics.add.existing(bloqueoZona, true);
        this.physics.add.collider(this.player, bloqueoZona);

        // Al ras del borde delantero del mostrador (justo donde
        // empieza el tapete), no flotando dentro de él.
        this.createRecepcionista(
            floorBounds.x + floorBounds.width / 2,
            mostradorY + mostradorAltura - FRAME_SIZE / 2
        );
    }

    // Personaje fijo del recepcionista. Mientras no exista su
    // hoja de sprites (public/src/assets/characters/npc/recepcionista.png)
    // se dibuja un marcador temporal con el mismo método que
    // usaba el jugador antes de tener sprites reales.
    createRecepcionista(x, y) {
        if (this.textures.exists('char-recepcionista')) {
            this.recepcionista = this.physics.add.staticSprite(
                x,
                y,
                'char-recepcionista',
                RECEPCIONISTA.neutralFrame
            );
        } else {
            const graphics = this.make.graphics({
                x: 0,
                y: 0,
                add: false
            });

            graphics.fillStyle(0x6b4226, 1);
            graphics.fillRoundedRect(4, 6, 24, 26, 8);

            graphics.fillStyle(0xffe0bd, 1);
            graphics.fillCircle(16, 10, 8);

            graphics.lineStyle(2, 0x3a2314, 1);
            graphics.strokeRoundedRect(4, 6, 24, 26, 8);

            graphics.generateTexture(
                'recepcionista_placeholder',
                32,
                32
            );
            graphics.destroy();

            this.recepcionista = this.physics.add.staticSprite(
                x,
                y,
                'recepcionista_placeholder'
            );

            console.warn(
                'No se encontró la hoja de sprites del recepcionista; se usa un marcador temporal.'
            );
        }

        this.recepcionista.setDepth(15);

        this.add.text(
            x,
            y - 26,
            'Recepción',
            {
                fontFamily: 'Arial',
                fontSize: '11px',
                color: '#ffffff',
                stroke: '#172448',
                strokeThickness: 3
            }
        )
            .setOrigin(0.5)
            .setDepth(16);
    }

    // Reproduce la expresión del recepcionista al responder
    // (solo si ya está la hoja de sprites real cargada).
    playRecepcionistaReaction(isCorrect) {
        if (
            !this.recepcionista ||
            !this.textures.exists('char-recepcionista')
        ) {
            return;
        }

        const animKey = isCorrect
            ? 'recepcionista-correct'
            : 'recepcionista-incorrect';

        this.recepcionista.play(animKey);

        this.recepcionista.once(
            Phaser.Animations.Events.ANIMATION_COMPLETE,
            () => {
                this.recepcionista.setFrame(
                    RECEPCIONISTA.neutralFrame
                );
            }
        );
    }

    // Reproduce la animación de respuesta correcta/incorrecta
    // del personaje activo. Pensado para ser llamado desde la
    // lógica de preguntas (aún por integrar) vía
    // window.playHotelAnswerReaction(true/false).
    playAnswerReaction(isCorrect) {
        if (!this.player) {
            return;
        }

        const cfg = CHARACTERS[this.characterKey];
        const frames = isCorrect
            ? cfg.correctFrames
            : cfg.incorrectFrames;

        if (frames.length === 0) {
            console.warn(
                `El personaje "${this.characterKey}" todavía no tiene animación de ${isCorrect ? 'correcto' : 'incorrecto'}.`
            );
            return;
        }

        const animKey = `${this.characterKey}-${isCorrect ? 'correct' : 'incorrect'}`;

        // Mientras se reproduce la reacción, update() no debe
        // pisarla con la animación de caminar/quieto.
        this.isReacting = true;

        this.player.anims.play(animKey, true);

        this.player.once(
            Phaser.Animations.Events.ANIMATION_COMPLETE,
            () => {
                this.isReacting = false;
                this.player.setFrame(0);
            }
        );
    }

    // Lee el D-pad y el joystick izquierdo del primer control
    // conectado. No reemplaza al teclado, se combina con él.
    leerEntradaControl() {
        const entrada = {
            x: 0,
            y: 0
        };

        const gamepadPlugin = this.input.gamepad;

        if (!gamepadPlugin) {
            return entrada;
        }

        const control = gamepadPlugin.getPad(0);

        if (!control) {
            return entrada;
        }

        const ZONA_MUERTA = 0.25;

        if (control.left) {
            entrada.x = -1;
        } else if (control.right) {
            entrada.x = 1;
        } else if (Math.abs(control.leftStick.x) > ZONA_MUERTA) {
            entrada.x = control.leftStick.x;
        }

        if (control.up) {
            entrada.y = -1;
        } else if (control.down) {
            entrada.y = 1;
        } else if (Math.abs(control.leftStick.y) > ZONA_MUERTA) {
            entrada.y = control.leftStick.y;
        }

        return entrada;
    }

    update() {
        if (
            !this.player ||
            !this.player.body
        ) {
            return;
        }

        const speed = 150;
        const control = this.leerEntradaControl();

        let velocityX = 0;
        let velocityY = 0;

        if (
            this.cursors.left.isDown ||
            this.wasd.A.isDown ||
            control.x < 0
        ) {
            velocityX = -speed;
        }

        if (
            this.cursors.right.isDown ||
            this.wasd.D.isDown ||
            control.x > 0
        ) {
            velocityX = speed;
        }

        if (
            this.cursors.up.isDown ||
            this.wasd.W.isDown ||
            control.y < 0
        ) {
            velocityY = -speed;
        }

        if (
            this.cursors.down.isDown ||
            this.wasd.S.isDown ||
            control.y > 0
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

        const estaCaminando =
            velocityX !== 0 ||
            velocityY !== 0;

        // Mientras se reproduce correcto/incorrecto no se
        // debe pisar esa animación con caminar/quieto.
        if (!this.isReacting) {
            if (estaCaminando) {
                this.player.anims.play(
                    `${this.characterKey}-walk`,
                    true
                );
            } else {
                this.player.anims.stop();
                this.player.setFrame(0);
            }
        }

        // Mismo sprite de caminata, volteado según el lado.
        if (velocityX < 0) {
            this.player.setFlipX(true);
        } else if (velocityX > 0) {
            this.player.setFlipX(false);
        }

        this.player.nameLabel.setPosition(
            this.player.x,
            this.player.y - 26
        );

        this.emitirPosicionPropia(
            estaCaminando,
            velocityX
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

    input: {
        gamepad: true
    },

    scale: {
        // El centrado lo hace el CSS de #game-container (flex);
        // si Phaser también centra, los márgenes se suman y
        // el canvas queda descuadrado.
        mode: Phaser.Scale.FIT,
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

// Punto de enganche para la lógica de preguntas (aún por
// integrar): window.playHotelAnswerReaction(true | false).
window.playHotelAnswerReaction =
    function (isCorrect) {
        if (!window.game) {
            return;
        }

        const scene =
            window.game.scene.getScene(
                'HotelScene'
            );

        if (scene) {
            scene.playAnswerReaction(
                isCorrect
            );

            scene.playRecepcionistaReaction(
                isCorrect
            );
        }
    };