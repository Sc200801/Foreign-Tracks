// js/auth-teacher.js

// ===================================================
// 📢 FUNCIÓN AUXILIAR DE ALERTAS VISUALES
// ===================================================
window.mostrarAlerta = window.mostrarAlerta || function(elementId, mensaje, esError = true) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = mensaje;
        el.style.color = esError ? '#ff4d4d' : '#2ecc71';
        el.classList.remove('oculto', 'hidden');
    } else {
        alert(mensaje);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const formClaveDocente = document.getElementById('form-clave-docente');

    if (formClaveDocente) {
        formClaveDocente.addEventListener('submit', async (e) => {
            // DETENER RECARGA Y PROPAGACIÓN
            e.preventDefault();
            e.stopPropagation();

            const inputClave = document.getElementById('clave-maestra-input');
            const claveIngresada = inputClave ? inputClave.value.trim() : '';

            if (!claveIngresada) {
                window.mostrarAlerta('teacher-key-alert-msg', 'Por favor ingresa la clave institucional.');
                return;
            }

            // 1. REVISAR SI YA EXISTE UNA SESIÓN ACTIVA (localStorage) O UN REGISTRO EN PROCESO (sessionStorage)
            let usuarioExistente = null;
            try {
                const userObjRaw = localStorage.getItem('usuarioRegistrado') || localStorage.getItem('usuario');
                if (userObjRaw) {
                    usuarioExistente = JSON.parse(userObjRaw);
                }
            } catch (err) {
                console.error('🔒 Error al leer usuarioRegistrado de localStorage:', err);
                localStorage.removeItem('usuarioRegistrado');
            }

            // 🔒 LECTURA SEGURA DE SESSIONSTORAGE
            let tempUserDataRaw = null;
            try {
                tempUserDataRaw = sessionStorage.getItem('tempUserData');
            } catch (err) {
                console.error('🔒 Error al acceder a sessionStorage:', err);
                sessionStorage.removeItem('tempUserData');
            }

            // Si NO hay sesión iniciada NI tampoco datos temporales de un registro nuevo, pedimos autenticarse
            if (!usuarioExistente && !tempUserDataRaw) {
                window.mostrarAlerta('teacher-key-alert-msg', 'No se encontraron los datos de la sesión ni del registro previo. Por favor inicia sesión o regístrate.');
                
                if (typeof window.mostrarPantalla === 'function') {
                    window.mostrarPantalla('pantalla-rol');
                } else {
                    document.querySelectorAll('.pantalla, .pantalla-bienvenida').forEach(d => d.classList.add('oculto'));
                    document.getElementById('pantalla-rol')?.classList.remove('oculto');
                }

                const loginModal = document.getElementById('login-modal');
                if (loginModal) {
                    loginModal.classList.remove('oculto', 'hidden');
                }
                return;
            }

            try {
                if (!window.apiService) {
                    throw new Error('El servicio apiService no está cargado correctamente en el navegador.');
                }

                let data = {};

                // 2. CASO A: EL USUARIO YA TIENE SESIÓN INICIADA (Confirmando clave docente contra el backend)
                if (usuarioExistente) {
                    console.log('🔄 Usuario ya registrado detectado. Confirmando clave docente...');
                    
                    if (typeof window.apiService.verifyTeacherKey === 'function') {
                        data = await window.apiService.verifyTeacherKey({ teacherKey: claveIngresada, userId: usuarioExistente.id });
                    } else {
                        throw new Error('No se encuentra la función verifyTeacherKey en apiService.');
                    }
                } 
                // 3. CASO B: REGISTRO NUEVO DESDE EL PASO 1 (Verificar la clave PRIMERO y luego mandar datos a MariaDB)
                else if (tempUserDataRaw) {
                    console.log('🆕 Verificando clave e iniciando registro de nuevo docente...');
                    let tempUserData = {};
                    
                    try {
                        tempUserData = JSON.parse(tempUserDataRaw);
                    } catch (parseErr) {
                        sessionStorage.removeItem('tempUserData');
                        throw new Error('Los datos temporales de registro están corruptos. Por favor intenta registrarte de nuevo.');
                    }

                    // 🛠️ FIX CRÍTICO: Validar la clave ANTES de completar el registro
                    if (typeof window.apiService.verifyTeacherKey === 'function') {
                        const checkKey = await window.apiService.verifyTeacherKey({ teacherKey: claveIngresada });
                        if (checkKey && checkKey.success === false) {
                            throw new Error(checkKey.message || 'La clave institucional ingresada es incorrecta.');
                        }
                    }

                    const fullUserData = {
                        username: tempUserData.username,
                        fullname: tempUserData.fullname || tempUserData.username,
                        email: tempUserData.email || `${tempUserData.username}@instituto.edu`,
                        password: tempUserData.password,
                        role: 'teacher',
                        teacherKey: claveIngresada
                    };

                    data = await window.apiService.register(fullUserData);

                    // 🔒 MEDIDA DE SEGURIDAD: Limpiar el registro temporal tras guardar en MariaDB
                    sessionStorage.removeItem('tempUserData');
                }

                if (inputClave) inputClave.value = '';

                // 💾 Guardar o actualizar sesión local y Token JWT
                if (data && data.token) {
                    localStorage.setItem('token', data.token);
                    sessionStorage.setItem('token', data.token);
                    localStorage.setItem('jwt', data.token);
                }
                if (data && data.user) {
                    data.user.role = 'teacher';
                    localStorage.setItem('usuarioRegistrado', JSON.stringify(data.user));
                    sessionStorage.setItem('userData', JSON.stringify(data.user));
                } else if (usuarioExistente) {
                    usuarioExistente.role = 'teacher';
                    localStorage.setItem('usuarioRegistrado', JSON.stringify(usuarioExistente));
                    sessionStorage.setItem('userData', JSON.stringify(usuarioExistente));
                }

                console.log('✅ Acceso como Profesor concedido exitosamente.');

                // Alerta de éxito en verde antes de redirigir a la pantalla del profesor
                window.mostrarAlerta('teacher-key-alert-msg', '¡Clave validada correctamente!', false);

                // Actualizar saludo en el dashboard/pantalla del docente
                const bienvenida = document.getElementById('bienvenida-docente');
                if (bienvenida) {
                    const user = (data && data.user) || usuarioExistente;
                    bienvenida.innerText = `Profesor(a): ${user.fullname || user.username || 'Docente'}`;
                }

                // 🔄 RECONECTAR / ACTUALIZAR SOCKET USANDO LA CONFIGURACIÓN GLOBAL DE CONFIG.JS
                const nuevoToken = (data && data.token) || localStorage.getItem('token');
                
                // Lee el dominio del socket definido centralmente en config.js
                const socketTargetUrl = window.CONFIG?.SOCKET_URL || window.API_BASE_URL || window.location.origin;

                if (window.socket && nuevoToken) {
                    window.socket.auth = { token: nuevoToken };
                    if (window.socket.connected) {
                        window.socket.disconnect();
                    }
                    window.socket.connect();
                } else if (window.io && nuevoToken) {
                    window.socket = window.io(socketTargetUrl, {
                        auth: { token: nuevoToken },
                        extraHeaders: { Authorization: `Bearer ${nuevoToken}` },
                        transports: ['websocket', 'polling']
                    });
                }

                // 4. MOSTRAR PANTALLA PROFESOR CON RETARDILLO DE 1 SEGUNDO
                setTimeout(() => {
                    if (typeof window.mostrarPantalla === 'function') {
                        window.mostrarPantalla('pantalla-profesor');
                    } else {
                        document.querySelectorAll('.pantalla, .pantalla-bienvenida').forEach(d => d.classList.add('oculto'));
                        document.getElementById('pantalla-profesor')?.classList.remove('oculto');
                    }
                }, 1000);

            } catch (error) {
                console.error('❌ Error al procesar acceso docente:', error);
                
                // Muestra el mensaje de error directamente en el párrafo de alerta
                window.mostrarAlerta('teacher-key-alert-msg', error.message || 'La clave institucional es incorrecta. Por favor, verifica e intenta de nuevo.');

                // Limpia el campo e instala el foco para que vuelva a intentar de inmediato
                if (inputClave) {
                    inputClave.value = '';
                    inputClave.focus();
                }
            }
        });
    }
});

