// ===================================================
// FUNCIÓN GLOBAL PARA MOSTRAR / OCULTAR CONTRASEÑA
// ===================================================
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input) {
        if (input.type === 'password') {
            input.type = 'text';
            btn.classList.add('active');
            btn.setAttribute('title', 'Ocultar contraseña');
        } else {
            input.type = 'password';
            btn.classList.remove('active');
            btn.setAttribute('title', 'Mostrar contraseña');
        }
    }
}

// ===================================================
// FUNCIÓN GLOBAL PARA MANEJAR EL CAMBIO DE VISTAS LIMPIAMENTE
// ===================================================
function mostrarPantalla(idPantallaDeseada) {
    const todasLasPantallas = document.querySelectorAll('.pantalla, .pantalla-bienvenida');
    
    todasLasPantallas.forEach(pantalla => {
        pantalla.classList.add('oculto');
    });

    const pantallaTarget = document.getElementById(idPantallaDeseada);
    if (pantallaTarget) {
        pantallaTarget.classList.remove('oculto');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = (window.CONFIG && window.CONFIG.API_URL) ? window.CONFIG.API_URL : 'http://localhost:3000';

    // 1. VERIFICAR SESIÓN EN LOCALSTORAGE
    const usuarioExistente = localStorage.getItem('usuarioRegistrado');

    if (usuarioExistente) {
        // Si ya está registrado -> va directo a CHOOSE YOUR ROL
        mostrarPantalla('pantalla-rol');
    } else {
        // Si no se ha registrado -> muestra la pantalla de portada anaranjada
        mostrarPantalla('pantalla-bienvenida-inicial');
    }

    // 2. BOTÓN "REGÍSTRATE AQUÍ" EN PORTADA
    const btnIrRegistro = document.getElementById('btn-ir-registro');
    if (btnIrRegistro) {
        btnIrRegistro.addEventListener('click', () => {
            mostrarPantalla('pantalla-registro-inicial');
        });
    }

    // 3. REGISTRO DE CUENTA DE USUARIO (CONEXIÓN CON API / AUTHCONTROLLER)
    const formRegistro = document.getElementById('form-registro-inicial');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullnameInput = document.getElementById('reg-fullname');
            const usernameInput = document.getElementById('reg-username');
            const passwordInput = document.getElementById('reg-password');

            const fullname = fullnameInput ? fullnameInput.value.trim() : '';
            const username = usernameInput ? usernameInput.value.trim() : '';
            const password = (passwordInput && passwordInput.value.trim()) ? passwordInput.value.trim() : '123456';

            if (!username) {
                alert('Por favor escribe un nombre de usuario.');
                return;
            }

            try {
                // Enviar la petición de registro a tu controlador Node.js
                const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password,
                        role: 'player', // Rol de estudiante / jugador
                        nombre: fullname || username
                    })
                });

                const data = await response.json();

                if (response.ok && data.token) {
                    // 💾 Guardar Token JWT real devuelto por la API
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('usuarioRegistrado', JSON.stringify(data.user));

                    console.log('✅ Registro exitoso. Token asignado:', data.token);

                    // Re-conectar Socket.io con el nuevo token si no estaba autenticado
                    if (window.io) {
                        window.socket = window.io(API_BASE_URL, {
                            auth: { 
                                token: data.token,
                                headers: { Authorization: `Bearer ${data.token}` }
                            },
                            transports: ['websocket', 'polling']
                        });
                    }

                    mostrarPantalla('pantalla-rol');
                } else {
                    // 💡 Si el backend envió una razón específica, la mostramos
                    const mensajeError = data.error || data.message || 'Error al registrar el usuario.';
                    alert(mensajeError);
                }
            } catch (error) {
                console.error('❌ Error de red al registrar usuario:', error);
                alert('No se pudo conectar con el servidor. Verifica que el backend esté encendido.');
            }
        });
    }

    // 4. SELECCIÓN DE ROL Y NAVEGACIÓN
    const btnStudent = document.getElementById('btn-rol-student');
    const btnProfesor = document.getElementById('btn-rol-profesor');
    const btnVolverRol = document.getElementById('btn-volver-rol');
    const btnVolverRolProfesor = document.getElementById('btn-volver-rol-profesor');
    const btnVolverRolAlumno = document.getElementById('btn-volver-rol-alumno');

    if (btnStudent) {
        btnStudent.addEventListener('click', () => {
            mostrarPantalla('pantalla-alumno');
        });
    }

    if (btnProfesor) {
        btnProfesor.addEventListener('click', () => {
            mostrarPantalla('pantalla-clave-docente');
        });
    }

    if (btnVolverRol) {
        btnVolverRol.addEventListener('click', () => {
            mostrarPantalla('pantalla-rol');
        });
    }

    if (btnVolverRolProfesor) {
        btnVolverRolProfesor.addEventListener('click', () => {
            mostrarPantalla('pantalla-rol');
        });
    }

    if (btnVolverRolAlumno) {
        btnVolverRolAlumno.addEventListener('click', () => {
            mostrarPantalla('pantalla-rol');
        });
    }

    // 5. CERRAR SESIÓN (LOGOUT)
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (window.socket && window.socket.connected) {
                window.socket.disconnect();
            }

            // Limpia por completo la sesión guardada
            localStorage.clear();

            // Regresa a la portada anaranjada de bienvenida
            mostrarPantalla('pantalla-bienvenida-inicial');
        });
    }

    // 6. UNIRSE A SALA (INTEGRACIÓN CON SOCKET)
    const formUnirseSala = document.getElementById('form-unirse-sala');
    if (formUnirseSala) {
        formUnirseSala.addEventListener('submit', (e) => {
            e.preventDefault();

            const codigoInput = document.getElementById('codigo-sala-input');
            const roomCode = codigoInput ? codigoInput.value.trim() : '';

            if (!roomCode) {
                alert('Por favor ingresa un código de sala válido.');
                return;
            }

            const tokenActual = localStorage.getItem('token');
            if (!tokenActual) {
                alert('No se detectó una sesión activa. Por favor regístrate o inicia sesión primero.');
                mostrarPantalla('pantalla-bienvenida-inicial');
                return;
            }

            const user = JSON.parse(localStorage.getItem('usuarioRegistrado') || '{}');
            const nombreJugador = user.fullname || user.username || 'Estudiante';

            // Guardar contexto local de la sala para el alumno
            localStorage.setItem('currentRoom', JSON.stringify({
                code: roomCode,
                isHost: false
            }));

            // Si el socket está conectado, emitir directamente
            if (window.socket && window.socket.connected) {
                console.log('🚀 Emitiendo "room:join" desde auth-player.js...');
                window.socket.emit('room:join', {
                    roomId: roomCode,
                    username: nombreJugador
                });
            } else {
                // Notificar evento global para que lo capture room.js
                window.dispatchEvent(new CustomEvent('unirseSalaSocket', { 
                    detail: { roomId: roomCode, username: nombreJugador } 
                }));
            }
        });
    }
});