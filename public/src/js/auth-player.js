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

// ===================================================
// 🔍 FUNCIÓN AVANZADA PARA OBTENER LA IDENTIDAD REAL DEL USUARIO
// ===================================================
function obtenerNombreUsuarioGarantizado() {
    let nombre = '';

    // 1. Buscar objetos JSON en Storage
    const posiblesClaves = ['usuarioRegistrado', 'userData', 'user', 'usuario', 'profile'];
    for (const clave of posiblesClaves) {
        const obj = getStorageSeguro(localStorage, clave) || getStorageSeguro(sessionStorage, clave);
        if (obj) {
            // Revisa si viene anidado (ej. obj.data o obj.user) o directo
            const base = obj.user || obj.data || obj;
            nombre = base.fullname || base.username || base.name || base.nombre || '';
            if (nombre) break;
        }
    }

    // 2. Buscar strings simples directos en Storage
    if (!nombre) {
        nombre = localStorage.getItem('username') || 
                 localStorage.getItem('fullname') || 
                 sessionStorage.getItem('username') || '';
    }

    // 3. Respaldo directo desde Inputs del DOM (Útil en Chrome si no se ha sincronizado Storage)
    if (!nombre) {
        const inputNombre = document.getElementById('reg-fullname') || 
                            document.getElementById('reg-username') || 
                            document.getElementById('input-username');
        if (inputNombre && inputNombre.value.trim()) {
            nombre = inputNombre.value.trim();
        }
    }

    return nombre.trim();
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. VERIFICAR SESIÓN EN LOCALSTORAGE O SESSIONSTORAGE
    const usuarioExistente = getStorageSeguro(localStorage, 'usuarioRegistrado') || 
                             getStorageSeguro(sessionStorage, 'userData') ||
                             getStorageSeguro(localStorage, 'user');

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

            console.log('📦 Datos del Paso 1 guardados temporalmente en sessionStorage:', tempUserData);

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
        btnStudent.addEventListener('click', async () => {
            // Verificar si ya existe token o si vienen datos temporales del Paso 1
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const tempUserData = getStorageSeguro(sessionStorage, 'tempUserData');

            // Si no hay sesión iniciada y existen datos del registro temporal, guardar en MariaDB
            if (!token && tempUserData) {
                try {
                    console.log('🔄 Registrando alumno en la base de datos MariaDB...');
                    const registerPayload = {
                        fullname: tempUserData.fullname,
                        username: tempUserData.username,
                        password: tempUserData.password,
                        role: 'player'
                    };

                    const response = await window.apiService.register(registerPayload);

                    // Guardar JWT y usuario
                    if (response.token) {
                        localStorage.setItem('token', response.token);
                        sessionStorage.setItem('token', response.token);
                    }

                    const rawUser = response.user || response.player || response.data || {};
                    const userFinal = {
                        fullname: rawUser.fullname || tempUserData.fullname,
                        username: rawUser.username || tempUserData.username,
                        role: 'player'
                    };

                    localStorage.setItem('usuarioRegistrado', JSON.stringify(userFinal));
                    sessionStorage.setItem('userData', JSON.stringify(userFinal));

                    // 🔒 MEDIDA DE SEGURIDAD: Limpiar contraseña en texto plano de sessionStorage
                    sessionStorage.removeItem('tempUserData');

                    console.log('✅ Alumno registrado exitosamente en MariaDB:', userFinal);

                } catch (error) {
                    console.error('❌ Error al registrar alumno:', error);
                    alert(error.message || 'Ocurrió un error al registrar la cuenta de alumno.');
                    return; // No avanzar de pantalla si falla la base de datos
                }
            }

            // Cambiar a la pantalla de ingresar código de sala
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

            const codigoInput = document.getElementById('codigo-sala-input') || document.getElementById('input-join-code');
            const roomCode = codigoInput ? codigoInput.value.trim() : '';

            if (!roomCode) {
                alert('Por favor ingresa un código de sala válido.');
                return;
            }

            // 1. Verificar si hay token activo
            let token = localStorage.getItem('token') || sessionStorage.getItem('token');
            let nombreJugador = obtenerNombreUsuarioGarantizado();

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
                    
                    // Extraer objeto usuario retornado
                    const rawUser = response.user || response.player || response.data || {};
                    const userFinal = {
                        fullname: rawUser.fullname || rawUser.name || tempUserData.fullname,
                        username: rawUser.username || tempUserData.username,
                        role: rawUser.role || 'player',
                        token: token
                    };

                    // Guardamos la sesión con redundancia en storage
                    if (token) {
                        localStorage.setItem('token', token);
                        sessionStorage.setItem('token', token);
                    }
                    
                    localStorage.setItem('usuarioRegistrado', JSON.stringify(userFinal));
                    localStorage.setItem('username', userFinal.fullname || userFinal.username);
                    sessionStorage.setItem('userData', JSON.stringify(userFinal));

                    // Actualizar el nombre extraído
                    nombreJugador = userFinal.fullname || userFinal.username;

                    // Eliminar datos sensibles temporales
                    sessionStorage.removeItem('tempUserData');

                    console.log('✅ Alumno registrado en MariaDB:', userFinal);

                } catch (error) {
                    console.error('❌ Error al registrar alumno:', error);
                    alert(error.message || 'Error al intentar registrar la cuenta del alumno.');
                    return;
                }
            }

            // Si por alguna razón el nombre sigue sin existir, forzar re-evaluación
            if (!nombreJugador || nombreJugador === 'Estudiante') {
                nombreJugador = obtenerNombreUsuarioGarantizado() || 'Estudiante';
            }

            localStorage.setItem('currentRoom', JSON.stringify({
                code: roomCode,
                isHost: false
            }));

            // Re-autenticar el Socket si ya existe
            if (window.socket) {
                window.socket.auth = { token: token };
                if (!window.socket.connected) {
                    window.socket.connect();
                }
            }

            // Emitir evento con el nombre extraído
            console.log(`🚀 Uniendo a sala ${roomCode} como: "${nombreJugador}"`);
            
            const payload = {
                roomId: roomCode,
                roomCode: roomCode,
                username: nombreJugador
            };

            if (window.socket && window.socket.connected) {
                window.socket.emit('room:join', payload);
            } else {
                window.dispatchEvent(new CustomEvent('unirseSalaSocket', { detail: payload }));
            }
        });
    }

    // ===================================================