// ===================================================
// 🔑 VERIFICACIÓN AUTOMÁTICA DE SESIÓN DOCENTE CON EL BACKEND (checkAuth)
// ===================================================
async function checkTeacherSession() {
    const token = localStorage.getItem('token') || localStorage.getItem('jwt');
    const userRaw = localStorage.getItem('usuarioRegistrado');
    let userData = {};

    try {
        userData = userRaw ? JSON.parse(userRaw) : {};
    } catch (e) {
        console.error('Error al parsear usuarioRegistrado:', e);
    }

    if (token && userData.role === 'teacher') {
        console.log('🔍 Evaluando token de docente en el backend...');

        const isTokenValid = await window.apiService.verifyToken();

        if (isTokenValid) {
            console.log('✅ Token de docente activo y válido.');
            const bienvenida = document.getElementById('bienvenida-docente');
            if (bienvenida) {
                bienvenida.innerText = `Profesor(a): ${userData.fullname || userData.username || 'Docente'}`;
            }
            return { token, user: userData };
        } else {
            console.warn('⚠️ El token del docente ha expirado o no es válido.');

            if (typeof window.mostrarPantalla === 'function') {
                window.mostrarPantalla('pantalla-rol');
            } else {
                document.querySelectorAll('.pantalla, .pantalla-bienvenida').forEach(d => d.classList.add('oculto'));
                document.getElementById('pantalla-rol')?.classList.remove('oculto');
            }

            const loginModal = document.getElementById('login-modal');
            if (loginModal) {
                loginModal.classList.remove('oculto', 'hidden');
            }

            return null;
        }
    }
    return null;
}

document.addEventListener('DOMContentLoaded', async () => {
    await checkTeacherSession();
});