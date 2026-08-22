document.addEventListener('DOMContentLoaded', () => {

    // 0. ACTUALIZAR NOMBRE DE BIENVENIDA DEL ESTUDIANTE EN INGLÉS
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
            console.error('Error al leer datos del usuario en Storage:', e);
        }

        if (!studentName) {
            studentName = localStorage.getItem('username') || 
                          localStorage.getItem('fullname') || 
                          localStorage.getItem('nombre') || '';
        }

        const studentTitle = document.getElementById('welcome-student-title') || 
                             document.querySelector('.card h2') || 
                             document.querySelector('.pantalla-estudiante h2') ||
                             document.querySelector('h2');

        if (studentTitle && studentName) {
            studentTitle.innerText = `Hello, ${studentName}`;
        }

        return studentName;
    };

    actualizarSaludoEstudiante();

    // 1. OBTENER TOKEN BUSCANDO EN TODAS LAS UBICACIONES POSIBLES
    const obtenerTokenSeguro = () => {
        let token = '';

        if (typeof window.obtenerToken === 'function') {
            token = window.obtenerToken();
        }

        if (!token) {
            try {
                const userObj = JSON.parse(
                    localStorage.getItem('usuarioRegistrado') || 
                    sessionStorage.getItem('userData') ||
                    localStorage.getItem('user') || 
                    '{}'
                );
                token = userObj.token || userObj.jwt || '';
            } catch (e) {
                console.error('Error al leer token de usuario:', e);
            }
        }

        if (!token) {
            token = localStorage.getItem('token') || 
                    sessionStorage.getItem('token') || 
                    localStorage.getItem('jwt') || '';
        }

        return token;
    };

    let token = obtenerTokenSeguro();
    console.log('🔑 Token detectado para Socket:', token ? ' [TOKEN ENCONTRADO]' : '❌ [SIN TOKEN]');

    const serverUrl = window.location.origin;

    const socketOptions = {
        autoConnect: true,
        auth: { token: token },
        extraHeaders: { Authorization: `Bearer ${token}` },
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000
    };

    // 2. CONECTAR CON SOCKET.IO Y EXPONERLO GLOBALMENTE
    let socket = null;

    if (typeof io !== 'undefined') {
        socket = io(serverUrl, socketOptions);
    } else if (window.io) {
        socket = window.io(serverUrl, socketOptions);
    }

    window.socket = socket;

    // Elementos del DOM
    const btnCrearCodigo = document.getElementById('btn-crear-sala');
    const inputRoomCode = document.getElementById('room-code-display');
    const inputRoomName = document.getElementById('room-name-input');
    const formCrearSala = document.getElementById('form-crear-sala');
    const btnVolverProfesor = document.getElementById('btn-volver-rol-profesor');
    const btnReady = document.getElementById('btn-ready');
    const btnStartGame = document.getElementById('btn-start-game');

    const inputJoinCode = document.getElementById('input-join-code') || 
                          document.getElementById('room-code-input') || 
                          document.querySelector('.card input[type="text"]');

    const btnJoinRoom = document.getElementById('btn-join-room') || 
                        document.getElementById('btn-unirse-sala') || 
                        document.querySelector('.card .btn');

    if (inputJoinCode) {
        if (inputJoinCode.value.includes('http') || inputJoinCode.value.includes('localhost')) {
            inputJoinCode.value = '';
        }
        inputJoinCode.placeholder = 'Enter 6-digit room code';
        inputJoinCode.maxLength = 6;
    }

    window.addEventListener('unirseSalaSocket', (e) => {
        if (socket && socket.connected) {
            socket.emit('room:join', e.detail);
            socket.emit('unirse-sala', e.detail); 
        }
    });

    // 3. GENERAR CÓDIGO ALEATORIO (PROFESOR)
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
                console.warn('⚠️ Socket no conectado. Avanzando a la pantalla del Lobby...');
                cambiarALobby(roomName, roomCode);
            }
        });
    }

    // 4.B. UNIRSE A SALA (ESTUDIANTE)
    if (btnJoinRoom) {
        btnJoinRoom.addEventListener('click', (e) => {
            e.preventDefault();

            if (!inputJoinCode) {
                alert('Room code input field not found.');
                return;
            }

            const cleanCode = inputJoinCode.value.trim();

            const regex6Digits = /^\d{6}$/;
            if (!regex6Digits.test(cleanCode)) {
                alert('Please enter a valid 6-digit room code.');
                return;
            }

            let studentName = actualizarSaludoEstudiante();

            if (!studentName || studentName === 'Student' || studentName === 'Estudiante') {
                try {
                    const temp = JSON.parse(sessionStorage.getItem('tempUserData') || '{}');
                    const userReg = JSON.parse(localStorage.getItem('usuarioRegistrado') || '{}');
                    const userSess = JSON.parse(sessionStorage.getItem('userData') || '{}');
                    
                    studentName = temp.fullname || temp.username || 
                                 userReg.fullname || userReg.username || 
                                 userSess.fullname || userSess.username || 
                                 localStorage.getItem('username') || 
                                 sessionStorage.getItem('username') || '';
                } catch (err) {
                    console.error('Error al parsear datos de usuario:', err);
                }
            }

            const nombreFinalAsegurado = (studentName && studentName !== 'Student' && studentName !== 'Estudiante') 
                ? studentName 
                : 'Estudiante';

            const tokenFresca = obtenerTokenSeguro();

            if (socket) {
                socket.auth = { token: tokenFresca };
                if (socket.io && socket.io.opts) {
                    socket.io.opts.extraHeaders = { Authorization: `Bearer ${tokenFresca}` };
                }

                if (!socket.connected) {
                    console.log('🔄 Socket desconectado. Reconectando...');
                    socket.connect();
                }
            }

            const payload = {
                roomId: cleanCode,
                roomCode: cleanCode,
                username: nombreFinalAsegurado
            };

            localStorage.setItem('currentRoom', JSON.stringify({ 
                code: cleanCode,
                isHost: false 
            }));

            const ejecutarUnion = () => {
                console.log('🚀 Joining room con payload:', payload);
                socket.emit('room:join', payload);
                socket.emit('unirse-sala', payload);
            };

            if (socket && socket.connected) {
                ejecutarUnion();
            } else if (socket) {
                const onConnectOnce = () => {
                    console.log('🟢 Reconexión exitosa, emitiendo unirse a sala...');
                    ejecutarUnion();
                };

                socket.once('connect', onConnectOnce);

                setTimeout(() => {
                    if (!socket.connected) {
                        socket.off('connect', onConnectOnce);
                        alert('No connection to the server. Please check if the backend is running.');
                    }
                }, 3000);
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

        socket.on('disconnect', (reason) => {
            console.warn('⚠️ Se perdió la conexión con el servidor Socket.io. Razón:', reason);
            if (reason === 'io server disconnect') {
                socket.connect();
            }
        });

        socket.on('reconnect', (attemptNumber) => {
            console.log(`🟢 Reconectado con éxito tras ${attemptNumber} intento(s).`);
            
            const currentRoom = JSON.parse(localStorage.getItem('currentRoom') || '{}');
            if (currentRoom.code) {
                const studentName = actualizarSaludoEstudiante() || 'Estudiante';
                
                if (currentRoom.isHost) {
                    socket.emit('room:create', {
                        roomId: currentRoom.code,
                        roomName: currentRoom.name || 'Sala de Juego',
                        username: studentName
                    });
                } else {
                    const payload = {
                        roomId: currentRoom.code,
                        roomCode: currentRoom.code,
                        username: studentName
                    };
                    socket.emit('room:join', payload);
                    socket.emit('unirse-sala', payload);
                }
            }
        });

        socket.on('room:created', (data) => {
            console.log('✅ Sala creada exitosamente en servidor y MariaDB:', data);
            cambiarALobby(data.roomName, data.roomId);
        });

        const handleRoomJoined = (data) => {
            console.log('✅ Unido a la sala exitosamente:', data);
            cambiarALobby(data.roomName || 'Sala de Juego', data.roomId || data.roomCode);
        };

        socket.on('room:joined', handleRoomJoined);
        socket.on('sala-unida', handleRoomJoined);

        const handleRoomError = (data) => {
            const msg = data.message || data.error || 'The room does not exist or is full.';
            console.error('❌ Error recibido de la sala:', msg);
            alert(msg);
        };

        socket.on('room:error', handleRoomError);
        socket.on('error-sala', handleRoomError);

        socket.on('room:update', (roomData) => {
            if (!roomData) return;

            console.log('📡 Actualización de sala recibida:', roomData);

            // GARANTIZAR QUE LA PANTALLA SEA VISIBLE AL RECIBIR LA ACTUALIZACIÓN
            const pSalaEspera = document.getElementById('pantalla-sala-espera');
            if (pSalaEspera && pSalaEspera.classList.contains('oculto')) {
                cambiarALobby(roomData.name || 'Sala de Juego', roomData.roomId || roomData.code);
            }

            const headerTitle = document.getElementById('room-header-title') || document.querySelector('.pantalla-sala-espera h2');
            const roomCode = roomData.roomId || roomData.code || JSON.parse(localStorage.getItem('currentRoom') || '{}').code;
            if (headerTitle) {
                headerTitle.innerText = `${roomData.name || 'FOFI'} (Code: ${roomCode})`;
            }

            const players = roomData.players || [];
            const esProfesor = roomData.hostId === socket.id;

            for (let i = 1; i <= 4; i++) {
                const card = document.getElementById(`card-player${i}`);
                const playerLabel = document.getElementById(`label-player${i}-name`);
                const statusLabel = document.getElementById(`status-player${i}`);

                const player = players[i - 1];

                if (player) {
                    if (card) {
                        card.classList.remove('oculto');
                        card.style.display = 'flex';
                    }
                    if (playerLabel) {
                        playerLabel.innerText = player.name || player.username || 'Student';
                    }
                    if (statusLabel) {
                        statusLabel.classList.remove('oculto');
                        statusLabel.style.display = 'block';
                        statusLabel.innerText = player.isReady ? 'Ready' : 'Not Ready';
                        statusLabel.style.color = player.isReady ? '#2ed573' : '#ff4757';
                    }
                } else {
                    if (card) {
                        card.classList.add('oculto');
                        card.style.display = 'none';
                    }
                }
            }

            if (btnStartGame) {
                btnStartGame.style.display = esProfesor ? 'block' : 'none';
            }

            if (btnReady) {
                btnReady.style.display = esProfesor ? 'none' : 'block';
            }
        });

        socket.on('room:game_started', (data) => {
            console.log('🏁 ¡Iniciando el juego!', data);
            document.querySelectorAll('.pantalla, .pantalla-bienvenida').forEach(d => {
                d.classList.add('oculto');
                d.style.display = 'none';
            });

            const pSeleccion = document.getElementById('pantalla-seleccion-escena');
            if (pSeleccion) {
                pSeleccion.classList.remove('oculto');
                pSeleccion.style.display = 'flex';
            }

            if (typeof window.mostrarPantalla === 'function') {
                window.mostrarPantalla('pantalla-seleccion-escena');
            }
        });

        socket.on('connect_error', (err) => {
            console.warn('⚠️ Advertencia de conexión en Socket.io:', err.message);
            if (socket.io && socket.io.opts) {
                socket.io.opts.transports = ['polling', 'websocket'];
            }
        });
    }

    // FUNCIÓN DE TRANSICIÓN ULTRA GARANTIZADA AL LOBBY
    function cambiarALobby(nombreSala, codigoSala) {
        const headerTitle = document.getElementById('room-header-title');
        if (headerTitle) {
            headerTitle.innerText = `${nombreSala} (Code: ${codigoSala})`;
        }

        // 1. Ocultar todas las vistas activas
        document.querySelectorAll('.pantalla, .pantalla-bienvenida').forEach(d => {
            d.classList.add('oculto');
            d.style.display = 'none';
        });

        // 2. Forzar visibilidad directa en la sala de espera
        const salaEspera = document.getElementById('pantalla-sala-espera');
        if (salaEspera) {
            salaEspera.classList.remove('oculto');
            salaEspera.style.display = 'flex';
        }

        // 3. Ejecutar función auxiliar si existe
        if (typeof window.mostrarPantalla === 'function') {
            window.mostrarPantalla('pantalla-sala-espera');
        }
    }

    if (btnVolverProfesor) {
        btnVolverProfesor.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.pantalla, .pantalla-bienvenida').forEach(d => {
                d.classList.add('oculto');
                d.style.display = 'none';
            });

            const pProfesor = document.getElementById('pantalla-profesor');
            if (pProfesor) {
                pProfesor.classList.remove('oculto');
                pProfesor.style.display = 'flex';
            }

            if (typeof window.mostrarPantalla === 'function') {
                window.mostrarPantalla('pantalla-profesor');
            }
        });
    }
});