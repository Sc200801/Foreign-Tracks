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

    // 3. Respaldo directo desde Inputs del DOM
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

document.addEventListener('DOMContentLoaded', async () => {
    // 1. VERIFICACIÓN AUTOMÁTICA DE SESIÓN CON TOKEN EN BACKEND (checkAuth)
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (token) {
        console.log('🔍 Token detectado. Verificando vigencia con el backend...');
        
        const isValid = await window.apiService.verifyToken();

        if (isValid) {
            console.log('✅ Token válido. Omitiendo formularios...');
            const usuarioData = getStorageSeguro(localStorage, 'usuarioRegistrado') || 
                                getStorageSeguro(sessionStorage, 'userData') || {};

            if (usuarioData.role === 'teacher') {
                mostrarPantalla('pantalla-clave-docente');
            } else {
                mostrarPantalla('pantalla-alumno');
            }
        } else {
            console.warn('❌ Token expirado o inválido.');
            mostrarPantalla('pantalla-rol');
            
            const loginModal = document.getElementById('login-modal');
            if (loginModal) {
                loginModal.classList.remove('oculto', 'hidden');
            }
        }
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

            if (!username || !password) {
                alert('Por favor, completa todos los campos requeridos (usuario y contraseña).');
                return;
            }

            const tempUserData = {
                fullname: fullname || username,
                username: username,
                password: password
            };

            sessionStorage.setItem('tempUserData', JSON.stringify(tempUserData));

            console.log('📦 Datos del Paso 1 guardados temporalmente en sessionStorage:', tempUserData);
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
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const tempUserData = getStorageSeguro(sessionStorage, 'tempUserData');

            if (token) {
                console.log('🔍 Verificando sesión con el backend antes de ingresar...');
                const isTokenValid = await window.apiService.verifyToken();

                if (!isTokenValid) {
                    alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
                    mostrarPantalla('pantalla-rol');
                    const loginModal = document.getElementById('login-modal');
                    if (loginModal) {
                        loginModal.classList.remove('oculto', 'hidden');
                    }
                    return;
                }
            } 
            else if (tempUserData) {
                try {
                    console.log('🔄 Registrando nuevo alumno en MariaDB...');
                    const registerPayload = {
                        fullname: tempUserData.fullname,
                        username: tempUserData.username,
                        password: tempUserData.password,
                        role: 'player'
                    };

                    const response = await window.apiService.register(registerPayload);

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

                    sessionStorage.removeItem('tempUserData');

                    console.log('✅ Alumno registrado exitosamente:', userFinal);

                } catch (error) {
                    console.error('❌ Error al registrar alumno:', error);
                    alert(error.message || 'El nombre de usuario ya existe o hubo un error al registrarte.');
                    mostrarPantalla('pantalla-rol');
                    return;
                }
            } 
            else {
                alert('Debes iniciar sesión o registrarte primero para ingresar.');
                mostrarPantalla('pantalla-rol');
                const loginModal = document.getElementById('login-modal');
                if (loginModal) {
                    loginModal.classList.remove('oculto', 'hidden');
                }
                return;
            }

            mostrarPantalla('pantalla-alumno');
        });
    }

    if (btnProfesor) {
        btnProfesor.addEventListener('click', async () => {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');

            // 🔍 Verificación previa de token al presionar el botón Docente
            if (token) {
                console.log('🔍 Verificando sesión docente con el backend...');
                const isTokenValid = await window.apiService.verifyToken();

                if (!isTokenValid) {
                    alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
                    mostrarPantalla('pantalla-rol');
                    const loginModal = document.getElementById('login-modal');
                    if (loginModal) {
                        loginModal.classList.remove('oculto', 'hidden');
                    }
                    return; // ⛔ Detiene el avance a la pantalla de clave
                }
            }

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

            let token = localStorage.getItem('token') || sessionStorage.getItem('token');
            let nombreJugador = obtenerNombreUsuarioGarantizado();

            if (!token) {
                const tempUserData = getStorageSeguro(sessionStorage, 'tempUserData');
                
                if (!tempUserData) {
                    alert('No se detectó una sesión activa. Por favor regístrate o inicia sesión primero.');
                    mostrarPantalla('pantalla-rol');
                    const loginModal = document.getElementById('login-modal');
                    if (loginModal) {
                        loginModal.classList.remove('oculto', 'hidden');
                    }
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
                    
                    const rawUser = response.user || response.player || response.data || {};
                    const userFinal = {
                        fullname: rawUser.fullname || rawUser.name || tempUserData.fullname,
                        username: rawUser.username || tempUserData.username,
                        role: rawUser.role || 'player',
                        token: token
                    };

                    if (token) {
                        localStorage.setItem('token', token);
                        sessionStorage.setItem('token', token);
                    }
                    
                    localStorage.setItem('usuarioRegistrado', JSON.stringify(userFinal));
                    localStorage.setItem('username', userFinal.fullname || userFinal.username);
                    sessionStorage.setItem('userData', JSON.stringify(userFinal));

                    nombreJugador = userFinal.fullname || userFinal.username;
                    sessionStorage.removeItem('tempUserData');

                    console.log('✅ Alumno registrado en MariaDB:', userFinal);

                } catch (error) {
                    console.error('❌ Error al registrar alumno:', error);
                    alert(error.message || 'Error al intentar registrar la cuenta del alumno.');
                    mostrarPantalla('pantalla-rol');
                    return;
                }
            }

            if (!token) {
                alert('No se pudo verificar tu sesión. Por favor inicia sesión nuevamente.');
                mostrarPantalla('pantalla-rol');
                const loginModal = document.getElementById('login-modal');
                if (loginModal) {
                    loginModal.classList.remove('oculto', 'hidden');
                }
                return;
            }

            if (!nombreJugador || nombreJugador === 'Estudiante') {
                nombreJugador = obtenerNombreUsuarioGarantizado() || 'Estudiante';
            }

            localStorage.setItem('currentRoom', JSON.stringify({
                code: roomCode,
                isHost: false
            }));

            if (window.socket) {
                window.socket.auth = { token: token };
                if (!window.socket.connected) {
                    window.socket.connect();
                }
            }

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

                try {
                    data = await window.apiService.login({ username, password, role: 'player' });
                } catch (errPlayer) {
                    data = await window.apiService.login({ username, password, role: 'teacher' });
                    currentRole = 'teacher';
                }

                if (data.token) {
                    localStorage.setItem('token', data.token);
                    sessionStorage.setItem('token', data.token);
                }

                const userObj = data.user || { username, role: currentRole };
                localStorage.setItem('usuarioRegistrado', JSON.stringify(userObj));
                sessionStorage.setItem('userData', JSON.stringify(userObj));

                usernameInput.value = '';
                passwordInput.value = '';
                loginModal.classList.add('oculto');

                console.log('✅ Token JWT guardado exitosamente en localStorage:', data.token);

                if (currentRole === 'teacher' || userObj.role === 'teacher') {
                    if (typeof mostrarPantalla === 'function') mostrarPantalla('pantalla-profesor');
                } else {
                    if (typeof mostrarPantalla === 'function') mostrarPantalla('pantalla-alumno');
                }

            } catch (error) {
                console.error('❌ Error de autenticación:', error);
                alert('Usuario o contraseña incorrectos.');
                
                // 🔄 AJUSTE DE FLUJO: Enviar a selección de rol y mantener modal abierto al aceptar la alerta
                mostrarPantalla('pantalla-rol');
                if (loginModal) {
                    loginModal.classList.remove('oculto', 'hidden');
                }
            }
        });
    }
});