document.addEventListener('DOMContentLoaded', () => {
    // 1. OBTENER TOKEN BUSCANDO EN TODAS LAS UBICACIONES POSIBLES
    const obtenerTokenSeguro = () => {
        let token = '';

        // Intento 1: De la función global de config.js
        if (typeof window.obtenerToken === 'function') {
            token = window.obtenerToken();
        }

        // Intento 2: Directo del objeto usuarioRegistrado
        if (!token) {
            try {
                const userObj = JSON.parse(localStorage.getItem('usuarioRegistrado') || '{}');
                token = userObj.token || userObj.jwt || '';
            } catch (e) {
                console.error('Error al leer usuarioRegistrado:', e);
            }
        }

        // Intento 3: Directo de la clave 'token' en localStorage
        if (!token) {
            token = localStorage.getItem('token') || localStorage.getItem('jwt') || '';
        }

        return token;
    };

    let token = obtenerTokenSeguro();
    console.log('🔑 Token detectado para Socket:', token ? ' [TOKEN ENCONTRADO]' : '❌ [SIN TOKEN]');

    const serverUrl = (window.CONFIG && window.CONFIG.SOCKET_URL) ? window.CONFIG.SOCKET_URL : 'http://localhost:3000';

    // 2. CONECTAR CON SOCKET.IO Y EXPONERLO GLOBALMENTE
    let socket = null;

    if (typeof io !== 'undefined') {
        socket = io(serverUrl, {
            auth: { 
                token: token
            },
            extraHeaders: {
                Authorization: `Bearer ${token}`
            },
            transports: ['websocket', 'polling']
        });
    } else if (window.io) {
        socket = window.io(serverUrl, {
            auth: { 
                token: token
            },
            extraHeaders: {
                Authorization: `Bearer ${token}`
            },
            transports: ['websocket', 'polling']
        });
    }

    // Guardar referencia en el objeto window para que auth-player.js pueda emitir eventos
    window.socket = socket;

    // Elementos del DOM
    const btnCrearCodigo = document.getElementById('btn-crear-sala');
    const inputRoomCode = document.getElementById('room-code-display');
    const inputRoomName = document.getElementById('room-name-input');
    const formCrearSala = document.getElementById('form-crear-sala');
    const btnVolverProfesor = document.getElementById('btn-volver-rol-profesor');
    const btnReady = document.getElementById('btn-ready');
    const btnStartGame = document.getElementById('btn-start-game');

    // Escuchar el evento que envía auth-player.js cuando el alumno intenta unirse a una sala
    window.addEventListener('unirseSalaSocket', (e) => {
        if (socket && socket.connected) {
            socket.emit('room:join', e.detail);
        }
    });

    // 3. GENERAR CÓDIGO ALEATORIO
    if (btnCrearCodigo) {
        btnCrearCodigo.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (inputRoomName && !inputRoomName.value.trim()) {
                alert('Por favor escribe primero el nombre de la sala.');
                inputRoomName.focus();
                return;
            }

            const codigoGenerado = Math.floor(100000 + Math.random() * 900000).toString();
            if (inputRoomCode) {
                inputRoomCode.value = codigoGenerado;
            }
        });
    }

    // 4. FORMULARIO: CREAR SALA (PROFESOR)
    if (formCrearSala) {
        formCrearSala.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const roomName = inputRoomName ? inputRoomName.value.trim() : '';
            const roomCode = inputRoomCode ? inputRoomCode.value.trim() : '';

            if (!roomName) {
                alert('Por favor escribe un nombre para la sala.');
                inputRoomName.focus();
                return;
            }

            if (!roomCode) {
                alert('Genera primero el código presionando "Create room code".');
                return;
            }

            const user = JSON.parse(localStorage.getItem('usuarioRegistrado') || '{}');
            const tokenActual = obtenerTokenSeguro();

            // Asegurar que el socket actualice sus credenciales si se obtuvieron después de la conexión inicial
            if (socket && tokenActual) {
                socket.auth = { token: tokenActual };
            }

            // Guardar contexto localmente
            localStorage.setItem('currentRoom', JSON.stringify({ 
                name: roomName, 
                code: roomCode,
                isHost: true 
            }));

            // Si el socket está listo, emitimos la creación al servidor
            if (socket && socket.connected) {
                console.log('🚀 Emitiendo "room:create" hacia roomHandler.js...');
                socket.emit('room:create', {
                    roomId: roomCode,       // Se usará como accessCode en MariaDB
                    roomName: roomName,     // Se usará como groupName en MariaDB
                    username: user.fullname || user.username || 'Profesor'
                });
            } else {
                console.warn('⚠️ Socket no conectado. Avanzando a la pantalla del Lobby...');
                cambiarALobby(roomName, roomCode);
            }
        });
    }

    // 5. BOTÓN "READY?" PARA ESTUDIANTES
    if (btnReady) {
        btnReady.addEventListener('click', () => {
            const currentRoom = JSON.parse(localStorage.getItem('currentRoom') || '{}');
            if (currentRoom.code && socket && socket.connected) {
                socket.emit('room:toggle_ready', { roomId: currentRoom.code });
            }
        });
    }

    // 6. BOTÓN "START GAME" PARA EL PROFESOR
    if (btnStartGame) {
        btnStartGame.addEventListener('click', () => {
            const currentRoom = JSON.parse(localStorage.getItem('currentRoom') || '{}');
            if (currentRoom.code && socket && socket.connected) {
                console.log('🚀 El profesor ha presionado "Start Game"...');
                socket.emit('room:start', { roomId: currentRoom.code });
            }
        });
    }

    // 7. EVENTOS Y RESPUESTAS DEL SERVIDOR
    if (socket) {
        socket.on('connect', () => {
            console.log('🟢 Conectado con éxito a Socket.io. ID:', socket.id);
        });

        socket.on('room:created', (data) => {
            console.log('✅ Sala creada exitosamente en servidor y MariaDB:', data);
            cambiarALobby(data.roomName, data.roomId);
        });

        socket.on('room:joined', (data) => {
            console.log('✅ Unido a la sala exitosamente:', data);
            cambiarALobby(data.roomName, data.roomId);
        });

        socket.on('room:error', (data) => {
            alert(data.message || 'Error con la sala seleccionada.');
        });

        // 🔄 ACTUALIZACIÓN EN TIEMPO REAL DEL LOBBY
        socket.on('room:update', (roomData) => {
            if (!roomData) return;

            console.log('📡 Actualización de sala recibida:', roomData);

            // A. Nombre del Header
            const headerTitle = document.getElementById('room-header-title');
            if (headerTitle) {
                headerTitle.innerText = `${roomData.name} (Code: ${roomData.roomId || JSON.parse(localStorage.getItem('currentRoom') || '{}').code})`;
            }

            const players = roomData.players || [];
            const esProfesor = roomData.hostId === socket.id;

            // B. Mostrar/Ocultar y renderizar únicamente los alumnos que han ingresado
            for (let i = 1; i <= 4; i++) {
                const card = document.getElementById(`card-player${i}`);
                const playerLabel = document.getElementById(`label-player${i}-name`);
                const statusLabel = document.getElementById(`status-player${i}`);

                if (players[i - 1]) {
                    const p = players[i - 1];
                    
                    if (card) card.classList.remove('oculto');
                    if (playerLabel) playerLabel.innerText = p.name;
                    
                    if (statusLabel) {
                        statusLabel.classList.remove('oculto');
                        statusLabel.innerText = p.isReady ? 'Ready' : 'Not Ready';
                        statusLabel.style.color = p.isReady ? '#2ed573' : '#ff4757';
                    }
                } else {
                    // Si el espacio está libre, se oculta la tarjeta completa
                    if (card) card.classList.add('oculto');
                }
            }

            // C. Visibilidad de Controles según Rol
            if (btnStartGame) {
                // Solo el profesor ve "Start game"
                btnStartGame.style.display = esProfesor ? 'block' : 'none';
            }

            if (btnReady) {
                // El profesor NO necesita botón "Ready?", solo los alumnos
                btnReady.style.display = esProfesor ? 'none' : 'block';
            }
        });

        // 🎮 EVENTO: INICIO DE JUEGO PARA TODOS LOS INTEGRANTES DE LA SALA
        socket.on('room:game_started', (data) => {
            console.log('🏁 ¡Iniciando el juego!', data);
            if (typeof window.mostrarPantalla === 'function') {
                window.mostrarPantalla('pantalla-seleccion-escena');
            } else {
                document.querySelectorAll('.pantalla, .pantalla-bienvenida').forEach(d => d.classList.add('oculto'));
                document.getElementById('pantalla-seleccion-escena')?.classList.remove('oculto');
            }
        });

        socket.on('connect_error', (err) => {
            console.error('❌ Error de autenticación en Socket.io:', err.message);
        });
    }

    // Cambiar a la vista del Lobby
    function cambiarALobby(nombreSala, codigoSala) {
        const headerTitle = document.getElementById('room-header-title');
        if (headerTitle) {
            headerTitle.innerText = `${nombreSala} (Code: ${codigoSala})`;
        }

        if (typeof window.mostrarPantalla === 'function') {
            window.mostrarPantalla('pantalla-sala-espera');
        } else {
            document.querySelectorAll('.pantalla, .pantalla-bienvenida').forEach(d => d.classList.add('oculto'));
            document.getElementById('pantalla-sala-espera')?.classList.remove('oculto');
        }
    }

    if (btnVolverProfesor) {
        btnVolverProfesor.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof window.mostrarPantalla === 'function') {
                window.mostrarPantalla('pantalla-rol');
            }
        });
    }
});