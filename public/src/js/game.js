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

        // Placa de créditos del equipo, montada sobre la pared
        // encima del elevador de la recepción (ver createPlacaCreditos).
        this.load.image(
            'placa_creditos',
            'src/assets/ui/placa_esr.png'
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

        this.createPlacaCreditos(floorBounds);

        this.configurarMultijugador();

        this.configurarQuizDialogo();

        // La pared de la recepción (arco, reloj y placa de
        // créditos) se dibuja arriba del piso caminable. Para que
        // esa decoración se vea siempre completa (sin depender de
        // qué tan cerca esté el jugador del mostrador), el encuadre
        // de la cámara se calcula sobre la UNIÓN de piso + pared,
        // no solo el piso. El área donde puede caminar el jugador
        // (physics.world.setBounds, más arriba) no se toca.
        const wallsBounds = this.getFloorBounds(map, 'Walls');
        const encuadre = this.unirBounds(floorBounds, wallsBounds);

        // Acercar la cámara al máximo posible sin deformar
        // la habitación (respeta la relación de aspecto).
        const zoom = Math.min(
            this.scale.width / encuadre.width,
            this.scale.height / encuadre.height
        );

        this.cameras.main.setZoom(zoom);

        // Los límites de cámara nunca deben ser más chicos
        // que lo que se ve en pantalla, o la vista se pega
        // a una esquina en vez de quedar centrada.
        const viewWidth = this.scale.width / zoom;
        const viewHeight = this.scale.height / zoom;

        const boundsWidth = Math.max(
            encuadre.width,
            viewWidth
        );

        const boundsHeight = Math.max(
            encuadre.height,
            viewHeight
        );

        const encuadreCenterX =
            encuadre.x + encuadre.width / 2;

        const encuadreCenterY =
            encuadre.y + encuadre.height / 2;

        this.cameras.main.setBounds(
            encuadreCenterX - boundsWidth / 2,
            encuadreCenterY - boundsHeight / 2,
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

    // Rectángulo más pequeño que contiene por completo a los dos
    // rectángulos recibidos (usado para que el encuadre de la
    // cámara cubra tanto el piso como la pared de arriba).
    unirBounds(a, b) {
        const minX = Math.min(a.x, b.x);
        const minY = Math.min(a.y, b.y);
        const maxX = Math.max(a.x + a.width, b.x + b.width);
        const maxY = Math.max(a.y + a.height, b.y + b.height);

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

    // ---------------------------------------------------------
    // QUIZ POR TURNOS DE LA RECEPCIONISTA
    //
    // Cada estudiante tiene un turno (1-4) asignado según el
    // orden de llegada en RoomPlayers. Cuando el diálogo activo
    // (DialogueNode.targetPlayer) coincide con el turno propio,
    // se muestran los 2 botones de respuesta; si no, se bloquea
    // la interacción y se avisa a quién le toca.
    // ---------------------------------------------------------
    configurarQuizDialogo() {
        this.miPlayerId = this.obtenerPlayerIdPropio();
        this.dialogoActual = null;
        this.esperandoResultadoPropio = false;

        // Navegación de las respuestas con D-pad/stick + botón de
        // confirmar del control (ver leerEntradaControlQuiz()).
        this._botonesRespuesta = [];
        this.quizIndiceSeleccionado = 0;
        this._gamepadQuizPrevio = {
            arriba: false,
            abajo: false,
            confirmar: false
        };

        this.elDialogueBox = document.getElementById('hotel-dialogue-box');
        this.elDialogueTurn = document.getElementById('hotel-dialogue-turn');
        this.elDialogueText = document.getElementById('hotel-dialogue-text');
        this.elDialogueOptions = document.getElementById('hotel-dialogue-options');
        this.elDialogueWaiting = document.getElementById('hotel-dialogue-waiting');
        this.elDialogueFeedback = document.getElementById('hotel-dialogue-feedback');
        this.elHealthWrapper = document.getElementById('hotel-health-bar-wrapper');
        this.elHealthFill = document.getElementById('hotel-health-bar-fill');

        if (!window.socket) {
            return;
        }

        // Igual que con los listeners de movimiento: quitar los
        // de una entrada anterior a la escena antes de agregar
        // los nuevos, para no duplicar reacciones.
        [
            'room:game_started',
            'dialogue:success',
            'dialogue:error',
            'scenario:completed'
        ].forEach((evento) => {
            if (this[`_on${evento}`]) {
                window.socket.off(evento, this[`_on${evento}`]);
            }
        });

        this._onroom_game_started = (data) => this.manejarInicioEscenario(data);
        this._ondialogue_success = (data) => this.manejarRespuestaCorrecta(data);
        this._ondialogue_error = (data) => this.manejarRespuestaIncorrecta(data);
        this._onscenario_completed = (data) => this.finalizarEscenario(data);

        window.socket.on('room:game_started', this._onroom_game_started);
        window.socket.on('dialogue:success', this._ondialogue_success);
        window.socket.on('dialogue:error', this._ondialogue_error);
        window.socket.on('scenario:completed', this._onscenario_completed);

        // 'room:game_started' ya se disparó antes de que esta escena
        // existiera (room.js lo usa para navegar a selección de
        // escena y lo deja cacheado en window.__ultimoJuegoIniciado).
        // Si no se procesa aquí, el primer diálogo nunca aparecería.
        if (window.__ultimoJuegoIniciado) {
            this.manejarInicioEscenario(window.__ultimoJuegoIniciado);
        }
    }

    // El id del jugador (Player de la BD) se guarda al iniciar
    // sesión en localStorage ('usuarioRegistrado'); es lo que el
    // servidor usa como playerId/activePlayerId en RoomPlayers.
    obtenerPlayerIdPropio() {
        try {
            const usuario = JSON.parse(
                window.localStorage.getItem('usuarioRegistrado') || '{}'
            );

            return usuario.id || usuario.playerId || null;
        } catch (e) {
            return null;
        }
    }

    manejarInicioEscenario(data) {
        if (!data) {
            return;
        }

        this.elHealthWrapper?.classList.remove('oculto');
        this.actualizarBarraVida(100);

        this.mostrarDialogo(data.dialogue, data.activePlayerId, data.turns);
    }

    manejarRespuestaCorrecta(data) {
        if (!data) {
            return;
        }

        this.elDialogueFeedback?.classList.add('oculto');

        if (this.esperandoResultadoPropio) {
            this.esperandoResultadoPropio = false;
            window.playHotelAnswerReaction(true);
        }

        if (data.nextDialogue) {
            this.mostrarDialogo(data.nextDialogue, data.activePlayerId, data.turns);
        }
    }

    manejarRespuestaIncorrecta(data) {
        if (!data) {
            return;
        }

        if (this.esperandoResultadoPropio) {
            this.esperandoResultadoPropio = false;
            window.playHotelAnswerReaction(false);
        }

        this.actualizarBarraVida(data.remainingHealth);

        // El mismo diálogo se vuelve a mostrar (no avanza
        // stepIndex hasta que respondan bien), reactivando los
        // botones para quien tenga el turno. IMPORTANTE: esto debe
        // ir ANTES de mostrar el feedback, porque mostrarDialogo()
        // oculta el feedback de la ronda anterior al redibujar.
        if (this.dialogoActual) {
            this.mostrarDialogo(
                this.dialogoActual,
                this.dialogoActualActivePlayerId,
                this.dialogoActualTurns
            );
        }

        if (this.elDialogueFeedback) {
            const feedback = data.feedback;
            let texto = data.message || 'Respuesta incorrecta.';

            if (feedback && typeof feedback === 'object') {
                const clave = Object.keys(feedback)[0];
                if (clave) {
                    texto = `${clave}: ${feedback[clave]}`;
                }
            } else if (typeof feedback === 'string') {
                texto = feedback;
            }

            this.elDialogueFeedback.textContent = texto;
            this.elDialogueFeedback.classList.remove('oculto');
        }
    }

    // Arma el cuadro de diálogo de la recepcionista: el texto en
    // inglés siempre visible, y según de quién sea el turno, o
    // bien los 2 botones de respuesta (posición aleatoria) o el
    // mensaje de espera bloqueando la entrada.
    mostrarDialogo(dialogue, activePlayerId, turns) {
        if (!dialogue || !this.elDialogueBox) {
            return;
        }

        this.dialogoActual = dialogue;
        this.dialogoActualActivePlayerId = activePlayerId;
        this.dialogoActualTurns = turns;

        const listaTurnos = Array.isArray(turns) ? turns : [];
        const turnoActivo = listaTurnos.find(
            (t) => t.playerId === activePlayerId
        );

        const numeroTurno = turnoActivo
            ? turnoActivo.turnOrder
            : dialogue.targetPlayer;

        const nombreJugadorActivo =
            turnoActivo?.playerInfo?.fullname ||
            turnoActivo?.playerInfo?.name ||
            turnoActivo?.playerInfo?.username ||
            `Player ${numeroTurno}`;

        this.elDialogueBox.classList.remove('oculto');
        this.elDialogueFeedback?.classList.add('oculto');

        if (this.elDialogueTurn) {
            this.elDialogueTurn.textContent = `Player ${numeroTurno}`;
        }

        if (this.elDialogueText) {
            this.elDialogueText.textContent = dialogue.situationTextEn || '';
        }

        const esMiTurno =
            this.miPlayerId !== null &&
            activePlayerId !== null &&
            String(this.miPlayerId) === String(activePlayerId);

        if (this.elDialogueOptions) {
            this.elDialogueOptions.innerHTML = '';
        }

        // Se limpia hasta que renderizarBotonesRespuesta() (si
        // corresponde) los vuelva a llenar; evita que el control
        // siga "navegando" botones que ya no existen.
        this._botonesRespuesta = [];

        if (esMiTurno) {
            this.elDialogueWaiting?.classList.add('oculto');
            this.renderizarBotonesRespuesta(dialogue);
        } else if (this.elDialogueWaiting) {
            this.elDialogueWaiting.textContent =
                `Espera... le toca responder a ${nombreJugadorActivo}.`;
            this.elDialogueWaiting.classList.remove('oculto');
        }
    }

    // Crea los 2 botones (correcto + distractor) en orden
    // aleatorio, para que la respuesta correcta no siempre esté
    // en la misma posición.
    renderizarBotonesRespuesta(dialogue) {
        if (!this.elDialogueOptions) {
            return;
        }

        const opciones = [
            { texto: dialogue.correctAnswerPattern, esCorrecta: true },
            { texto: dialogue.wrongAnswer, esCorrecta: false }
        ].filter((op) => op.texto);

        // Fisher-Yates simple para 2 elementos: alcanza con un
        // solo intercambio al azar.
        if (opciones.length === 2 && Math.random() < 0.5) {
            [opciones[0], opciones[1]] = [opciones[1], opciones[0]];
        }

        opciones.forEach((opcion) => {
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'hotel-dialogue-option-btn';
            boton.textContent = `> ${opcion.texto}`;

            boton.addEventListener('click', () => {
                this.enviarRespuesta(opcion.texto);
            });

            this.elDialogueOptions.appendChild(boton);
        });

        // Se guardan los botones recién creados para poder
        // navegarlos con el D-pad/stick del control (ver
        // leerEntradaControlQuiz()), empezando en el primero.
        this._botonesRespuesta = Array.from(
            this.elDialogueOptions.querySelectorAll('button')
        );
        this.quizIndiceSeleccionado = 0;
        this.marcarBotonSeleccionado();
    }

    // Resalta visualmente cuál de los botones de respuesta está
    // seleccionado en este momento por el control (D-pad/stick).
    marcarBotonSeleccionado() {
        this._botonesRespuesta.forEach((boton, indice) => {
            boton.classList.toggle(
                'seleccionado',
                indice === this.quizIndiceSeleccionado
            );
        });
    }

    // Envía la respuesta elegida al servidor y bloquea los
    // botones mientras se espera el resultado (evita doble clic
    // y respuestas fuera de turno).
    enviarRespuesta(textoRespuesta) {
        if (!window.socket || !this.roomCode || !this.dialogoActual) {
            return;
        }

        this.esperandoResultadoPropio = true;

        if (this.elDialogueOptions) {
            this.elDialogueOptions
                .querySelectorAll('button')
                .forEach((btn) => {
                    btn.disabled = true;
                });
        }

        // Ya se envió la respuesta: el control deja de poder
        // navegar/confirmar sobre estos botones hasta que llegue
        // el resultado y se rearme el diálogo.
        this._botonesRespuesta = [];

        window.socket.emit('dialogue:submit_answer', {
            roomId: this.roomCode,
            dialogueId: this.dialogoActual.id,
            selectedAnswer: textoRespuesta
        });
    }

    // Refleja la vida grupal (GameSession.survivalHealth) en la
    // barra de la esquina, cambiando a rojo cuando está baja.
    actualizarBarraVida(porcentaje) {
        if (!this.elHealthFill || typeof porcentaje !== 'number') {
            return;
        }

        const valor = Math.max(0, Math.min(100, porcentaje));
        this.elHealthFill.style.width = `${valor}%`;
        this.elHealthFill.classList.toggle('hotel-health-low', valor <= 30);
    }

    finalizarEscenario(data) {
        this.dialogoActual = null;
        this._botonesRespuesta = [];

        if (this.elDialogueTurn) {
            this.elDialogueTurn.textContent = '¡Escenario completado!';
        }

        if (this.elDialogueText) {
            this.elDialogueText.textContent =
                data?.message || '¡Felicidades! Han completado el escenario con éxito.';
        }

        this.elDialogueOptions?.replaceChildren();
        this.elDialogueWaiting?.classList.add('oculto');
        this.elDialogueFeedback?.classList.add('oculto');
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

    // Placa de créditos del equipo (ESR Student Developers),
    // montada en la pared justo encima del elevador de la
    // recepción, al ras del borde superior de las puertas
    // (fila 4 del tileset, la misma que usa createMostrador).
    createPlacaCreditos(floorBounds) {
        const MOSTRADOR_FILA_INICIO = 4;
        const bordeSuperiorPuertas = MOSTRADOR_FILA_INICIO * FRAME_SIZE;

        const placa = this.add.image(
            floorBounds.x + floorBounds.width / 2,
            bordeSuperiorPuertas - 4,
            'placa_creditos'
        );

        placa.setOrigin(0.5, 1);
        placa.setScale(0.22);
        placa.setDepth(3);
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
    //
    // Mientras haya botones de respuesta activos en pantalla (es
    // el turno del jugador local), el D-pad/stick se dedica por
    // completo a navegar esas opciones (ver leerEntradaControlQuiz)
    // y NO mueve al personaje; evita que "abajo" mueva al jugador
    // y a la vez cambie de opción al mismo tiempo.
    leerEntradaControl() {
        const entrada = {
            x: 0,
            y: 0
        };

        if (this._botonesRespuesta && this._botonesRespuesta.length > 0) {
            return entrada;
        }

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

    // Navega los botones de respuesta del quiz con el D-pad/stick
    // izquierdo (arriba/abajo) y confirma la opción resaltada con
    // el botón inferior del control (A en Xbox, Cross en
    // PlayStation: buttons[0] en el mapeo estándar del navegador,
    // igual para mandos por USB o por Bluetooth). Se detecta el
    // "flanco" de cada botón (recién presionado) para que no se
    // repita solo por mantenerlo apretado.
    leerEntradaControlQuiz() {
        if (!this._botonesRespuesta || this._botonesRespuesta.length === 0) {
            return;
        }

        const gamepadPlugin = this.input.gamepad;
        const control = gamepadPlugin ? gamepadPlugin.getPad(0) : null;

        if (!control) {
            return;
        }

        const ZONA_MUERTA = 0.5;

        const arribaAhora =
            control.up || control.leftStick.y < -ZONA_MUERTA;

        const abajoAhora =
            control.down || control.leftStick.y > ZONA_MUERTA;

        // buttons[0]: botón de confirmar en el mapeo estándar
        // (A en Xbox, Cross/X en PlayStation).
        const confirmarAhora = control.buttons[0]?.pressed || false;

        const previo = this._gamepadQuizPrevio;
        const total = this._botonesRespuesta.length;

        if (arribaAhora && !previo.arriba) {
            this.quizIndiceSeleccionado =
                (this.quizIndiceSeleccionado - 1 + total) % total;
            this.marcarBotonSeleccionado();
        } else if (abajoAhora && !previo.abajo) {
            this.quizIndiceSeleccionado =
                (this.quizIndiceSeleccionado + 1) % total;
            this.marcarBotonSeleccionado();
        }

        if (confirmarAhora && !previo.confirmar) {
            const boton = this._botonesRespuesta[this.quizIndiceSeleccionado];
            if (boton && !boton.disabled) {
                boton.click();
            }
        }

        previo.arriba = arribaAhora;
        previo.abajo = abajoAhora;
        previo.confirmar = confirmarAhora;
    }

    update() {
        this.leerEntradaControlQuiz();

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