// CONTROL DEL MODAL DE INICIO DE SESIÓN (LOGIN)
// ===================================================
const loginModal = document.getElementById('login-modal');
const btnOpenLoginModal = document.getElementById('btn-open-login-modal');
const btnCloseLoginModal = document.getElementById('btn-close-login-modal');
const formLoginModal = document.getElementById('form-login-modal');

// 1. Abrir Modal
if (btnOpenLoginModal && loginModal) {
    btnOpenLoginModal.addEventListener('click', (e) => {
        e.preventDefault();
        loginModal.classList.remove('oculto', 'hidden');
    });
}

// 2. Cerrar con la (X)
if (btnCloseLoginModal && loginModal) {
    btnCloseLoginModal.addEventListener('click', () => {
        loginModal.classList.add('oculto');
    });
}

// 3. Cerrar al hacer clic fuera del modal
window.addEventListener('click', (e) => {
    if (e.target === loginModal) {
        loginModal.classList.add('oculto');
    }
});

// 4. Procesar el formulario enviando las credenciales al backend
if (formLoginModal) {
    formLoginModal.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');

        const username = usernameInput ? usernameInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';

        if (!username || !password) {
            alert('Por favor ingresa tu usuario y contraseña.');
            return;
        }

        try {
            let data;
            let currentRole = 'player';

            // Intentar autenticar como 'player'
            try {
                data = await window.apiService.login({ username, password, role: 'player' });
            } catch (errPlayer) {
                // Si falla, intentar autenticar como 'teacher'
                data = await window.apiService.login({ username, password, role: 'teacher' });
                currentRole = 'teacher';
            }

            // 🔑 GUARDAR TOKEN JWT EN LOCALSTORAGE (Requisito clave de la tarea)
            if (data.token) {
                localStorage.setItem('token', data.token);
                sessionStorage.setItem('token', data.token);
            }

            // Guardar objeto de usuario
            const userObj = data.user || { username, role: currentRole };
            localStorage.setItem('usuarioRegistrado', JSON.stringify(userObj));
            sessionStorage.setItem('userData', JSON.stringify(userObj));

            // Limpiar y cerrar modal
            usernameInput.value = '';
            passwordInput.value = '';
            loginModal.classList.add('oculto');

            console.log('✅ Token JWT guardado exitosamente en localStorage:', data.token);

            // Redirección según rol
            if (currentRole === 'teacher' || userObj.role === 'teacher') {
                if (typeof mostrarPantalla === 'function') mostrarPantalla('pantalla-profesor');
            } else {
                if (typeof mostrarPantalla === 'function') mostrarPantalla('pantalla-alumno');
            }

        } catch (error) {
            console.error('❌ Error de autenticación:', error);
            alert('Usuario o contraseña incorrectos.');
        }
    });
}
});