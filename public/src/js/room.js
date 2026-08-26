document.addEventListener('DOMContentLoaded', () => {

    // Helper para cambiar de pantalla y GUARDAR el estado actual
    const navegarA = (idPantalla) => {
        const el = document.getElementById(idPantalla);
        if (window.mostrarPantalla && el) {
            window.mostrarPantalla(el);
        } else if (el) {
            document.querySelectorAll('.pantalla').forEach(p => p.classList.add('oculto'));
            el.classList.remove('oculto');
        }
        // Guardar la pantalla activa para que el F5 sepa dónde quedarse
        localStorage.setItem('pantallaActiva', idPantalla);
    };

    // 0. ACTUALIZAR SALUDO ESTUDIANTE
    const actualizarSaludoEstudiante = () => {
        let studentName = '';
        try {
            const userObj = JSON.parse(
                localStorage.getItem('usuarioRegistrado') || 
                sessionStorage.getItem('userData') ||
                sessionStorage.getItem('tempUserData') ||
                localStorage.getItem('user') || 
                localStorage.getItem('usuario') || 
                '{}'
            );
            studentName = userObj.fullname || userObj.username || userObj.name || userObj.nombre || '';
        } catch (e) {
            console.error('Error al leer datos del usuario:', e);
        }

        if (!studentName) {
            studentName = localStorage.getItem('username') || 
                          localStorage.getItem('fullname') || 
                          localStorage.getItem('nombre') || '';
        }

        const studentTitle = document.getElementById('welcome-student-title') || document.querySelector('h2');
        if (studentTitle && studentName) {
            studentTitle.innerText = `Hello, ${studentName}`;
        }
        return studentName;
    };

    actualizarSaludoEstudiante();

    // 1. OBTENER TOKEN
    const obtenerTokenSeguro = () => {
        let token = '';
        if (typeof window.obtenerToken === 'function') token = window.obtenerToken();

        if (!token) {
            try {
                const userObj = JSON.parse(
                    localStorage.getItem('usuarioRegistrado') || 
                    sessionStorage.getItem('userData') ||
                    localStorage.getItem('user') || '{}'
                );
                token = userObj.token || userObj.jwt || '';
            } catch (e) {
                console.error('Error al leer token:', e);
            }
        }

        if (!token) {
            token = localStorage.getItem('token') || sessionStorage.getItem('token') || localStorage.getItem('jwt') || '';
        }
        return token;
    };

    let token = obtenerTokenSeguro();
    console.log('🔑 Token detectado para Socket:', token ? '[TOKEN ENCONTRADO]' : '❌ [SIN TOKEN]');

    const serverUrl = window.CONFIG?.SOCKET_URL || window.API_BASE_URL || window.location.origin;

    const socketOptions = {
        auth: { token: token },
        extraHeaders: { Authorization: `Bearer ${token}` },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
    };

    // 2. INICIALIZAR SOCKET
    let socket = null;
    if (typeof io !== 'undefined') socket = io(serverUrl, socketOptions);
    else if (window.io) socket = window.io(serverUrl, socketOptions);

    window.socket = socket;

    // Elementos del DOM
    const btnCrearCodigo = document.getElementById('btn-crear-codigo');
    const inputRoomCode = document.getElementById('room-code-display');
    const inputRoomName = document.getElementById('room-name-input');
    const formCrearSala = document.getElementById('form-crear-sala');
    const btnVolverProfesor = document.getElementById('btn-volver-rol-profesor');
    const btnReady = document.getElementById('btn-ready');
    const btnStartGame = document.getElementById('btn-start-game');
    const btnBackLobby = document.getElementById('btn-back-lobby'); 

    const inputJoinCode = document.getElementById('input-room-code') || document.getElementById('input-join-code');
    const formUnirseSala = document.getElementById('form-unirse-sala');

    if (inputJoinCode) {
        if (inputJoinCode.value.includes('http') || inputJoinCode.value.includes('localhost')) {
            inputJoinCode.value = '';
        }
        inputJoinCode.placeholder = 'XXXXXX';
        inputJoinCode.maxLength = 6;
    }

    // 3. GENERAR CÓDIGO
    if (btnCrearCodigo && inputRoomCode) {
        btnCrearCodigo.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (inputRoomName && !inputRoomName.value.trim()) {
                alert('Por favor escribe primero el nombre de la sala.');
                inputRoomName.focus();
                return;
            }

            const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let codigoGenerado = '';
            for (let i = 0; i < 6; i++) {
                codigoGenerado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
            }
            inputRoomCode.value = codigoGenerado;
        });
    }

    // 4. CREAR SALA (SOLICITUD AL BACKEND)
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

            if (socket) {
                socket.auth = { token: tokenActual };
                if (!socket.connected) socket.connect();
            }

            localStorage.setItem('currentRoom', JSON.stringify({ 
                name: roomName, 
                code: roomCode,
                isHost: true 
            }));

            if (socket && socket.connected) {
                console.log('🚀 Emitiendo "room:create" hacia roomHandler.js...');
                socket.emit('room:create', {
                    roomId: roomCode,
                    roomName: roomName,
                    username: user.fullname || user.username || user.nombre || 'Profesor'
                });
            } else {
                alert('⚠️ No hay conexión activa con el servidor. Verifica que el Backend esté encendido.');
            }
        });
    }

    // 4.B. UNIRSE A SALA (ESTUDIANTE)
    if (formUnirseSala) {
        formUnirseSala.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!inputJoinCode) return alert('Campo de código no encontrado.');
            const cleanCode = inputJoinCode.value.trim().toUpperCase();

            if (!cleanCode || cleanCode.length !== 6) {
                return alert('Por favor ingresa un código válido de 6 caracteres.');
            }

            let studentName = actualizarSaludoEstudiante();
            const nombreFinal = (studentName && studentName !== 'Student') ? studentName : 'Estudiante';
            const tokenFresca = obtenerTokenSeguro();

            if (socket) {
                socket.auth = { token: tokenFresca };
                if (!socket.connected) socket.connect();
            }

            const payload = { roomId: cleanCode, roomCode: cleanCode, username: nombreFinal };
            localStorage.setItem('currentRoom', JSON.stringify({ code: cleanCode, isHost: false }));

            if (socket && socket.connected) {
                socket.emit('room:join', payload);
            } else if (socket) {
                socket.once('connect', () => socket.emit('room:join', payload));
            }
        });
    }

    // 5. BOTONES DE ACCIÓN
    if (btnReady) {
        btnReady.addEventListener('click', () => {
            const room = JSON.parse(localStorage.getItem('currentRoom') || '{}');
            if (room.code && socket?.connected) socket.emit('room:toggle_ready', { roomId: room.code });
        });
    }

    if (btnStartGame) {
        btnStartGame.addEventListener('click', () => {
            const room = JSON.parse(localStorage.getItem('currentRoom') || '{}');
            if (room.code && socket?.connected) socket.emit('room:start', { roomId: room.code });
        });
    }

    // ACCIÓN DE REGRESAR AL LOBBY
    if (btnBackLobby) {
        btnBackLobby.addEventListener('click', (e) => {
            e.preventDefault();
            
            let currentRoom = {};
            try {
                currentRoom = JSON.parse(localStorage.getItem('currentRoom') || '{}');
            } catch (err) {}

            if (currentRoom.code && socket && socket.connected) {
                socket.emit('room:back_to_lobby', { roomId: currentRoom.code });
            } else {
                navegarA('pantalla-sala-espera');
            }
        });
    }

    // 🔄 RESTAURACIÓN DE SESIÓN / RECONEXIÓN AUTOMÁTICA AL RECARGAR (F5)
    let yaRestaurado = false;
    const restaurarEstadoSesion = () => {
        const tokenActual = obtenerTokenSeguro();
        const currentRoom = JSON.parse(localStorage.getItem('currentRoom') || '{}');
        const userObj = JSON.parse(localStorage.getItem('usuarioRegistrado') || sessionStorage.getItem('userData') || '{}');
        const pantallaGuardada = localStorage.getItem('pantallaActiva');

        if (pantallaGuardada && document.getElementById(pantallaGuardada)) {
            navegarA(pantallaGuardada);
        }

        if (!yaRestaurado && tokenActual && currentRoom.code) {
            yaRestaurado = true;
            console.log(`🔄 Reconectando automáticamente a la sala ${currentRoom.code}...`);
            
            if (socket) {
                socket.auth = { token: tokenActual };
                if (!socket.connected) socket.connect();

                const nombreJugador = userObj.fullname || userObj.username || actualizarSaludoEstudiante() || 'Estudiante';

                if (currentRoom.isHost) {
                    socket.emit('room:create', {
                        roomId: currentRoom.code,
                        roomName: currentRoom.name || 'Sala de Juego',
                        username: nombreJugador
                    });
                } else {
                    socket.emit('room:join', {
                        roomId: currentRoom.code,
                        roomCode: currentRoom.code,
                        username: nombreJugador
                    });
                }
            }
        }
    };

    // 6. MANEJO DE EVENTOS DE SOCKET
    if (socket) {
        socket.on('connect', () => {
            console.log('🟢 Conectado con éxito a Socket.io. ID:', socket.id);
            restaurarEstadoSesion();
        });

        socket.on('room:created', (data) => {
            console.log('✅ Sala creada exitosamente:', data);
            const pantallaActual = localStorage.getItem('pantallaActiva');
            if (pantallaActual !== 'pantalla-seleccion-escena') {
                cambiarALobby(data.roomName || data.name, data.roomId || data.code);
            }
        });

        const handleRoomJoined = (data) => {
            console.log('✅ Unido a la sala exitosamente:', data);
            const pantallaActual = localStorage.getItem('pantallaActiva');
            if (pantallaActual !== 'pantalla-seleccion-escena') {
                cambiarALobby(data.roomName || 'Sala de Juego', data.roomId || data.roomCode);
            }
        };

        socket.on('room:joined', handleRoomJoined);
        socket.on('sala-unida', handleRoomJoined);

        const handleRoomError = (data) => {
            const msg = data.message || data.error || 'Ocurrió un error en la sala.';
            console.error('❌ Error devuelto por el servidor:', msg);
            alert(msg);
        };

        socket.on('room:error', handleRoomError);

        socket.on('connect_error', (err) => {
            console.error('❌ Error en authSocketMiddleware.js:', err.message);
            if (err.message.includes('auth') || err.message.includes('token')) {
                alert('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.');
            }
        });

        // 🟢 ACTUALIZACIÓN DEL LOBBY (LÓGICA REVISADA CON NOMBRE Y ROL DE USUARIO)
        socket.on('room:update', (roomData) => {
            if (!roomData) return;

            const headerTitle = document.getElementById('room-header-title');
            const roomCode = roomData.roomId || roomData.code || JSON.parse(localStorage.getItem('currentRoom') || '{}').code;
            if (headerTitle) {
                headerTitle.innerText = `${roomData.name || roomData.roomName || 'Room'} (Code: ${roomCode})`;
            }

            // Normalización para asegurar array de jugadores
            let players = [];
            if (Array.isArray(roomData.players)) {
                players = roomData.players;
            } else if (roomData.players && typeof roomData.players === 'object') {
                players = Object.values(roomData.players);
            }

            // 🎯 MOSTRAR EL USUARIO ACTIVO CON SU ROL (Professor: Luisa / Student: Michael)
            const localUserDisplay = document.getElementById('local-user-display');
            if (localUserDisplay) {
                const userObj = JSON.parse(localStorage.getItem('usuarioRegistrado') || sessionStorage.getItem('userData') || '{}');
                const rawRole = (userObj.role || '').toLowerCase();
                
                const isTeacher = rawRole.includes('teacher') || rawRole.includes('docente') || rawRole.includes('professor') || roomData.hostId === socket.id;
                const rolePrefix = isTeacher ? 'Professor' : 'Student';
                const userName = userObj.fullname || userObj.username || actualizarSaludoEstudiante() || 'Player';

                localUserDisplay.innerText = `${rolePrefix}: ${userName}`;
            }
            
            // 🎯 LÓGICA DE ESPERA / SALA LLENA EN EL INPUT CENTRAL
            const activeDisplay = document.getElementById('active-player-display');
            if (activeDisplay) {
                if (players.length >= 4) {
                    activeDisplay.value = "Room full (4/4)";
                } else {
                    activeDisplay.value = `Waiting for players... (${players.length}/4)`;
                }
            }

            const esProfesor = roomData.hostId === socket.id;

            for (let i = 1; i <= 4; i++) {
                const card = document.getElementById(`card-player${i}`);
                const playerLabel = document.getElementById(`label-player${i}-name`);
                const statusLabel = document.getElementById(`status-player${i}`);
                const player = players[i - 1];

                if (player) {
                    if (card) { card.classList.remove('oculto'); card.style.display = 'flex'; }
                    if (playerLabel) playerLabel.innerText = player.name || player.username || 'Student';
                    if (statusLabel) {
                        statusLabel.classList.remove('oculto');
                        statusLabel.style.display = 'block';
                        statusLabel.innerText = player.isReady ? 'Ready' : 'Not Ready';
                        statusLabel.style.color = player.isReady ? '#2ed573' : '#ff4757';
                    }
                } else if (card) {
                    card.classList.add('oculto');
                    card.style.display = 'none';
                }
            }

            if (btnStartGame) btnStartGame.style.display = esProfesor ? 'block' : 'none';
            if (btnReady) btnReady.style.display = esProfesor ? 'none' : 'block';
        });

        socket.on('room:game_started', () => {
            navegarA('pantalla-seleccion-escena');
        });

        socket.on('room:returned_to_lobby', () => {
            console.log('🔄 Regresando al lobby por orden del servidor...');
            navegarA('pantalla-sala-espera');
        });
    }

    function cambiarALobby(nombreSala, codigoSala) {
        const headerTitle = document.getElementById('room-header-title');
        if (headerTitle) {
            headerTitle.innerText = `${nombreSala} (Code: ${codigoSala})`;
        }
        navegarA('pantalla-sala-espera');
    }

    if (btnVolverProfesor) {
        btnVolverProfesor.addEventListener('click', (e) => {
            e.preventDefault();
            navegarA('pantalla-rol');
        });
    }
});