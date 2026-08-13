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

// ===================================================
// 🔒 MEDIDA DE SEGURIDAD: LECTURA SEGURA DE SESSIONSTORAGE / LOCALSTORAGE
// ===================================================
function getStorageSeguro(storageType, key) {
    try {
        const item = storageType.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error(`🔒 Error de lectura/parseo seguro en ${key}:`, error);
        storageType.removeItem(key); // Previene errores por datos manipulados o corruptos
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. VERIFICAR SESIÓN EN LOCALSTORAGE O SESSIONSTORAGE
    const usuarioExistente = getStorageSeguro(localStorage, 'usuarioRegistrado') || getStorageSeguro(sessionStorage, 'userData');

    if (usuarioExistente) {
        mostrarPantalla('pantalla-rol');
    } else {
        mostrarPantalla('pantalla-bienvenida-inicial');
    }

    // 2. BOTÓN "REGÍSTRATE AQUÍ" EN PORTADA
    const btnIrRegistro = document.getElementById('btn-ir-registro');
    if (btnIrRegistro) {
        btnIrRegistro.addEventListener('click', () => {
            mostrarPantalla('pantalla-registro-inicial');
        });
    }

    // ===================================================
    // 3. REGISTRO PASO 1: VALIDACIÓN PRELIMINAR Y SESSIONSTORAGE
    // ===================================================
    const formRegistro = document.getElementById('form-registro-inicial') || document.getElementById('register-step1-form');
    if (formRegistro) {
        formRegistro.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const fullnameInput = document.getElementById('reg-fullname') || document.getElementById('input-username');
            const usernameInput = document.getElementById('reg-username') || document.getElementById('input-email');
            const passwordInput = document.getElementById('reg-password') || document.getElementById('input-password');

            const fullname = fullnameInput ? fullnameInput.value.trim() : '';
            const username = usernameInput ? usernameInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            // Validación cliente: Campos requeridos
            if (!username || !password) {
                alert('Por favor, completa todos los campos requeridos (usuario y contraseña).');
                return;
            }

            // Guardado temporal en sessionStorage para el paso 2
            const tempUserData = {
                fullname: fullname || username,
                username: username,
                password: password
            };

            sessionStorage.setItem('tempUserData', JSON.stringify(tempUserData));

            console.log('📦 Datos del Paso 1 guardados temporalmente en sessionStorage');

            // Redirección a la pantalla de Selección de Rol (Pantalla 2)
            mostrarPantalla('pantalla-rol');
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

            // 🔒 MEDIDA DE SEGURIDAD: Limpieza absoluta de variables y sesiones almacenadas
            localStorage.clear();
            sessionStorage.clear();

            mostrarPantalla('pantalla-bienvenida-inicial');
        });
    }

    // ===================================================
    // 6. UNIRSE A SALA: REGISTRO REAL EN BACKEND Y CONEXIÓN
    // ===================================================
    const formUnirseSala = document.getElementById('form-unirse-sala');
    if (formUnirseSala) {
        formUnirseSala.addEventListener('submit', async (e) => {
            e.preventDefault();

            const codigoInput = document.getElementById('codigo-sala-input');
            const roomCode = codigoInput ? codigoInput.value.trim() : '';

            if (!roomCode) {
                alert('Por favor ingresa un código de sala válido.');
                return;
            }

            // 1. Verificar si hay token activo o datos de usuario usando la función segura
            let token = localStorage.getItem('token') || sessionStorage.getItem('token');
            let user = getStorageSeguro(localStorage, 'usuarioRegistrado') || getStorageSeguro(sessionStorage, 'userData') || {};

            // 2. Si no hay token, registramos al alumno en MariaDB
            if (!token) {
                const tempUserData = getStorageSeguro(sessionStorage, 'tempUserData');
                
                if (!tempUserData) {
                    alert('No se detectó una sesión activa. Por favor regístrate o inicia sesión primero.');
                    mostrarPantalla('pantalla-bienvenida-inicial');
                    return;
                }

                try {
                    console.log('🔄 Registrando alumno en la base de datos MariaDB...');
                    const registerPayload = {
                        fullname: tempUserData.fullname,
                        username: tempUserData.username,
                        password: tempUserData.password,
                        role: 'player'
                    };

                    const response = await window.apiService.register(registerPayload);

                    token = response.token;
                    user = response.user || response.player || { fullname: tempUserData.fullname, username: tempUserData.username };

                    // Guardamos la sesión persistente
                    if (token) {
                        localStorage.setItem('token', token);
                        sessionStorage.setItem('token', token);
                    }
                    localStorage.setItem('usuarioRegistrado', JSON.stringify(user));
                    sessionStorage.setItem('userData', JSON.stringify(user));

                    // 🔒 MEDIDA DE SEGURIDAD: Eliminar datos sensibles de la memoria temporal inmediatamente después del registro
                    sessionStorage.removeItem('tempUserData');

                    console.log('✅ Alumno registrado en MariaDB y datos temporales eliminados por seguridad');

                } catch (error) {
                    console.error('❌ Error al registrar alumno:', error);
                    alert(error.message || 'Error al intentar registrar la cuenta del alumno.');
                    return;
                }
            }

            // 3. Con la sesión confirmada, unirse a la sala
            const nombreJugador = user.fullname || user.username || 'Estudiante';

            localStorage.setItem('currentRoom', JSON.stringify({
                code: roomCode,
                isHost: false
            }));

            // Emitir evento por Socket o Evento Personalizado
            if (window.socket && window.socket.connected) {
                console.log('🚀 Emitiendo "room:join" desde auth-player.js...');
                window.socket.emit('room:join', {
                    roomId: roomCode,
                    username: nombreJugador
                });
            } else {
                window.dispatchEvent(new CustomEvent('unirseSalaSocket', { 
                    detail: { roomId: roomCode, username: nombreJugador } 
                }));
            }
        });
    }
});